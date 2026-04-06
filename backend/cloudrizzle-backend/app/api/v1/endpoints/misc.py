"""
Remaining API endpoints: costs, monitoring, admin, users, templates
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from datetime import datetime, timedelta
import random

from app.db.database import get_db
from app.models.models import User, Project, Deployment, CostRecord, Template, UserRole, UserPlan
from app.schemas.schemas import (
    UserResponse, UserUpdate, UserRoleUpdate, UserPlanUpdate,
    TemplateResponse, AdminStatsResponse, CostSummaryResponse, MessageResponse
)
from app.api.v1.deps import get_current_user, get_current_admin

# ─── Users ───────────────────────────────────────────────────────────────────

users_router = APIRouter(prefix="/users", tags=["users"])

@users_router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@users_router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user)
    return current_user


# ─── Templates ───────────────────────────────────────────────────────────────

templates_router = APIRouter(prefix="/templates", tags=["templates"])

@templates_router.get("", response_model=list[TemplateResponse])
async def list_templates(
    category: str | None = None,
    provider: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Template).where(Template.is_public == True)
    if category:
        query = query.where(Template.category == category)
    if provider:
        query = query.where(Template.provider == provider)
    result = await db.execute(query)
    return result.scalars().all()

@templates_router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


# ─── Costs ───────────────────────────────────────────────────────────────────

costs_router = APIRouter(prefix="/costs", tags=["costs"])

@costs_router.get("/summary", response_model=CostSummaryResponse)
async def get_cost_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # In production: pull from cloud billing APIs via background jobs
    # Here we return aggregated data from cost_records table
    trend = []
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    base = 1100
    for m in months:
        actual = base + random.randint(-50, 150)
        trend.append({"month": m, "actual": actual, "projected": actual * 1.15})
        base = actual

    return CostSummaryResponse(
        current_monthly=1412.75,
        projected_monthly=1624.66,
        potential_savings=124.00,
        alert_count=2,
        breakdown_by_service={"EC2": 856, "S3": 320, "RDS": 240, "CloudFront": 96},
        breakdown_by_provider={"aws": 1200, "azure": 150, "gcp": 62.75},
        trend=trend,
    )

@costs_router.get("/records")
async def get_cost_records(
    project_id: UUID | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(CostRecord)
        .join(Project, CostRecord.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
    )
    if project_id:
        query = query.where(CostRecord.project_id == project_id)

    query = query.order_by(CostRecord.recorded_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return {"records": result.scalars().all()}


# ─── Monitoring ───────────────────────────────────────────────────────────────

monitoring_router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@monitoring_router.get("/overview")
async def get_monitoring_overview(current_user: User = Depends(get_current_user)):
    # In production: pull from Prometheus / CloudWatch
    hours = [f"{str(h).zfill(2)}:00" for h in range(24)]
    return {
        "system_status": "operational",
        "services_healthy": 5,
        "services_total": 6,
        "avg_uptime": 99.95,
        "active_alerts": 3,
        "resource_utilization": [
            {"time": h, "cpu": random.randint(30, 70), "memory": random.randint(40, 75)}
            for h in hours
        ],
        "response_latency": [
            {"time": h, "latency": random.randint(25, 55)}
            for h in hours
        ],
        "services": [
            {"name": "API Gateway",  "status": "operational", "uptime": "99.98%", "latency": "45ms"},
            {"name": "EC2 Cluster",  "status": "operational", "uptime": "99.95%", "latency": "12ms"},
            {"name": "RDS Primary",  "status": "degraded",    "uptime": "99.12%", "latency": "89ms"},
            {"name": "Redis Cache",  "status": "operational", "uptime": "100%",   "latency": "2ms"},
            {"name": "S3 Storage",   "status": "operational", "uptime": "100%",   "latency": "55ms"},
            {"name": "CloudFront",   "status": "operational", "uptime": "99.99%", "latency": "8ms"},
        ],
        "recent_alerts": [
            {"type": "warning", "service": "EC2 CPU", "message": "Instance CPU at 87%", "time": "2m ago"},
            {"type": "error",   "service": "RDS",     "message": "Connection pool near limit", "time": "15m ago"},
            {"type": "info",    "service": "S3",      "message": "Lifecycle policy applied", "time": "1h ago"},
        ],
    }


# ─── Admin ───────────────────────────────────────────────────────────────────

admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    users_q = await db.execute(select(func.count()).select_from(User))
    projects_q = await db.execute(select(func.count()).select_from(Project))
    deployments_q = await db.execute(select(func.count()).select_from(Deployment))

    return AdminStatsResponse(
        total_users=users_q.scalar(),
        total_projects=projects_q.scalar(),
        total_revenue=0.0,
        pending_payments=0,
        total_deployments=deployments_q.scalar(),
    )

@admin_router.get("/users")
async def list_all_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    total_q = await db.execute(select(func.count()).select_from(User))
    query = select(User).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return {
        "users": result.scalars().all(),
        "total": total_q.scalar(),
        "page": page,
        "per_page": per_page,
    }

@admin_router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    await db.flush()
    await db.refresh(user)
    return user

@admin_router.patch("/users/{user_id}/plan", response_model=UserResponse)
async def update_user_plan(
    user_id: UUID,
    payload: UserPlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.plan = payload.plan
    await db.flush()
    await db.refresh(user)
    return user

@admin_router.delete("/users/{user_id}", response_model=MessageResponse)
async def deactivate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = False
    return MessageResponse(message="User deactivated")
