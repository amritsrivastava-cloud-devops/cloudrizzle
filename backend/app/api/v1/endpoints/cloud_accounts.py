from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import json
from datetime import datetime

from app.db.database import get_db
from app.models.models import User, CloudAccount
from app.schemas.schemas import (
    CloudAccountCreate, CloudAccountUpdate,
    CloudAccountResponse, MessageResponse
)
from app.api.v1.deps import get_current_user
from app.core.security import encrypt_credential, decrypt_credential
from app.services.cloud_connector import test_cloud_connection

router = APIRouter(prefix="/cloud-accounts", tags=["cloud-accounts"])


@router.post("", response_model=CloudAccountResponse, status_code=201)
async def create_cloud_account(
    payload: CloudAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # If set as default, unset other defaults for same provider
    if payload.is_default:
        existing = await db.execute(
            select(CloudAccount).where(
                CloudAccount.owner_id == current_user.id,
                CloudAccount.provider == payload.provider,
                CloudAccount.is_default == True,
            )
        )
        for acc in existing.scalars().all():
            acc.is_default = False

    # Encrypt credentials
    encrypted = encrypt_credential(json.dumps(payload.credentials))

    account = CloudAccount(
        owner_id=current_user.id,
        name=payload.name,
        provider=payload.provider,
        default_region=payload.default_region,
        is_default=payload.is_default,
        encrypted_credentials=encrypted,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


@router.get("", response_model=list[CloudAccountResponse])
async def list_cloud_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CloudAccount).where(CloudAccount.owner_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{account_id}", response_model=CloudAccountResponse)
async def get_cloud_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CloudAccount).where(
            CloudAccount.id == account_id,
            CloudAccount.owner_id == current_user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    return account


@router.post("/{account_id}/test", response_model=MessageResponse)
async def test_connection(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CloudAccount).where(
            CloudAccount.id == account_id,
            CloudAccount.owner_id == current_user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")

    # Decrypt and test
    try:
        creds = json.loads(decrypt_credential(account.encrypted_credentials))
        ok, error = await test_cloud_connection(account.provider, creds, account.default_region)
        account.is_connected = ok
        account.last_tested_at = datetime.utcnow()
        account.test_error = error if not ok else None
        if ok:
            return MessageResponse(message="Connection successful")
        raise HTTPException(status_code=400, detail=f"Connection failed: {error}")
    except Exception as e:
        account.is_connected = False
        account.test_error = str(e)
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{account_id}", response_model=MessageResponse)
async def delete_cloud_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CloudAccount).where(
            CloudAccount.id == account_id,
            CloudAccount.owner_id == current_user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")

    await db.delete(account)
    return MessageResponse(message="Cloud account deleted")
