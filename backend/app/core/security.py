from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from app.core.config import settings
from app.core.plans import apply_plan_defaults
from app.models.user import User
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import structlog

logger = structlog.get_logger()
bearer_scheme = HTTPBearer(auto_error=False)

CLERK_JWKS_URL = "https://api.clerk.com/v1/jwks"
CLERK_USERS_URL = "https://api.clerk.com/v1/users"
_jwks_cache: dict = {}


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    return email.lower() in {allowed.lower() for allowed in settings.ADMIN_EMAILS}


def extract_user_metadata(claims: dict) -> dict:
    metadata = claims.get("metadata")
    if isinstance(metadata, dict):
        return metadata
    public_metadata = claims.get("public_metadata")
    if isinstance(public_metadata, dict):
        return public_metadata
    return {}


def extract_primary_email(clerk_user: dict) -> str:
    email_addresses = clerk_user.get("email_addresses") or []
    for email in email_addresses:
        value = email.get("email_address")
        if value:
            return value
    return ""


def parse_clerk_datetime(value: int | float | str | None) -> datetime | None:
    if value in (None, ""):
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    if numeric > 1_000_000_000_000:
        numeric /= 1000

    return datetime.utcfromtimestamp(numeric)


async def fetch_clerk_user(clerk_user_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"}
        response = await client.get(f"{CLERK_USERS_URL}/{clerk_user_id}", headers=headers)
        response.raise_for_status()
        return response.json()


async def get_or_create_local_user(
    db: AsyncSession,
    *,
    clerk_id: str,
    email: str,
    name: str,
    role: str,
    plan: str,
) -> User:
    result = await db.execute(
        select(User).where((User.clerk_id == clerk_id) | (User.email == email))
    )
    user = result.scalar_one_or_none()
    if user:
        changed = False
        if user.clerk_id != clerk_id:
            user.clerk_id = clerk_id
            changed = True
        if user.role != role:
            user.role = role
            changed = True
        if user.plan != plan:
            user.plan = plan
            changed = True
        if user.name != name:
            user.name = name
            changed = True
        first_name, _, last_name = name.partition(" ")
        if user.first_name != (first_name or None):
            user.first_name = first_name or None
            changed = True
        if user.last_name != (last_name or None):
            user.last_name = last_name or None
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
            await db.commit()
            await db.refresh(user)
        return user

    user = User(
        clerk_id=clerk_id,
        email=email,
        name=name,
        first_name=name.partition(" ")[0] or None,
        last_name=name.partition(" ")[2] or None,
        role=role,
        plan=plan,
        status="active",
    )
    apply_plan_defaults(user)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_jwks() -> dict:
    """Fetch Clerk JWKS (JSON Web Key Set) for token verification."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"}
        resp = await client.get(CLERK_JWKS_URL, headers=headers)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


async def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk JWT and return its claims."""
    try:
        jwks = await get_jwks()
        # Decode without verification first to get the key ID
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")

        # Find matching key
        key = next((k for k in jwks.get("keys", []) if k["kid"] == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token: key not found")

        # Verify and decode
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return claims

    except JWTError as e:
        logger.error("JWT verification failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_local_admin_auth: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Get current authenticated user from Clerk token."""
    if (
        settings.APP_ENV == "development"
        and x_local_admin_auth == settings.LOCAL_ADMIN_SESSION_VALUE
    ):
        return await get_or_create_local_user(
            db,
            clerk_id="local-admin-session",
            email="admin@cloudrizzle.dev",
            name="Admin",
            role="admin",
            plan="enterprise",
        )

    if settings.BACKEND_BYPASS_AUTH and credentials is None:
        return await get_or_create_local_user(
            db,
            clerk_id="local-dev-user",
            email="local-user@cloudrizzle.dev",
            name="Local User",
            role="user",
            plan="pro",
        )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    claims = await verify_clerk_token(token)

    clerk_user_id = claims.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token: no user ID")

    email = claims.get("email", "") or claims.get("email_address", "")
    first_name = claims.get("first_name", "") or ""
    last_name = claims.get("last_name", "") or ""
    name = f"{first_name} {last_name}".strip()
    metadata = extract_user_metadata(claims)

    if not email or not name:
        try:
            clerk_user = await fetch_clerk_user(clerk_user_id)
            email = email or extract_primary_email(clerk_user)
            first_name = first_name or clerk_user.get("first_name", "") or ""
            last_name = last_name or clerk_user.get("last_name", "") or ""
            name = f"{first_name} {last_name}".strip() or email
            metadata = extract_user_metadata(clerk_user) or metadata
        except Exception as exc:
            logger.warning("Failed to fetch Clerk user profile", clerk_user_id=clerk_user_id, error=str(exc))
    else:
        clerk_user = None

    created_at = None
    last_active_at = None
    if 'clerk_user' in locals() and clerk_user:
        created_at = parse_clerk_datetime(clerk_user.get("created_at") or clerk_user.get("createdAt"))
        last_active_at = parse_clerk_datetime(
            clerk_user.get("last_active_at")
            or clerk_user.get("lastActiveAt")
            or clerk_user.get("last_sign_in_at")
            or clerk_user.get("lastSignInAt")
        )

    # Find or create user in our DB
    result = await db.execute(select(User).where(User.clerk_id == clerk_user_id))
    user = result.scalar_one_or_none()

    if not user and email:
        email_result = await db.execute(select(User).where(User.email == email))
        user = email_result.scalar_one_or_none()

    if not user:
        # Auto-create user on first login
        role = metadata.get("role") if metadata.get("role") in {"user", "admin"} else "user"
        plan = metadata.get("plan") if metadata.get("plan") in {"free", "pro", "enterprise"} else "free"
        user = User(
            clerk_id=clerk_user_id,
            email=email,
            name=name or email,
            first_name=first_name or None,
            last_name=last_name or None,
            role=role,
            plan=plan,
            status="active",
            created_at=created_at or datetime.utcnow(),
            last_active_at=last_active_at or datetime.utcnow(),
        )
        apply_plan_defaults(user)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        changed = False
        if user.clerk_id != clerk_user_id:
            user.clerk_id = clerk_user_id
            changed = True
        if email and user.email != email:
            user.email = email
            changed = True
        if name and user.name != name:
            user.name = name
            changed = True
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed = True
        if last_name and user.last_name != last_name:
            user.last_name = last_name
            changed = True
        if created_at and user.created_at != created_at:
            user.created_at = created_at
            changed = True
        if last_active_at and user.last_active_at != last_active_at:
            user.last_active_at = last_active_at
            changed = True
        if metadata.get("role") in {"user", "admin"} and user.role != metadata.get("role"):
            user.role = metadata["role"]
            changed = True
        if metadata.get("plan") in {"free", "pro", "enterprise"} and user.plan != metadata.get("plan"):
            user.plan = metadata["plan"]
            apply_plan_defaults(user)
            changed = True
        if changed:
            await db.commit()
            await db.refresh(user)

    if user.status == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended")

    if is_admin_email(user.email) and user.role != "admin":
        user.role = "admin"
        user.plan = "enterprise"
        apply_plan_defaults(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_admin_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Require admin role."""
    if settings.BACKEND_BYPASS_AUTH:
        return await get_or_create_local_user(
            db,
            clerk_id="local-dev-admin",
            email="local-admin@cloudrizzle.dev",
            name="Admin User",
            role="admin",
            plan="enterprise",
        )

    if current_user.role != "admin" and not is_admin_email(current_user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    if current_user.role != "admin":
        current_user.role = "admin"
        current_user.plan = "enterprise"
        apply_plan_defaults(current_user)
        await db.commit()
        await db.refresh(current_user)
    return current_user
