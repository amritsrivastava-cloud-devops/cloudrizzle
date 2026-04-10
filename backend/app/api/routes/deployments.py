from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, Deployment, Project
from app.schemas.schemas import DeploymentCreate, DeploymentOut, DeploymentWithLogs
from app.services.terraform.runner import run_plan, run_apply
import structlog
import uuid

logger = structlog.get_logger()
router = APIRouter(prefix="/deployments", tags=["deployments"])


@router.get("", response_model=list[DeploymentOut])
async def list_deployments(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Deployment).where(Deployment.user_id == current_user.id)
    if project_id:
        query = query.where(Deployment.project_id == project_id)
    if status:
        query = query.where(Deployment.status == status)
    query = query.order_by(Deployment.created_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{deployment_id}", response_model=DeploymentWithLogs)
async def get_deployment(
    deployment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deployment).where(
            Deployment.id == deployment_id,
            Deployment.user_id == current_user.id,
        )
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment


@router.get("/{deployment_id}/logs")
async def get_deployment_logs(
    deployment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deployment).where(
            Deployment.id == deployment_id,
            Deployment.user_id == current_user.id,
        )
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return {"logs": deployment.logs or [], "error": deployment.error_message}


async def _run_deployment(
    deployment_id: str,
    terraform_code: str,
    cloud_credentials: dict,
):
    """Background task: run actual deployment."""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        deployment = result.scalar_one_or_none()
        if not deployment:
            return

        # Mark as running
        deployment.status = "running"
        deployment.started_at = datetime.utcnow()
        await db.commit()

        try:
            # Run plan
            plan_result = await run_plan(terraform_code, cloud_credentials)

            if "error" in plan_result:
                deployment.status = "failed"
                deployment.error_message = plan_result["error"]
                deployment.logs = [plan_result.get("output", "")]
            else:
                deployment.terraform_plan = plan_result.get("plan_output", "")

                # Run apply
                apply_result = await run_apply(plan_result["plan_id"])

                if apply_result.get("success"):
                    deployment.status = "success"
                    deployment.logs = [apply_result.get("output", "")]

                    # Update project
                    result2 = await db.execute(
                        select(Project).where(Project.id == deployment.project_id)
                    )
                    project = result2.scalar_one_or_none()
                    if project:
                        project.status = "active"
                        project.last_deployed_at = datetime.utcnow()
                else:
                    deployment.status = "failed"
                    deployment.error_message = apply_result.get("error", "Apply failed")
                    deployment.logs = [apply_result.get("output", "")]

        except Exception as e:
            deployment.status = "failed"
            deployment.error_message = str(e)
            logger.error("Deployment failed", deployment_id=deployment_id, error=str(e))

        finally:
            deployment.completed_at = datetime.utcnow()
            if deployment.started_at:
                delta = deployment.completed_at - deployment.started_at
                deployment.duration_seconds = int(delta.total_seconds())
            await db.commit()
