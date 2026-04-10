from datetime import datetime, timedelta
from app.models.user import User

FREE_PLAN_PROJECT_LIMIT = 2
FREE_PLAN_CREDITS = 100
AI_GENERATION_COST = 10
FREE_PLAN_RESET_HOURS = 48
UNLIMITED_CREDITS = -1

PLAN_DETAILS = {
    "free": {
        "name": "Free",
        "project_limit": FREE_PLAN_PROJECT_LIMIT,
        "ai_credits_limit": FREE_PLAN_CREDITS,
        "support": "Community support",
    },
    "pro": {
        "name": "Pro",
        "project_limit": None,
        "ai_credits_limit": UNLIMITED_CREDITS,
        "support": "Priority support",
    },
    "enterprise": {
        "name": "Enterprise",
        "project_limit": None,
        "ai_credits_limit": UNLIMITED_CREDITS,
        "support": "24/7 support assistance",
    },
}


def apply_plan_defaults(user: User) -> None:
    plan = PLAN_DETAILS.get(user.plan, PLAN_DETAILS["free"])
    user.ai_credits_limit = plan["ai_credits_limit"]
    if user.plan == "free" and user.credits_reset_at is None:
        user.credits_reset_at = datetime.utcnow() + timedelta(hours=FREE_PLAN_RESET_HOURS)
    if user.plan in {"pro", "enterprise"}:
        user.ai_credits_used = 0
        user.credits_reset_at = None


def reset_free_credits_if_needed(user: User) -> bool:
    if user.plan != "free":
        return False

    now = datetime.utcnow()
    if user.credits_reset_at is None:
        user.ai_credits_used = 0
        user.ai_credits_limit = FREE_PLAN_CREDITS
        user.credits_reset_at = now + timedelta(hours=FREE_PLAN_RESET_HOURS)
        return True

    if now >= user.credits_reset_at:
        user.ai_credits_used = 0
        user.ai_credits_limit = FREE_PLAN_CREDITS
        user.credits_reset_at = now + timedelta(hours=FREE_PLAN_RESET_HOURS)
        return True

    return False
