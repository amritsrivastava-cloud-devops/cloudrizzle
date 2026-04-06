"""
Pydantic v2 schemas — request/response validation for all endpoints
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from app.models.models import (
    UserRole, UserPlan, CloudProvider, ProjectStatus,
    DeploymentStatus, Environment, InfraResourceStatus
)


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    full_name: str = Field(min_length=2, max_length=255)
    company: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds

class RefreshRequest(BaseModel):
    refresh_token: str


# ─── Users ───────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    company: Optional[str] = None
    timezone: str = "UTC"
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(min_length=8)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    timezone: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(UserBase):
    id: UUID
    role: UserRole
    plan: UserPlan
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int


# ─── Cloud Accounts ───────────────────────────────────────────────────────────

class CloudAccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    provider: CloudProvider
    default_region: Optional[str] = None
    is_default: bool = False
    credentials: dict  # raw credentials — will be encrypted before storage

class CloudAccountUpdate(BaseModel):
    name: Optional[str] = None
    default_region: Optional[str] = None
    is_default: Optional[bool] = None
    credentials: Optional[dict] = None

class CloudAccountResponse(BaseModel):
    id: UUID
    name: str
    provider: CloudProvider
    default_region: Optional[str]
    is_default: bool
    is_connected: bool
    credential_type: str
    last_tested_at: Optional[datetime]
    test_error: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Templates ───────────────────────────────────────────────────────────────

class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: str
    category: str
    provider: CloudProvider
    is_public: bool
    is_featured: bool
    variables_schema: Optional[dict]
    tags: Optional[List[str]]
    star_count: int
    use_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Projects ────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    cloud_account_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    environment: Environment = Environment.PRODUCTION
    provider: Optional[CloudProvider] = None
    region: Optional[str] = None
    tags: List[str] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    environment: Optional[Environment] = None
    tags: Optional[List[str]] = None

class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    slug: str
    status: ProjectStatus
    environment: Environment
    provider: Optional[CloudProvider]
    region: Optional[str]
    monthly_cost: float
    compute_usage: float
    storage_usage: float
    health_score: float
    tags: Optional[List[str]]
    cloud_account_id: Optional[UUID]
    template_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
    active: int
    deploying: int
    paused: int


# ─── Deployments ─────────────────────────────────────────────────────────────

class DeploymentCreate(BaseModel):
    project_id: UUID
    environment: Environment = Environment.PRODUCTION
    prompt: Optional[str] = None          # Natural language prompt
    terraform_vars: Optional[dict] = None
    version: Optional[str] = None

class DeploymentApprove(BaseModel):
    deployment_id: UUID

class DeploymentResponse(BaseModel):
    id: UUID
    deployment_ref: str
    project_id: UUID
    version: Optional[str]
    status: DeploymentStatus
    environment: Environment
    prompt: Optional[str]
    terraform_plan: Optional[str]
    generated_code: Optional[str]
    duration_seconds: Optional[int]
    error_message: Optional[str]
    queued_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}

class DeploymentListResponse(BaseModel):
    deployments: List[DeploymentResponse]
    total: int
    live: int
    in_progress: int
    failed: int


# ─── Infra Resources ─────────────────────────────────────────────────────────

class InfraResourceResponse(BaseModel):
    id: UUID
    resource_type: str
    resource_name: str
    resource_id: Optional[str]
    provider: CloudProvider
    region: Optional[str]
    status: InfraResourceStatus
    monthly_cost: float
    attributes: Optional[dict]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── AI ──────────────────────────────────────────────────────────────────────

class AIPromptRequest(BaseModel):
    prompt: str = Field(min_length=5, max_length=2000)
    project_id: Optional[UUID] = None
    cloud_provider: Optional[CloudProvider] = None
    region: Optional[str] = None
    context: Optional[dict] = None  # extra metadata

class AIPromptResponse(BaseModel):
    conversation_id: UUID
    message: str
    generated_terraform: Optional[str]
    deployment_preview: Optional[dict]  # resources that will be created
    requires_approval: bool = True

class AIMessage(BaseModel):
    role: str  # user | assistant
    content: str
    timestamp: datetime


# ─── Costs ───────────────────────────────────────────────────────────────────

class CostSummaryResponse(BaseModel):
    current_monthly: float
    projected_monthly: float
    potential_savings: float
    alert_count: int
    breakdown_by_service: dict
    breakdown_by_provider: dict
    trend: List[dict]  # [{month, actual, projected}]

class CostRecordResponse(BaseModel):
    id: UUID
    project_id: UUID
    period_start: datetime
    period_end: datetime
    amount: float
    currency: str
    provider: CloudProvider
    service_breakdown: Optional[dict]

    model_config = {"from_attributes": True}


# ─── Monitoring ──────────────────────────────────────────────────────────────

class MonitoringResponse(BaseModel):
    system_status: str
    services_healthy: int
    services_total: int
    avg_uptime: float
    active_alerts: int
    resource_utilization: List[dict]
    response_latency: List[dict]
    services: List[dict]
    recent_alerts: List[dict]


# ─── Admin ───────────────────────────────────────────────────────────────────

class AdminStatsResponse(BaseModel):
    total_users: int
    total_projects: int
    total_revenue: float
    pending_payments: int
    total_deployments: int

class UserRoleUpdate(BaseModel):
    role: UserRole

class UserPlanUpdate(BaseModel):
    plan: UserPlan


# ─── Generic ─────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=20, ge=1, le=100)
