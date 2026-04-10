from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Project, Deployment, InfraResource
from app.schemas.schemas import PlanRequest, PlanResponse, ApplyRequest, InfraResourceOut
from app.services.terraform.runner import run_plan
from app.core.config import settings
from datetime import datetime
import uuid, structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/infra", tags=["infra"])


async def _start_temporal_workflow(deployment_id, project_id, user_id, project_name, terraform_code, plan_id, auto_approve=False):
    try:
        from temporalio.client import Client
        from app.workers.deploy_workflow import DeploymentWorkflow
        client = await Client.connect(settings.TEMPORAL_HOST)
        await client.start_workflow(
            DeploymentWorkflow.run,
            args=[deployment_id, project_id, user_id, project_name, terraform_code, {}, auto_approve],
            id=f"deploy-{deployment_id}",
            task_queue=settings.TEMPORAL_TASK_QUEUE,
        )
    except Exception as e:
        logger.warning("Temporal unavailable, running directly", error=str(e))
        from app.services.terraform.runner import run_apply
        from app.core.database import AsyncSessionLocal
        from app.models.user import Deployment as D
        async with AsyncSessionLocal() as db:
            r = await db.execute(select(D).where(D.id == deployment_id))
            dep = r.scalar_one_or_none()
            if dep:
                result = await run_apply(plan_id)
                dep.status = "success" if result.get("success") else "failed"
                dep.completed_at = datetime.utcnow()
                await db.commit()


@router.post("/{project_id}/plan", response_model=PlanResponse)
async def plan_infrastructure(
    project_id: str,
    payload: PlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    plan_result = await run_plan(payload.terraform, cloud_credentials={})
    if "error" in plan_result:
        raise HTTPException(status_code=400, detail=plan_result["error"])
    return PlanResponse(
        plan_id=plan_result["plan_id"],
        plan_output=plan_result.get("plan_output", ""),
        resources_to_add=plan_result.get("resources_to_add", 0),
        resources_to_change=plan_result.get("resources_to_change", 0),
        resources_to_destroy=plan_result.get("resources_to_destroy", 0),
        estimated_cost=plan_result.get("estimated_cost", 0.0),
    )


@router.post("/{project_id}/apply")
async def apply_infrastructure(
    project_id: str,
    payload: ApplyRequest,
    background_tasks: BackgroundTasks,
    auto_approve: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    deployment = Deployment(
        id=str(uuid.uuid4()),
        project_id=project_id,
        user_id=current_user.id,
        version=f"v{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        environment=project.environment,
        status="queued",
        triggered_by="user",
    )
    db.add(deployment)
    project.status = "queued"
    await db.commit()
    background_tasks.add_task(_start_temporal_workflow, deployment.id, project_id, current_user.id, project.name, "", payload.plan_id, auto_approve)
    return {"deployment_id": deployment.id, "status": "queued", "workflow_id": f"deploy-{deployment.id}", "message": "Deployment queued"}


@router.post("/{project_id}/approve/{deployment_id}")
async def approve_deployment(
    project_id: str, deployment_id: str,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deployment).where(Deployment.id == deployment_id, Deployment.user_id == current_user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Deployment not found")
    try:
        from temporalio.client import Client
        from app.workers.deploy_workflow import DeploymentWorkflow
        client = await Client.connect(settings.TEMPORAL_HOST)
        handle = client.get_workflow_handle(f"deploy-{deployment_id}")
        await handle.signal(DeploymentWorkflow.approve_deployment)
        return {"message": "Deployment approved — applying now"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/reject/{deployment_id}")
async def reject_deployment(
    project_id: str, deployment_id: str,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Deployment).where(Deployment.id == deployment_id, Deployment.user_id == current_user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Deployment not found")
    try:
        from temporalio.client import Client
        from app.workers.deploy_workflow import DeploymentWorkflow
        client = await Client.connect(settings.TEMPORAL_HOST)
        handle = client.get_workflow_handle(f"deploy-{deployment_id}")
        await handle.signal(DeploymentWorkflow.reject_deployment)
        return {"message": "Deployment rejected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/destroy")
async def destroy_infrastructure(
    project_id: str,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == current_user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "queued"
    await db.commit()
    return {"message": "Destroy initiated", "project_id": project_id}


@router.get("/{project_id}/resources", response_model=list[InfraResourceOut])
async def get_resources(
    project_id: str,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InfraResource).where(InfraResource.project_id == project_id, InfraResource.user_id == current_user.id))
    return result.scalars().all()
