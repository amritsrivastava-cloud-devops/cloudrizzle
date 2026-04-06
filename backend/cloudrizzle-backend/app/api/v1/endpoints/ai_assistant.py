"""
AI Assistant endpoints — natural language to infrastructure
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID, uuid4
from datetime import datetime

from app.db.database import get_db
from app.models.models import User, AIConversation
from app.schemas.schemas import AIPromptRequest, AIPromptResponse, MessageResponse
from app.api.v1.deps import get_current_user
from app.services.ai_service import generate_terraform_from_prompt, get_ai_recommendations

router = APIRouter(prefix="/ai", tags=["ai-assistant"])


@router.post("/prompt", response_model=AIPromptResponse)
async def prompt_ai(
    payload: AIPromptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        hcl_code, resources = await generate_terraform_from_prompt(
            prompt=payload.prompt,
            cloud_provider=payload.cloud_provider.value if payload.cloud_provider else "aws",
            region=payload.region,
            context=payload.context,
        )

        # Save conversation
        conv = AIConversation(
            user_id=current_user.id,
            project_id=payload.project_id,
            title=payload.prompt[:80],
            messages=[
                {"role": "user", "content": payload.prompt, "ts": datetime.utcnow().isoformat()},
                {"role": "assistant", "content": f"Generated Terraform for: {payload.prompt}", "ts": datetime.utcnow().isoformat()},
            ],
            generated_terraform=hcl_code,
        )
        db.add(conv)
        await db.flush()

        return AIPromptResponse(
            conversation_id=conv.id,
            message=f"I've generated Terraform infrastructure for your request. Review the plan before deploying.",
            generated_terraform=hcl_code,
            deployment_preview={"resources": resources},
            requires_approval=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations")
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recs = await get_ai_recommendations(
        cloud_accounts=[],
        projects=[],
        cost_data={"total": 1412.75},
    )
    return {"recommendations": recs}


@router.get("/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.updated_at.desc())
        .limit(20)
    )
    convs = result.scalars().all()
    return {"conversations": [
        {"id": c.id, "title": c.title, "created_at": c.created_at}
        for c in convs
    ]}
