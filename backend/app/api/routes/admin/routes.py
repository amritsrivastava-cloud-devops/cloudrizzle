from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select, func, desc
from typing import Optional
from datetime import datetime, timedelta
import httpx
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_admin_user
from app.core.security import extract_primary_email, parse_clerk_datetime
from app.core.plans import PLAN_DETAILS, apply_plan_defaults
from app.models.user import User, Project, Deployment, InfraResource, Template
from app.schemas.schemas import AdminStatsOut
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/admin", tags=["admin"])


def serialize_user_summary(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "plan": user.plan,
        "status": user.status,
        "created_at": user.created_at.isoformat(),
        "last_active_at": user.last_active_at.isoformat(),
    }


def serialize_invitation(invitation: dict) -> dict:
    return {
        "id": invitation.get("id"),
        "email_address": invitation.get("email_address"),
        "status": invitation.get("status"),
        "created_at": invitation.get("created_at"),
        "updated_at": invitation.get("updated_at"),
        "public_metadata": invitation.get("public_metadata") or {},
    }


def serialize_clerk_user(clerk_user: dict) -> dict:
    metadata = clerk_user.get("public_metadata") or {}
    first_name = (clerk_user.get("first_name") or "").strip()
    last_name = (clerk_user.get("last_name") or "").strip()
    email = extract_primary_email(clerk_user).strip().lower()
    name = " ".join(part for part in [first_name, last_name] if part).strip() or email or "Unknown User"
    role = metadata.get("role") if metadata.get("role") in {"user", "admin"} else "user"
    plan = metadata.get("plan") if metadata.get("plan") in PLAN_DETAILS else "free"
    created_at = parse_clerk_datetime(clerk_user.get("created_at") or clerk_user.get("createdAt")) or datetime.utcnow()
    last_active_at = parse_clerk_datetime(
        clerk_user.get("last_active_at")
        or clerk_user.get("lastActiveAt")
        or clerk_user.get("last_sign_in_at")
        or clerk_user.get("lastSignInAt")
    ) or created_at
    return {
        "clerk_id": clerk_user.get("id"),
        "email": email,
        "name": name,
        "first_name": first_name or None,
        "last_name": last_name or None,
        "avatar": clerk_user.get("image_url"),
        "role": role,
        "plan": plan,
        "created_at": created_at,
        "last_active_at": last_active_at,
    }


async def sync_clerk_users_to_db(db: AsyncSession) -> int:
    if not settings.CLERK_SECRET_KEY:
        return 0

    synced = 0
    offset = 0
    page_size = 100
    headers = {"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            response = await client.get(
                "https://api.clerk.com/v1/users",
                headers=headers,
                params={"limit": page_size, "offset": offset},
            )
            response.raise_for_status()
            payload = response.json()
            users = payload if isinstance(payload, list) else payload.get("data", [])

            if not users:
                break

            for clerk_user in users:
                serialized = serialize_clerk_user(clerk_user)
                clerk_id = serialized["clerk_id"]
                email = serialized["email"]
                if not clerk_id or not email:
                    continue

                result = await db.execute(
                    select(User).where((User.clerk_id == clerk_id) | (User.email == email))
                )
                user = result.scalar_one_or_none()

                if not user:
                    user = User(
                        clerk_id=clerk_id,
                        email=email,
                        name=serialized["name"],
                        first_name=serialized["first_name"],
                        last_name=serialized["last_name"],
                        avatar=serialized["avatar"],
                        role=serialized["role"],
                        plan=serialized["plan"],
                        status="active",
                        created_at=serialized["created_at"],
                        last_active_at=serialized["last_active_at"],
                    )
                    apply_plan_defaults(user)
                    db.add(user)
                    synced += 1
                    continue

                changed = False
                for field in [
                    "clerk_id",
                    "email",
                    "name",
                    "first_name",
                    "last_name",
                    "avatar",
                    "role",
                    "plan",
                    "created_at",
                    "last_active_at",
                ]:
                    value = serialized[field]
                    if getattr(user, field) != value:
                        setattr(user, field, value)
                        changed = True

                if user.status != "active":
                    user.status = "active"
                    changed = True

                previous_limit = user.ai_credits_limit
                previous_reset_at = user.credits_reset_at
                apply_plan_defaults(user)
                if user.ai_credits_limit != previous_limit or user.credits_reset_at != previous_reset_at:
                    changed = True

                if changed:
                    synced += 1

            await db.commit()

            if len(users) < page_size:
                break

            offset += page_size

    logger.info("Clerk users synced", synced=synced)
    return synced


