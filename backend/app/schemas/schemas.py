from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────
class CloudProvider(str, Enum):
    aws = "aws"
    azure = "azure"
    gcp = "gcp"


class Environment(str, Enum):
    production = "production"
    staging = "staging"
    development = "development"


class DeploymentStatus(str, Enum):
    queued = "queued"
    running = "running"
    success = "success"
    failed = "failed"
    pending = "pending"


# ─── Common ───────────────────────────────────────────────────
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class PaginatedResponse(BaseModel):
    data: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── User Schemas ─────────────────────────────────────────────
class UserOut(BaseModel):
    id: str
    clerk_id: str
    email: str
    name: str
    avatar: Optional[str] = None
    role: str
    plan: str
    status: str
    ai_credits_used: int
    ai_credits_limit: int
    created_at: datetime
    last_active_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[str] = None


# ─── Cloud Account Schemas ────────────────────────────────────
class CloudAccountCreate(BaseModel):
    provider: CloudProvider
    name: str
    account_id: str
    region: str
    access_type: str
    credentials: dict  # Will be encrypted before storage


class CloudAccountOut(BaseModel):
    id: str
    provider: str
    name: str
    account_id: str
    region: str
    access_type: str
    status: str
    monthly_cost: float
    last_sync_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Project Schemas ──────────────────────────────────────────
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    cloud: CloudProvider
    environment: Environment = Environment.production
    cloud_account_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    environment: Optional[Environment] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    cloud: str
    environment: str
    status: str
    resource_count: int
    monthly_cost: float
    last_deployed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Deployment Schemas ───────────────────────────────────────
class DeploymentCreate(BaseModel):
    project_id: str
    terraform_code: str
    environment: Environment = Environment.production
    triggered_by: str = "user"


class DeploymentOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    version: str
    environment: str
    status: str
    triggered_by: str
    duration_seconds: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeploymentWithLogs(DeploymentOut):
    logs: Optional[List[str]] = None
    terraform_plan: Optional[str] = None


# ─── AI Generation Schemas ────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=4000)
    cloud: CloudProvider = CloudProvider.aws
    environment: Environment = Environment.production
    model: str = "claude-3-5-sonnet-20240620"


class GenerateResponse(BaseModel):
    id: str
    terraform: str
    resources: List[str]
    estimated_cost: float
    validation_passed: bool
    warnings: List[str] = []
    model_used: str


class ValidateRequest(BaseModel):
    terraform: str


class ValidateResponse(BaseModel):
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []


# ─── Infra Schemas ────────────────────────────────────────────
class PlanRequest(BaseModel):
    terraform: str


class PlanResponse(BaseModel):
    plan_id: str
    plan_output: str
    resources_to_add: int
    resources_to_change: int
    resources_to_destroy: int
    estimated_cost: float


class ApplyRequest(BaseModel):
    plan_id: str


class InfraResourceOut(BaseModel):
    id: str
    resource_id: str
    type: str
    name: str
    cloud: str
    region: str
    status: str
    monthly_cost: float
    metadata: dict = Field(validation_alias="resource_metadata", serialization_alias="metadata")
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Template Schemas ─────────────────────────────────────────
class TemplateOut(BaseModel):
    id: str
    name: str
    description: str
    cloud: str
    category: str
    resources: List[str]
    status: str
    usage_count: int
    success_rate: float
    is_popular: bool
    is_new: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateWithCode(TemplateOut):
    terraform_code: str


# ─── Monitoring Schemas ───────────────────────────────────────
class MetricPoint(BaseModel):
    timestamp: str
    value: float


class UptimeDay(BaseModel):
    date: str
    status: str


class PlatformMetrics(BaseModel):
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    network_in_mbps: float
    network_out_mbps: float
    api_latency_ms: float
    active_connections: int
    queue_depth: int
    uptime_percent: float


# ─── Cost Schemas ─────────────────────────────────────────────
class CostBreakdown(BaseModel):
    project_id: str
    project_name: str
    cloud: str
    cost: float
    percentage: float


class CostSummary(BaseModel):
    this_month: float
    last_month: float
    budget: float
    forecast: float
    by_project: List[CostBreakdown]
    by_provider: List[dict]


# ─── Admin Schemas ────────────────────────────────────────────
class AdminUserOut(UserOut):
    project_count: int = 0
    deployment_count: int = 0
    total_spend: float = 0.0


class AdminStatsOut(BaseModel):
    total_users: int
    active_users_today: int
    suspended_users: int
    enterprise_users: int
    total_projects: int
    total_deployments: int
    failed_deployments_30d: int
    mrr: float
    arr: float
    churn_rate: float
    arpu: float
    by_plan: dict[str, int]
    by_cloud: dict[str, int]
