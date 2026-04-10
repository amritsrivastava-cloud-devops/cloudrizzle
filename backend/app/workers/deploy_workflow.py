"""
Temporal Workflows for CloudRizzle
Durable deployment pipeline: init -> plan -> approve -> apply -> sync
"""
from datetime import timedelta
from temporalio import workflow, activity
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError
import structlog

logger = structlog.get_logger()


@activity.defn
async def run_terraform_init(workspace_id: str, terraform_code: str) -> dict:
    from app.services.terraform.runner import TerraformRunner
    runner = TerraformRunner(workspace_id)
    runner.setup_workspace(terraform_code)
    ok, output = await runner.init()
    if not ok:
        raise ApplicationError(f"Terraform init failed: {output[:500]}")
    return {"success": True, "output": output}


@activity.defn
async def run_terraform_plan(workspace_id: str) -> dict:
    from app.services.terraform.runner import TerraformRunner
    runner = TerraformRunner(workspace_id)
    ok, output, summary = await runner.plan()
    if not ok:
        raise ApplicationError(f"Terraform plan failed: {output[:500]}")
    return {"success": True, "output": output,
            "resources_to_add": summary["add"],
            "resources_to_change": summary["change"],
            "resources_to_destroy": summary["destroy"]}


@activity.defn
async def run_terraform_apply(workspace_id: str) -> dict:
    from app.services.terraform.runner import TerraformRunner
    runner = TerraformRunner(workspace_id)
    ok, output = await runner.apply()
    if not ok:
        raise ApplicationError(f"Terraform apply failed: {output[:1000]}")
    state = await runner.show_state()
    return {"success": True, "output": output, "state": state}


@activity.defn
async def update_deployment_status(deployment_id: str, status: str,
                                    error_message: str = None, logs: list = None) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.user import Deployment
    from sqlalchemy import select
    from datetime import datetime
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        d = result.scalar_one_or_none()
        if d:
            d.status = status
            if error_message:
                d.error_message = error_message
            if logs:
                d.logs = logs
            if status in ("success", "failed"):
                d.completed_at = datetime.utcnow()
                if d.started_at:
                    d.duration_seconds = int((d.completed_at - d.started_at).total_seconds())
            await db.commit()


@activity.defn
async def update_project_status(project_id: str, status: str) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.user import Project
    from sqlalchemy import select
    from datetime import datetime
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        p = result.scalar_one_or_none()
        if p:
            p.status = status
            if status == "active":
                p.last_deployed_at = datetime.utcnow()
            await db.commit()


@activity.defn
async def sync_cloud_resources(project_id: str, terraform_state: dict) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.user import InfraResource, Project
    from sqlalchemy import select, delete
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if not project:
            return
        await db.execute(delete(InfraResource).where(InfraResource.project_id == project_id))
        resources_data = terraform_state.get("values", {}).get("root_module", {}).get("resources", [])
        count = 0
        for r in resources_data:
            resource = InfraResource(
                project_id=project_id, user_id=project.user_id,
                resource_id=r.get("values", {}).get("id", r.get("name", "")),
                type=r.get("type", "unknown"), name=r.get("name", "unnamed"),
                cloud=project.cloud, region=project.cloud,
                status="active", monthly_cost=0.0, resource_metadata=r.get("values", {}))
            db.add(resource)
            count += 1
        project.resource_count = count
        await db.commit()
        logger.info("Resources synced", project_id=project_id, count=count)


@workflow.defn
class DeployInfraWorkflow:
    """Full durable deployment workflow with human approval step."""

    def __init__(self):
        self._approved = False
        self._rejected = False

    @workflow.signal
    def approve(self):
        self._approved = True

    @workflow.signal
    def reject(self):
        self._rejected = True

    @workflow.run
    async def run(self, params: dict) -> dict:
        deployment_id = params["deployment_id"]
        project_id = params["project_id"]
        terraform_code = params["terraform_code"]
        workspace_id = params.get("workspace_id", deployment_id)

        retry = RetryPolicy(maximum_attempts=3, initial_interval=timedelta(seconds=5), backoff_coefficient=2.0)

        await workflow.execute_activity(update_deployment_status, args=[deployment_id, "running"],
                                         start_to_close_timeout=timedelta(seconds=30))
        try:
            await workflow.execute_activity(run_terraform_init, args=[workspace_id, terraform_code],
                                             start_to_close_timeout=timedelta(minutes=5), retry_policy=retry)

            plan_result = await workflow.execute_activity(run_terraform_plan, args=[workspace_id],
                                                           start_to_close_timeout=timedelta(minutes=10), retry_policy=retry)

            # Wait for human approval up to 24h
            await workflow.wait_condition(lambda: self._approved or self._rejected,
                                           timeout=timedelta(hours=24))

            if self._rejected:
                await workflow.execute_activity(update_deployment_status,
                    args=[deployment_id, "failed", "Rejected by user"],
                    start_to_close_timeout=timedelta(seconds=30))
                return {"status": "rejected"}

            apply_result = await workflow.execute_activity(run_terraform_apply, args=[workspace_id],
                start_to_close_timeout=timedelta(minutes=30),
                retry_policy=RetryPolicy(maximum_attempts=2))

            if apply_result.get("state"):
                await workflow.execute_activity(sync_cloud_resources,
                    args=[project_id, apply_result["state"]],
                    start_to_close_timeout=timedelta(seconds=60))

            await workflow.execute_activity(update_deployment_status,
                args=[deployment_id, "success", None, [apply_result.get("output", "")]],
                start_to_close_timeout=timedelta(seconds=30))
            await workflow.execute_activity(update_project_status,
                args=[project_id, "active"], start_to_close_timeout=timedelta(seconds=30))

            return {"status": "success", "plan": plan_result}

        except Exception as e:
            error_msg = str(e)
            await workflow.execute_activity(update_deployment_status,
                args=[deployment_id, "failed", error_msg],
                start_to_close_timeout=timedelta(seconds=30))
            await workflow.execute_activity(update_project_status,
                args=[project_id, "error"], start_to_close_timeout=timedelta(seconds=30))
            raise


async def start_worker():
    from temporalio.client import Client
    from temporalio.worker import Worker
    from app.core.config import settings
    client = await Client.connect(settings.TEMPORAL_HOST)
    worker = Worker(client, task_queue=settings.TEMPORAL_TASK_QUEUE,
                    workflows=[DeployInfraWorkflow],
                    activities=[run_terraform_init, run_terraform_plan, run_terraform_apply,
                                 update_deployment_status, update_project_status, sync_cloud_resources])
    logger.info("Temporal worker started", task_queue=settings.TEMPORAL_TASK_QUEUE)
    await worker.run()


if __name__ == "__main__":
    import asyncio
    asyncio.run(start_worker())
