from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.core.database import get_db
from app.core.plans import FREE_PLAN_PROJECT_LIMIT
from app.core.security import get_current_user
from app.models.user import User, Project, Deployment
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectOut, PaginatedResponse
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    cloud: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all projects for the current user."""
    query = select(Project).where(Project.user_id == current_user.id)
    if cloud:
        query = query.where(Project.cloud == cloud)
    if status:
        query = query.where(Project.status == status)
    query = query.order_by(Project.updated_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project."""
    # Check plan limits
    if current_user.plan == "free":
        result = await db.execute(
            select(func.count()).where(Project.user_id == current_user.id)
        )
        count = result.scalar()
        if count >= 2:
            raise HTTPException(
                status_code=403,
                detail=f"Free plan limited to {FREE_PLAN_PROJECT_LIMIT} projects. Upgrade to Pro."
            )

    project = Project(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        cloud=payload.cloud,
        environment=payload.environment,
        cloud_account_id=payload.cloud_account_id,
        status="active",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    logger.info("Project created", project_id=project.id, user_id=current_user.id)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    logger.info("Project deleted", project_id=project_id)
