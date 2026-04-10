from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.plans import PLAN_DETAILS, apply_plan_defaults
from app.models.user import User
from fastapi import Depends
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/clerk")
async def clerk_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Handle Clerk webhook events — keep our users table in sync."""
    event_type = payload.get("type")
    data = payload.get("data", {})

    logger.info("Clerk webhook received", event=event_type)

    if event_type == "user.created":
        await _handle_user_created(data, db)

    elif event_type == "user.updated":
        await _handle_user_updated(data, db)

    elif event_type == "user.deleted":
        await _handle_user_deleted(data, db)

    elif event_type == "session.created":
        # Update last_active_at
        clerk_id = data.get("user_id")
        if clerk_id:
            result = await db.execute(select(User).where(User.clerk_id == clerk_id))
            user = result.scalar_one_or_none()
            if user:
                from datetime import datetime
                user.last_active_at = datetime.utcnow()
                await db.commit()

    return {"received": True}


async def _handle_user_created(data: dict, db: AsyncSession):
    clerk_id = data.get("id")
    if not clerk_id:
        return

    # Check if already exists
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    if result.scalar_one_or_none():
        return

    email = ""
    if data.get("email_addresses"):
        email = data["email_addresses"][0].get("email_address", "")

    first = data.get("first_name", "") or ""
    last = data.get("last_name", "") or ""
    name = f"{first} {last}".strip() or email
    metadata = data.get("public_metadata", {}) or {}
    role = metadata.get("role") if metadata.get("role") in {"user", "admin"} else "user"
    plan = metadata.get("plan") if metadata.get("plan") in PLAN_DETAILS else "free"

    user = User(
        clerk_id=clerk_id,
        email=email,
        name=name,
        first_name=first or None,
        last_name=last or None,
        avatar=data.get("image_url"),
        role=role,
        plan=plan,
        status="active",
    )
    apply_plan_defaults(user)
    db.add(user)
    await db.commit()
    logger.info("User created from webhook", clerk_id=clerk_id, email=email)


async def _handle_user_updated(data: dict, db: AsyncSession):
    clerk_id = data.get("id")
    if not clerk_id:
        return

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        return

    # Update fields
    if data.get("email_addresses"):
        user.email = data["email_addresses"][0].get("email_address", user.email)

    first = data.get("first_name", "") or ""
    last = data.get("last_name", "") or ""
    new_name = f"{first} {last}".strip()
    if new_name:
        user.name = new_name
    user.first_name = first or None
    user.last_name = last or None

    if data.get("image_url"):
        user.avatar = data["image_url"]

    # Sync plan from Clerk metadata if set
    metadata = data.get("public_metadata", {})
    if metadata.get("plan"):
        new_plan = metadata["plan"]
        user.plan = new_plan
        apply_plan_defaults(user)

    if metadata.get("role"):
        user.role = metadata["role"]

    await db.commit()
    logger.info("User updated from webhook", clerk_id=clerk_id)


async def _handle_user_deleted(data: dict, db: AsyncSession):
    clerk_id = data.get("id")
    if not clerk_id:
        return

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if user:
        user.status = "suspended"
        await db.commit()
        logger.info("User suspended from webhook deletion", clerk_id=clerk_id)
