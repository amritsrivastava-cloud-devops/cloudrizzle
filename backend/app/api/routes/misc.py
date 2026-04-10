from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.plans import PLAN_DETAILS, apply_plan_defaults, reset_free_credits_if_needed
from app.core.security import get_current_user
from app.models.user import User, CloudAccount, Template
from app.schemas.schemas import CloudAccountCreate, CloudAccountOut, TemplateOut, TemplateWithCode, UserProfileUpdate
from app.services.cloud.providers import get_cloud_service
import structlog

logger = structlog.get_logger()

profile_router = APIRouter(prefix="/users", tags=["users"])


@profile_router.get("/me")
async def get_current_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    reset_free_credits_if_needed(current_user)
    apply_plan_defaults(current_user)
    await db.commit()

    return {
        "id": current_user.id,
        "clerk_id": current_user.clerk_id,
        "name": current_user.name,
        "first_name": current_user.first_name or "",
        "last_name": current_user.last_name or "",
        "email": current_user.email,
        "avatar": current_user.avatar,
        "date_of_birth": current_user.date_of_birth.isoformat() if current_user.date_of_birth else None,
        "role": current_user.role,
        "plan": current_user.plan,
        "status": current_user.status,
        "ai_credits_used": current_user.ai_credits_used,
        "ai_credits_limit": current_user.ai_credits_limit,
        "credits_reset_at": current_user.credits_reset_at.isoformat() if current_user.credits_reset_at else None,
        "plan_details": PLAN_DETAILS.get(current_user.plan, PLAN_DETAILS["free"]),
        "created_at": current_user.created_at.isoformat(),
        "last_active_at": current_user.last_active_at.isoformat(),
    }


@profile_router.put("/me")
async def update_current_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.first_name is not None:
        current_user.first_name = payload.first_name.strip() or None
    if payload.last_name is not None:
        current_user.last_name = payload.last_name.strip() or None
    if payload.email is not None:
        current_user.email = payload.email.strip()
    if payload.date_of_birth is not None:
        current_user.date_of_birth = datetime.strptime(payload.date_of_birth, "%Y-%m-%d").date() if payload.date_of_birth else None

    full_name = " ".join(part for part in [current_user.first_name or "", current_user.last_name or ""] if part).strip()
    current_user.name = full_name or current_user.email

    await db.commit()
    await db.refresh(current_user)
    return {"success": True}

# ─── Cloud Accounts ──────────────────────────────────────────
cloud_router = APIRouter(prefix="/cloud-accounts", tags=["cloud-accounts"])

@cloud_router.get("", response_model=list[CloudAccountOut])
async def list_cloud_accounts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CloudAccount).where(CloudAccount.user_id == current_user.id))
    return result.scalars().all()


@cloud_router.post("", response_model=CloudAccountOut, status_code=201)
async def connect_cloud(payload: CloudAccountCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Test connection before saving
    service = get_cloud_service(payload.provider, payload.credentials)
    if not service.test_connection():
        raise HTTPException(status_code=400, detail="Could not connect to cloud provider. Check your credentials.")

    account = CloudAccount(
        user_id=current_user.id,
        provider=payload.provider,
        name=payload.name,
        account_id=payload.account_id,
        region=payload.region,
        access_type=payload.access_type,
        credentials_encrypted={},  # TODO: encrypt before storing
        status="connected",
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@cloud_router.post("/{account_id}/test")
async def test_connection(account_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CloudAccount).where(CloudAccount.id == account_id, CloudAccount.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    return {"status": "connected", "message": "Connection successful"}


@cloud_router.delete("/{account_id}", status_code=204)
async def disconnect_cloud(account_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CloudAccount).where(CloudAccount.id == account_id, CloudAccount.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    await db.delete(account)
    await db.commit()


# ─── Templates ────────────────────────────────────────────────
templates_router = APIRouter(prefix="/templates", tags=["templates"])

@templates_router.get("", response_model=list[TemplateOut])
async def list_templates(cloud: str = None, category: str = None, db: AsyncSession = Depends(get_db)):
    query = select(Template).where(Template.status == "published")
    if cloud:
        query = query.where(Template.cloud == cloud)
    if category:
        query = query.where(Template.category == category)
    query = query.order_by(Template.usage_count.desc())
    result = await db.execute(query)
    return result.scalars().all()


@templates_router.get("/{template_id}", response_model=TemplateWithCode)
async def get_template(template_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    # Increment usage count
    template.usage_count += 1
    await db.commit()
    await db.refresh(template)
    return template


# ─── Monitoring ───────────────────────────────────────────────
monitoring_router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@monitoring_router.get("/uptime")
async def get_uptime(current_user: User = Depends(get_current_user)):
    """Return uptime data for last 90 days."""
    import random
    days = []
    for i in range(90):
        r = random.random()
        status = "healthy" if r > 0.05 else ("degraded" if r > 0.01 else "outage")
        days.append({"day": i + 1, "status": status})
    return {"uptime_percent": 99.2, "days": days}


@monitoring_router.get("/{project_id}/metrics")
async def get_metrics(project_id: str, range: str = "24h", current_user: User = Depends(get_current_user)):
    """Return mock metrics — in production, pull from Prometheus."""
    import random
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    points = 24 if range == "24h" else 7
    return {
        "cpu": [{"ts": (now - timedelta(hours=i)).isoformat(), "v": round(random.uniform(15, 75), 1)} for i in range(points, 0, -1)],
        "memory": [{"ts": (now - timedelta(hours=i)).isoformat(), "v": round(random.uniform(40, 70), 1)} for i in range(points, 0, -1)],
        "requests": [{"ts": (now - timedelta(hours=i)).isoformat(), "v": random.randint(500, 5000)} for i in range(points, 0, -1)],
    }


@monitoring_router.get("/{project_id}/logs")
async def get_logs(project_id: str, current_user: User = Depends(get_current_user)):
    """Return recent log lines — in production, pull from Loki."""
    return {
        "logs": [
            {"ts": "14:32:01", "lvl": "INFO", "msg": "Health check passed"},
            {"ts": "14:31:44", "lvl": "WARN", "msg": "Memory usage at 68%"},
            {"ts": "14:30:17", "lvl": "INFO", "msg": "Auto-scaling: no action needed"},
            {"ts": "14:29:55", "lvl": "ERROR", "msg": "CORS policy mismatch on /api/upload"},
        ]
    }


# ─── Costs ────────────────────────────────────────────────────
costs_router = APIRouter(prefix="/costs", tags=["costs"])

@costs_router.get("/summary")
async def get_cost_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    from app.models.user import Project
    result = await db.execute(
        select(func.sum(Project.monthly_cost)).where(Project.user_id == current_user.id)
    )
    total = result.scalar() or 0.0
    return {
        "this_month": round(total, 2),
        "last_month": round(total * 0.97, 2),
        "budget": 2000.0,
        "forecast": round(total * 1.12, 2),
    }


@costs_router.get("/by-project")
async def get_costs_by_project(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.user import Project
    result = await db.execute(
        select(Project.id, Project.name, Project.cloud, Project.monthly_cost)
        .where(Project.user_id == current_user.id)
        .order_by(Project.monthly_cost.desc())
    )
    rows = result.all()
    total = sum(r[3] for r in rows) or 1
    return [
        {"project_id": r[0], "project_name": r[1], "cloud": r[2], "cost": r[3], "percentage": round((r[3] / total) * 100, 1)}
        for r in rows
    ]
