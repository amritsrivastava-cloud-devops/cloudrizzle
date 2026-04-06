from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID

from app.db.database import get_db
from app.models.models import User, Project, ProjectStatus
from app.schemas.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectListResponse, MessageResponse
)
from app.api.v1.deps import get_current_user
from python_slugify import slugify

router = APIRouter(prefix="/projects", tags=["projects"])


def _make_slug(name: str) -> str:
    return slugify(name)


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = _make_slug(payload.name)
    # Ensure slug uniqueness per user
    existing = await db.execute(
        select(Project).where(Project.owner_id == current_user.id, Project.slug == slug)
    )
    if existing.scalar_one_or_none():
        slug = f"{slug}-{str(UUID(int=0))[:8]}"

    project = Project(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        slug=slug,
        cloud_account_id=payload.cloud_account_id,
        template_id=payload.template_id,
        environment=payload.environment,
        provider=payload.provider,
        region=payload.region,
        tags=payload.tags,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return project


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    status: Optional[ProjectStatus] = None,
    provider: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Project).where(Project.owner_id == current_user.id)
    if status:
        query = query.where(Project.status == status)

    # Counts
    total_q = await db.execute(
        select(func.count()).select_from(Project).where(Project.owner_id == current_user.id)
    )
    total = total_q.scalar()

    active_q = await db.execute(
        select(func.count()).select_from(Project).where(
            Project.owner_id == current_user.id, Project.status == ProjectStatus.ACTIVE
        )
    )
    deploying_q = await db.execute(
        select(func.count()).select_from(Project).where(
            Project.owner_id == current_user.id, Project.status == ProjectStatus.DEPLOYING
        )
    )
    paused_q = await db.execute(
        select(func.count()).select_from(Project).where(
            Project.owner_id == current_user.id, Project.status == ProjectStatus.PAUSED
        )
    )

    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    projects = result.scalars().all()

    return ProjectListResponse(
        projects=projects,
        total=total,
        active=active_q.scalar(),
        deploying=deploying_q.scalar(),
        paused=paused_q.scalar(),
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(project, field, value)

    await db.flush()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    return MessageResponse(message="Project deleted successfully")
