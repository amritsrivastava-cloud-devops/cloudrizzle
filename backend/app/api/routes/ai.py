from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.plans import AI_GENERATION_COST, UNLIMITED_CREDITS, apply_plan_defaults, reset_free_credits_if_needed
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.schemas import GenerateRequest, GenerateResponse, ValidateRequest, ValidateResponse
from app.services.ai.generator import generate_infrastructure
import structlog

logger = structlog.get_logger()
router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate", response_model=GenerateResponse)
async def generate_terraform(
    payload: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate Terraform code from natural language prompt."""
    plan_changed = reset_free_credits_if_needed(current_user)
    apply_plan_defaults(current_user)
    if plan_changed:
        await db.commit()

    # Check AI credits
    if (
        current_user.ai_credits_limit != UNLIMITED_CREDITS
        and current_user.ai_credits_used + AI_GENERATION_COST > current_user.ai_credits_limit
    ):
        raise HTTPException(
            status_code=403,
            detail=f"AI credits exhausted ({current_user.ai_credits_limit} credits every 48 hours on Free). Upgrade your plan."
        )

    logger.info("Generating infrastructure",
        user_id=current_user.id,
        cloud=payload.cloud,
        model=payload.model,
    )

    try:
        result = await generate_infrastructure(
            prompt=payload.prompt,
            cloud=payload.cloud,
            environment=payload.environment,
            model=payload.model,
        )

        if current_user.ai_credits_limit != UNLIMITED_CREDITS:
            current_user.ai_credits_used += AI_GENERATION_COST
        await db.commit()

        return GenerateResponse(**result)

    except Exception as e:
        logger.error("Generation failed", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/validate", response_model=ValidateResponse)
async def validate_terraform(
    payload: ValidateRequest,
    current_user: User = Depends(get_current_user),
):
    """Validate Terraform code without running it."""
    from app.services.ai.generator import get_graph, GeneratorState
    import json

    # Quick syntax check using a lightweight validator
    errors = []
    warnings = []

    # Basic checks
    if "terraform {" not in payload.terraform and "resource " not in payload.terraform:
        errors.append("No terraform or resource blocks found")

    if "provider" not in payload.terraform:
        warnings.append("No provider block found — terraform may not know which cloud to use")

    if "tags" not in payload.terraform.lower():
        warnings.append("Resources have no tags — recommended for cost tracking")

    return ValidateResponse(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )


@router.post("/estimate-cost")
async def estimate_cost(
    payload: ValidateRequest,
    current_user: User = Depends(get_current_user),
):
    """Estimate monthly cost of Terraform resources."""
    # Simple cost estimation based on resource types
    # In production, integrate with Infracost API
    terraform = payload.terraform
    cost = 0.0

    resource_costs = {
        "aws_instance": {"t3.micro": 8, "t3.small": 16, "t3.medium": 32, "t3.large": 65},
        "aws_db_instance": {"db.t3.micro": 15, "db.t3.small": 30, "db.t3.medium": 60},
        "aws_lb": 20,
        "aws_nat_gateway": 35,
        "aws_cloudfront_distribution": 5,
        "azurerm_kubernetes_cluster": 150,
        "azurerm_linux_virtual_machine": 50,
        "google_container_cluster": 100,
        "google_cloud_run_service": 10,
    }

    for resource_type, base_cost in resource_costs.items():
        if resource_type in terraform:
            if isinstance(base_cost, dict):
                cost += list(base_cost.values())[1]  # Default to medium
            else:
                cost += base_cost

    return {"estimated_monthly_cost": round(cost, 2), "currency": "USD"}