async def update_clerk_user_metadata(*, clerk_id: str, role: str, plan: str) -> None:
    if not settings.CLERK_SECRET_KEY or not clerk_id or clerk_id.startswith("local-"):
        return

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.patch(
            f"https://api.clerk.com/v1/users/{clerk_id}/metadata",
            headers={
                "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "public_metadata": {
                    "role": role,
                    "plan": plan,
                }
            },
        )
        response.raise_for_status()


# ─── Platform Stats ───────────────────────────────────────────
@router.get("/stats", response_model=AdminStatsOut)
async def get_platform_stats(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        await sync_clerk_users_to_db(db)
    except Exception as exc:
        logger.warning("Failed to sync Clerk users before stats", error=str(exc))

    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    month_ago = now - timedelta(days=30)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    active_users_today = (await db.execute(
        select(func.count()).select_from(User).where(User.last_active_at >= day_ago)
    )).scalar()
    suspended_users = (await db.execute(
        select(func.count()).select_from(User).where(User.status == "suspended")
    )).scalar()
    enterprise_users = (await db.execute(
        select(func.count()).select_from(User).where(User.plan == "enterprise")
    )).scalar()
    total_projects = (await db.execute(select(func.count()).select_from(Project))).scalar()
    total_deployments = (await db.execute(select(func.count()).select_from(Deployment))).scalar()
    failed_30d = (await db.execute(
        select(func.count()).select_from(Deployment).where(
            Deployment.status == "failed",
            Deployment.created_at >= month_ago,
        )
    )).scalar()
    mrr = (await db.execute(select(func.sum(Project.monthly_cost)).select_from(Project))).scalar() or 0.0

    plan_rows = (await db.execute(
        select(User.plan, func.count()).group_by(User.plan)
    )).all()
    by_plan = {"free": 0, "pro": 0, "enterprise": 0}
    for plan, count in plan_rows:
        by_plan[str(plan)] = int(count)

    cloud_rows = (await db.execute(
        select(Project.cloud, func.count()).group_by(Project.cloud)
    )).all()
    by_cloud = {"aws": 0, "azure": 0, "gcp": 0}
    for cloud, count in cloud_rows:
        by_cloud[str(cloud)] = int(count)

    total_users_value = int(total_users or 0)
    arpu = round(float(mrr) / total_users_value, 2) if total_users_value else 0.0

    return AdminStatsOut(
        total_users=total_users_value,
        active_users_today=active_users_today or 0,
        suspended_users=suspended_users or 0,
        enterprise_users=enterprise_users or 0,
        total_projects=total_projects or 0,
        total_deployments=total_deployments or 0,
        failed_deployments_30d=failed_30d or 0,
        mrr=round(float(mrr), 2),
        arr=round(float(mrr) * 12, 2),
        churn_rate=4.2,
        arpu=arpu,
        by_plan=by_plan,
        by_cloud=by_cloud,
    )


# ─── Users ────────────────────────────────────────────────────
@router.get("/users")
async def list_all_users(
    plan: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await sync_clerk_users_to_db(db)
    except Exception as exc:
        logger.warning("Failed to sync Clerk users before listing users", error=str(exc))

    query = select(User)
    if plan:
        query = query.where(User.plan == plan)
    if status:
        query = query.where(User.status == status)
    query = query.order_by(desc(User.created_at)).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()
    total = (await db.execute(select(func.count()).select_from(User))).scalar()
    user_ids = [u.id for u in users]

    project_counts: dict[str, int] = {}
    deployment_counts: dict[str, int] = {}
    total_spend: dict[str, float] = {}

    if user_ids:
        for user_id, count in (await db.execute(
            select(Project.user_id, func.count()).where(Project.user_id.in_(user_ids)).group_by(Project.user_id)
        )).all():
            project_counts[user_id] = int(count)

        for user_id, count in (await db.execute(
            select(Deployment.user_id, func.count()).where(Deployment.user_id.in_(user_ids)).group_by(Deployment.user_id)
        )).all():
            deployment_counts[user_id] = int(count)

        for user_id, spend in (await db.execute(
            select(Project.user_id, func.coalesce(func.sum(Project.monthly_cost), 0)).where(Project.user_id.in_(user_ids)).group_by(Project.user_id)
        )).all():
            total_spend[user_id] = round(float(spend or 0), 2)

    total_value = int(total or 0)

    return {
        "data": [
            {
                **serialize_user_summary(u),
                "project_count": project_counts.get(u.id, 0),
                "deployment_count": deployment_counts.get(u.id, 0),
                "total_spend": total_spend.get(u.id, 0.0),
            }
            for u in users
        ],
        "total": total_value,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_value + page_size - 1) // page_size if total_value else 0,
    }


@router.get("/users/{user_id}")
async def get_user(user_id: str, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    projects_count = (await db.execute(
        select(func.count()).select_from(Project).where(Project.user_id == user_id)
    )).scalar()
    deploys_count = (await db.execute(
        select(func.count()).select_from(Deployment).where(Deployment.user_id == user_id)
    )).scalar()
    total_spend = (await db.execute(
        select(func.sum(Project.monthly_cost)).where(Project.user_id == user_id)
    )).scalar()

    return {
        **serialize_user_summary(user),
        "project_count": projects_count,
        "deployment_count": deploys_count,
        "total_spend": round(float(total_spend or 0), 2),
    }


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: dict,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and payload.get("role") and payload.get("role") != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access")

    role = payload.get("role")
    if role is not None:
        if role not in {"user", "admin"}:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = role

    plan = payload.get("plan")
    if plan is not None:
        if plan not in PLAN_DETAILS:
            raise HTTPException(status_code=400, detail="Invalid plan")
        user.plan = plan
        apply_plan_defaults(user)

    status = payload.get("status")
    if status is not None:
        if status not in {"active", "suspended", "pending"}:
            raise HTTPException(status_code=400, detail="Invalid status")
        if user.id == admin.id and status == "suspended":
            raise HTTPException(status_code=400, detail="You cannot suspend your own account")
        user.status = status

    await db.commit()
    await db.refresh(user)
    try:
        await update_clerk_user_metadata(clerk_id=user.clerk_id, role=user.role, plan=user.plan)
    except Exception as exc:
        logger.warning("Failed to push user metadata to Clerk", user_id=user_id, error=str(exc))
    logger.info("Admin updated user", user_id=user_id, admin_id=admin.id, payload=payload)
    return {"message": "User updated", "user": serialize_user_summary(user)}


@router.post("/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot suspend your own account")
    user.status = "suspended"
    await db.commit()
    logger.info("User suspended", user_id=user_id, admin_id=admin.id)
    return {"message": "User suspended"}


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "active"
    await db.commit()
    return {"message": "User unsuspended"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    await db.execute(delete(InfraResource).where(InfraResource.user_id == user_id))
    await db.execute(delete(Deployment).where(Deployment.user_id == user_id))
    await db.execute(delete(Project).where(Project.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    logger.info("Admin deleted user", user_id=user_id, admin_id=admin.id)
    return {"message": "User deleted"}


@router.get("/invitations")
async def list_invitations(admin: User = Depends(get_admin_user)):
    if not settings.CLERK_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Clerk is not configured")

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            "https://api.clerk.com/v1/invitations",
            headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    payload = response.json()
    if isinstance(payload, list):
        invitations = payload
        total = len(invitations)
    else:
        invitations = payload.get("data", [])
        total = payload.get("total_count", len(invitations))
    return {"data": [serialize_invitation(invitation) for invitation in invitations], "total": total}


@router.post("/users/sync")
async def sync_users(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        synced = await sync_clerk_users_to_db(db)
    except Exception as exc:
        logger.warning("Manual Clerk sync failed", error=str(exc))
        raise HTTPException(status_code=502, detail="Failed to sync users from Clerk")

    total = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    return {"message": "Users synced", "synced": synced, "total_users": int(total)}


@router.post("/invitations", status_code=201)
async def create_invitation(
    payload: dict,
    admin: User = Depends(get_admin_user),
):
    if not settings.CLERK_SECRET_KEY:
        raise HTTPException(status_code=400, detail="Clerk is not configured")

    email = (payload.get("email") or "").strip().lower()
    role = payload.get("role") or "user"
    plan = payload.get("plan") or "free"

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if role not in {"user", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    if plan not in PLAN_DETAILS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    invitation_payload = {
        "email_address": email,
        "redirect_url": settings.APP_INVITE_REDIRECT_URL,
        "public_metadata": {
            "role": role,
            "plan": plan,
            "invited_by": admin.email,
        },
        "notify": True,
        "ignore_existing": False,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.clerk.com/v1/invitations",
            headers={
                "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json=invitation_payload,
        )

    if response.status_code >= 400:
        detail = response.json() if "application/json" in response.headers.get("content-type", "") else response.text
        raise HTTPException(status_code=response.status_code, detail=detail)

    invitation = response.json()
    logger.info("Admin invited user", admin_id=admin.id, email=email, role=role, plan=plan)
    return {"message": "Invitation sent", "invitation": serialize_invitation(invitation)}


# ─── Admin Projects ───────────────────────────────────────────
@router.get("/projects")
async def list_all_projects(
    cloud: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Project)
    if cloud:
        query = query.where(Project.cloud == cloud)
    query = query.order_by(desc(Project.updated_at)).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    projects = result.scalars().all()
    total = (await db.execute(select(func.count()).select_from(Project))).scalar()
    user_ids = [p.user_id for p in projects]
    user_names: dict[str, str] = {}

    if user_ids:
        for user_id, name in (await db.execute(
            select(User.id, User.name).where(User.id.in_(user_ids))
        )).all():
            user_names[user_id] = name

    return {
        "data": [
            {
                "id": p.id, "name": p.name, "cloud": p.cloud,
                "environment": p.environment, "status": p.status,
                "resource_count": p.resource_count, "monthly_cost": p.monthly_cost,
                "user_id": p.user_id,
                "owner_name": user_names.get(p.user_id, "Unknown User"),
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat(),
                "last_deployed_at": p.last_deployed_at.isoformat() if p.last_deployed_at else None,
            }
            for p in projects
        ],
        "total": int(total or 0),
        "page": page,
        "page_size": page_size,
        "total_pages": ((int(total or 0) + page_size - 1) // page_size) if total else 0,
    }


# ─── Admin Deployments ────────────────────────────────────────
@router.get("/deployments")
async def list_all_deployments(
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Deployment)
    if status:
        query = query.where(Deployment.status == status)
    query = query.order_by(desc(Deployment.created_at)).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    deployments = result.scalars().all()
    total = (await db.execute(select(func.count()).select_from(Deployment))).scalar()
    user_ids = [d.user_id for d in deployments]
    project_ids = [d.project_id for d in deployments]
    user_names: dict[str, str] = {}
    project_names: dict[str, dict[str, str]] = {}

    if user_ids:
        for user_id, name in (await db.execute(
            select(User.id, User.name).where(User.id.in_(user_ids))
        )).all():
            user_names[user_id] = name

    if project_ids:
        for project_id, name, cloud in (await db.execute(
            select(Project.id, Project.name, Project.cloud).where(Project.id.in_(project_ids))
        )).all():
            project_names[project_id] = {"name": name, "cloud": cloud}

    return {
        "data": [
            {
                "id": d.id, "project_id": d.project_id, "user_id": d.user_id,
                "version": d.version, "environment": d.environment, "status": d.status,
                "triggered_by": d.triggered_by, "duration_seconds": d.duration_seconds,
                "created_at": d.created_at.isoformat(),
                "user_name": user_names.get(d.user_id, "Unknown User"),
                "project_name": project_names.get(d.project_id, {}).get("name", d.project_id),
                "cloud": project_names.get(d.project_id, {}).get("cloud", "aws"),
            }
            for d in deployments
        ],
        "total": int(total or 0),
        "page": page,
        "page_size": page_size,
        "total_pages": ((int(total or 0) + page_size - 1) // page_size) if total else 0,
    }


# ─── Admin Infra Resources ────────────────────────────────────
@router.get("/infra/resources")
async def list_all_resources(
    cloud: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(InfraResource)
    if cloud:
        query = query.where(InfraResource.cloud == cloud)
    result = await db.execute(query)
    resources = result.scalars().all()
    return {"data": [r.__dict__ for r in resources], "total": len(resources)}


# ─── Admin Templates ──────────────────────────────────────────
@router.get("/templates")
async def list_templates(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).order_by(desc(Template.usage_count)))
    return {"data": result.scalars().all()}


@router.post("/templates", status_code=201)
async def create_template(payload: dict, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    template = Template(**payload)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    payload: dict,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    for field in [
        "name",
        "description",
        "cloud",
        "category",
        "resources",
        "terraform_code",
        "status",
        "usage_count",
        "success_rate",
        "is_popular",
        "is_new",
    ]:
        if field in payload:
            setattr(template, field, payload[field])

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: str, admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()


# ─── Admin Monitoring ─────────────────────────────────────────
@router.get("/monitoring/platform")
async def get_platform_monitoring(admin: User = Depends(get_admin_user)):
    return {
        "cpu_percent": 34.0,
        "memory_percent": 58.0,
        "disk_percent": 41.0,
        "network_in_mbps": 124.0,
        "network_out_mbps": 89.0,
        "api_latency_ms": 142.0,
        "active_connections": 284,
        "queue_depth": 47,
        "uptime_percent": 99.2,
        "docker_containers": {"total": 6, "healthy": 6},
        "postgres_connections": {"current": 48, "max": 100},
        "redis_memory_gb": 1.2,
    }


@router.get("/monitoring/logs")
async def get_platform_logs(admin: User = Depends(get_admin_user)):
    return {
        "logs": [
            {"ts": "14:32:01", "lvl": "INFO", "msg": "Temporal workflow deploy#987688 started"},
            {"ts": "14:31:58", "lvl": "INFO", "msg": "User authenticated via Clerk"},
            {"ts": "14:31:44", "lvl": "WARN", "msg": "PostgreSQL pool 48/100 connections"},
            {"ts": "14:31:32", "lvl": "ERROR", "msg": "Azure AKS deploy#654321 timeout 8m34s"},
            {"ts": "14:30:17", "lvl": "INFO", "msg": "AI Generator: Terraform validated OK"},
            {"ts": "14:29:55", "lvl": "INFO", "msg": "Redis cache hit rate: 94.2%"},
        ]
    }


# ─── Admin Revenue ────────────────────────────────────────────
@router.get("/revenue/summary")
async def get_revenue_summary(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    return {
        "mrr": 28400.0,
        "arr": 340800.0,
        "churn_rate": 4.2,
        "arpu": 22.10,
        "by_plan": {
            "enterprise": 18200.0,
            "pro": 10200.0,
            "free": 0.0,
        },
        "growth_mom": 11.0,
    }
