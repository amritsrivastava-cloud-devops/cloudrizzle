"""
Tests for /api/v1/webhooks/clerk
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User


@pytest.mark.asyncio
async def test_clerk_webhook_user_created(
    client: AsyncClient, db: AsyncSession
):
    """user.created event creates a user in the DB."""
    payload = {
        "type": "user.created",
        "data": {
            "id": "clerk_new_user_001",
            "email_addresses": [{"email_address": "newuser@test.com"}],
            "first_name": "New",
            "last_name": "User",
            "image_url": "https://example.com/avatar.jpg",
        },
    }
    response = await client.post("/api/v1/webhooks/clerk", json=payload)
    assert response.status_code == 200
    assert response.json()["received"] is True

    # User should now exist in DB
    result = await db.execute(
        select(User).where(User.clerk_id == "clerk_new_user_001")
    )
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.email == "newuser@test.com"
    assert user.name == "New User"
    assert user.role == "user"
    assert user.plan == "free"
    assert user.status == "active"


@pytest.mark.asyncio
async def test_clerk_webhook_user_created_idempotent(
    client: AsyncClient, user: User
):
    """Duplicate user.created webhook doesn't create duplicate user."""
    payload = {
        "type": "user.created",
        "data": {
            "id": user.clerk_id,
            "email_addresses": [{"email_address": user.email}],
            "first_name": "Test",
            "last_name": "User",
        },
    }
    # Send twice
    r1 = await client.post("/api/v1/webhooks/clerk", json=payload)
    r2 = await client.post("/api/v1/webhooks/clerk", json=payload)
    assert r1.status_code == 200
    assert r2.status_code == 200


@pytest.mark.asyncio
async def test_clerk_webhook_user_updated(
    client: AsyncClient, db: AsyncSession, user: User
):
    """user.updated event updates name and email."""
    payload = {
        "type": "user.updated",
        "data": {
            "id": user.clerk_id,
            "email_addresses": [{"email_address": "updated@test.com"}],
            "first_name": "Updated",
            "last_name": "Name",
            "public_metadata": {},
        },
    }
    response = await client.post("/api/v1/webhooks/clerk", json=payload)
    assert response.status_code == 200

    await db.refresh(user)
    assert user.email == "updated@test.com"
    assert user.name == "Updated Name"


@pytest.mark.asyncio
async def test_clerk_webhook_user_updated_plan(
    client: AsyncClient, db: AsyncSession, user: User
):
    """user.updated with metadata.plan upgrades the plan."""
    payload = {
        "type": "user.updated",
        "data": {
            "id": user.clerk_id,
            "email_addresses": [{"email_address": user.email}],
            "public_metadata": {"plan": "enterprise"},
        },
    }
    response = await client.post("/api/v1/webhooks/clerk", json=payload)
    assert response.status_code == 200

    await db.refresh(user)
    assert user.plan == "enterprise"
    assert user.ai_credits_limit == 10000

    # Restore
    user.plan = "pro"
    user.ai_credits_limit = 1000
    await db.commit()


@pytest.mark.asyncio
async def test_clerk_webhook_user_deleted(
    client: AsyncClient, db: AsyncSession, user: User
):
    """user.deleted event suspends the user."""
    payload = {
        "type": "user.deleted",
        "data": {"id": user.clerk_id},
    }
    response = await client.post("/api/v1/webhooks/clerk", json=payload)
    assert response.status_code == 200

    await db.refresh(user)
    assert user.status == "suspended"

    # Restore
    user.status = "active"
    await db.commit()


@pytest.mark.asyncio
async def test_clerk_webhook_unknown_event(client: AsyncClient):
    """Unknown event types are silently ignored."""
    payload = {"type": "some.unknown.event", "data": {}}
    response = await client.post("/api/v1/webhooks/clerk", json=payload)
    assert response.status_code == 200
    assert response.json()["received"] is True
