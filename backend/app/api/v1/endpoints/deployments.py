from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID, uuid4
from datetime import datetime
import secrets

from app.db.database import get_db
from app.models.models import User, Project, Deployment, DeploymentStatus
from app.schemas.schemas import (
    DeploymentCreate, DeploymentResponse,
    DeploymentListResponse, MessageResponse
)
from app.api.v1.deps import get_current_user
from app.services.terraform_service import run_terraform_plan, run_terraform_apply
from app.services.ai_service import generate_terraform_from_prompt

router = APIRouter(prefix="/deployments", tags=["deployments"])


def _make_deployment_ref() -> str:
    """Generate a display ref like DEP-17668132026425-802LN"""
    ts = int(datetime.utcnow().timestamp() * 1000)
    suffix = secrets.token_hex(3).upper()
    return f"DEP-{ts}-{suffix}"


@router.post("", response_model=DeploymentResponse, status_code=201)
async def create_deployment(
    payload: DeploymentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).where(
            Project.id == payload.project_id,
            Project.owner_id == current_user.id,
        )
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    deployment = Deployment(
        project_id=payload.project_id,
        triggered_by=current_user.id,
        deployment_ref=_make_deployment_ref(),
        environment=payload.environment,
        version=payload.version,
        prompt=payload.prompt,
        terraform_vars=payload.terraform_vars,
        status=DeploymentStatus.QUEUED,
    )
    db.add(deployment)
    await db.flush()
    await db.refresh(deployment)

    # Queue background job: generate Terraform → plan → wait for approval
    background_tasks.add_task(
        _process_deployment,
        deployment_id=deployment.id,
        project_id=project.id,
        prompt=payload.prompt,
    )

    return deployment


@router.get("", response_model=DeploymentListResponse)
async def list_deployments(
    project_id: UUID | None = None,
    status: DeploymentStatus | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Join through project to enforce ownership
    query = (
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
    )
    if project_id:
        query = query.where(Deployment.project_id == project_id)
    if status:
        query = query.where(Deployment.status == status)

    total_q = await db.execute(
        select(func.count())
        .select_from(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
    )
    total = total_q.scalar()

    live_q = await db.execute(
        select(func.count()).select_from(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Project.owner_id == current_user.id, Deployment.status == DeploymentStatus.SUCCESS)
    )
    running_q = await db.execute(
        select(func.count()).select_from(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Project.owner_id == current_user.id, Deployment.status == DeploymentStatus.RUNNING)
    )
    failed_q = await db.execute(
        select(func.count()).select_from(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Project.owner_id == current_user.id, Deployment.status == DeploymentStatus.FAILED)
    )

    query = query.order_by(Deployment.queued_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    deployments = result.scalars().all()

    return DeploymentListResponse(
        deployments=deployments,
        total=total,
        live=live_q.scalar(),
        in_progress=running_q.scalar(),
        failed=failed_q.scalar(),
    )


@router.get("/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Deployment.id == deployment_id, Project.owner_id == current_user.id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return deployment


@router.post("/{deployment_id}/approve", response_model=MessageResponse)
async def approve_deployment(
    deployment_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """User reviews terraform plan and approves — triggers terraform apply."""
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Deployment.id == deployment_id, Project.owner_id == current_user.id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    if deployment.status != DeploymentStatus.QUEUED:
        raise HTTPException(status_code=400, detail=f"Cannot approve deployment in status: {deployment.status}")

    deployment.status = DeploymentStatus.RUNNING
    deployment.started_at = datetime.utcnow()

    background_tasks.add_task(_apply_deployment, deployment_id=deployment_id)
    return MessageResponse(message="Deployment approved — applying infrastructure")


@router.post("/{deployment_id}/cancel", response_model=MessageResponse)
async def cancel_deployment(
    deployment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deployment)
        .join(Project, Deployment.project_id == Project.id)
        .where(Deployment.id == deployment_id, Project.owner_id == current_user.id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")
    if deployment.status not in (DeploymentStatus.QUEUED, DeploymentStatus.RUNNING):
        raise HTTPException(status_code=400, detail="Cannot cancel this deployment")

    deployment.status = DeploymentStatus.CANCELLED
    deployment.completed_at = datetime.utcnow()
    return MessageResponse(message="Deployment cancelled")


# ─── Background Tasks ────────────────────────────────────────────────────────

async def _process_deployment(deployment_id: UUID, project_id: UUID, prompt: str | None):
    """
    1. If prompt given → AI generates Terraform HCL
    2. Run terraform plan (dry-run)
    3. Store plan output → user can review before approving
    """
    from app.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        deployment = result.scalar_one_or_none()
        if not deployment:
            return

        try:
            if prompt:
                hcl, resources = await generate_terraform_from_prompt(prompt)
                deployment.generated_code = hcl

            plan_output = await run_terraform_plan(
                project_id=project_id,
                terraform_code=deployment.generated_code,
                vars=deployment.terraform_vars or {},
            )
            deployment.terraform_plan = plan_output
            # Stays QUEUED — waiting for user approval
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED
            deployment.error_message = str(e)
            deployment.completed_at = datetime.utcnow()

        await db.commit()


async def _apply_deployment(deployment_id: UUID):
    """Run terraform apply after user approval."""
    from app.db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        deployment = result.scalar_one_or_none()
        if not deployment:
            return

        try:
            apply_output = await run_terraform_apply(
                project_id=deployment.project_id,
                terraform_code=deployment.generated_code,
                vars=deployment.terraform_vars or {},
            )
            deployment.terraform_apply = apply_output
            deployment.status = DeploymentStatus.SUCCESS
            deployment.completed_at = datetime.utcnow()
            if deployment.started_at:
                deployment.duration_seconds = int(
                    (deployment.completed_at - deployment.started_at).total_seconds()
                )
        except Exception as e:
            deployment.status = DeploymentStatus.FAILED
            deployment.error_message = str(e)
            deployment.completed_at = datetime.utcnow()

        await db.commit()
