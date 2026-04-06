"""
CloudRizzle — All SQLAlchemy ORM models
Tables: users, projects, cloud_accounts, deployments, infra_resources, templates, cost_records
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, DateTime,
    ForeignKey, Enum as SAEnum, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base
import enum


# ─── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"

class UserPlan(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class CloudProvider(str, enum.Enum):
    AWS = "aws"
    AZURE = "azure"
    GCP = "gcp"

class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    DEPLOYING = "deploying"
    PAUSED = "paused"
    ERROR = "error"
    ARCHIVED = "archived"

class DeploymentStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"

class Environment(str, enum.Enum):
    PRODUCTION = "production"
    STAGING = "staging"
    DEVELOPMENT = "development"

class InfraResourceStatus(str, enum.Enum):
    CREATING = "creating"
    ACTIVE = "active"
    UPDATING = "updating"
    DELETING = "deleting"
    DELETED = "deleted"
    ERROR = "error"


# ─── Users ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255))
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)

    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.USER)
    plan: Mapped[UserPlan] = mapped_column(SAEnum(UserPlan), default=UserPlan.FREE)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationships
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    cloud_accounts: Mapped[list["CloudAccount"]] = relationship("CloudAccount", back_populates="owner", cascade="all, delete-orphan")
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    organization: Mapped[Optional["Organization"]] = relationship("Organization", back_populates="members")

    def __repr__(self):
        return f"<User {self.email} role={self.role}>"


# ─── Organizations ───────────────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(500))
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    team_size: Mapped[Optional[str]] = mapped_column(String(50))
    logo_url: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members: Mapped[list["User"]] = relationship("User", back_populates="organization")


# ─── Cloud Accounts ──────────────────────────────────────────────────────────

class CloudAccount(Base):
    __tablename__ = "cloud_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[CloudProvider] = mapped_column(SAEnum(CloudProvider), nullable=False)
    default_region: Mapped[Optional[str]] = mapped_column(String(100))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=False)

    # Encrypted credentials (AES-256)
    encrypted_credentials: Mapped[Optional[str]] = mapped_column(Text)  # JSON blob, encrypted
    credential_type: Mapped[str] = mapped_column(String(50), default="access_key")  # access_key | role | service_account

    last_tested_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    test_error: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="cloud_accounts")
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="cloud_account")

    __table_args__ = (
        UniqueConstraint("owner_id", "name", name="uq_cloud_account_owner_name"),
    )


# ─── Templates ───────────────────────────────────────────────────────────────

class Template(Base):
    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(100))
    provider: Mapped[CloudProvider] = mapped_column(SAEnum(CloudProvider))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    terraform_code: Mapped[str] = mapped_column(Text)  # Base Terraform HCL
    variables_schema: Mapped[Optional[dict]] = mapped_column(JSON)  # JSON Schema for variables
    tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    star_count: Mapped[int] = mapped_column(Integer, default=0)
    use_count: Mapped[int] = mapped_column(Integer, default=0)

    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    projects: Mapped[list["Project"]] = relationship("Project", back_populates="template")


# ─── Projects ────────────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cloud_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cloud_accounts.id"))
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("templates.id"))

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[ProjectStatus] = mapped_column(SAEnum(ProjectStatus), default=ProjectStatus.ACTIVE)
    environment: Mapped[Environment] = mapped_column(SAEnum(Environment), default=Environment.PRODUCTION)

    provider: Mapped[Optional[CloudProvider]] = mapped_column(SAEnum(CloudProvider))
    region: Mapped[Optional[str]] = mapped_column(String(100))

    # Terraform state
    terraform_state_key: Mapped[Optional[str]] = mapped_column(String(500))
    last_terraform_output: Mapped[Optional[dict]] = mapped_column(JSON)

    # Cost tracking
    monthly_cost: Mapped[float] = mapped_column(Float, default=0.0)
    cost_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Health metrics (cached from last deployment)
    compute_usage: Mapped[float] = mapped_column(Float, default=0.0)
    storage_usage: Mapped[float] = mapped_column(Float, default=0.0)
    health_score: Mapped[float] = mapped_column(Float, default=100.0)

    tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="projects")
    cloud_account: Mapped[Optional["CloudAccount"]] = relationship("CloudAccount", back_populates="projects")
    template: Mapped[Optional["Template"]] = relationship("Template", back_populates="projects")
    deployments: Mapped[list["Deployment"]] = relationship("Deployment", back_populates="project", cascade="all, delete-orphan")
    infra_resources: Mapped[list["InfraResource"]] = relationship("InfraResource", back_populates="project", cascade="all, delete-orphan")
    cost_records: Mapped[list["CostRecord"]] = relationship("CostRecord", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("owner_id", "slug", name="uq_project_owner_slug"),
        Index("ix_project_status", "status"),
    )


# ─── Deployments ─────────────────────────────────────────────────────────────

class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    triggered_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Display ID like DEP-17668132026425-802LN
    deployment_ref: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    version: Mapped[Optional[str]] = mapped_column(String(100))

    status: Mapped[DeploymentStatus] = mapped_column(SAEnum(DeploymentStatus), default=DeploymentStatus.QUEUED)
    environment: Mapped[Environment] = mapped_column(SAEnum(Environment), default=Environment.PRODUCTION)

    # Terraform
    terraform_plan: Mapped[Optional[str]] = mapped_column(Text)   # terraform plan output
    terraform_apply: Mapped[Optional[str]] = mapped_column(Text)  # terraform apply output
    terraform_vars: Mapped[Optional[dict]] = mapped_column(JSON)
    generated_code: Mapped[Optional[str]] = mapped_column(Text)   # AI-generated HCL

    # AI prompt that triggered this deployment
    prompt: Mapped[Optional[str]] = mapped_column(Text)

    # Timing
    queued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)

    error_message: Mapped[Optional[str]] = mapped_column(Text)
    rollback_deployment_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("deployments.id"))

    logs: Mapped[Optional[list]] = mapped_column(JSON, default=list)  # streaming log lines
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON)

    project: Mapped["Project"] = relationship("Project", back_populates="deployments")

    __table_args__ = (
        Index("ix_deployment_project_status", "project_id", "status"),
        Index("ix_deployment_queued_at", "queued_at"),
    )


# ─── Infrastructure Resources ─────────────────────────────────────────────────

class InfraResource(Base):
    __tablename__ = "infra_resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    deployment_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("deployments.id"))

    # Terraform resource identity
    resource_type: Mapped[str] = mapped_column(String(200))   # e.g. aws_instance
    resource_name: Mapped[str] = mapped_column(String(255))   # Terraform name
    resource_id: Mapped[Optional[str]] = mapped_column(String(500))  # Cloud resource ID
    provider: Mapped[CloudProvider] = mapped_column(SAEnum(CloudProvider))
    region: Mapped[Optional[str]] = mapped_column(String(100))

    status: Mapped[InfraResourceStatus] = mapped_column(SAEnum(InfraResourceStatus), default=InfraResourceStatus.CREATING)
    attributes: Mapped[Optional[dict]] = mapped_column(JSON)  # Resource attributes from TF state

    monthly_cost: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="infra_resources")


# ─── Cost Records ─────────────────────────────────────────────────────────────

class CostRecord(Base):
    __tablename__ = "cost_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    cloud_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cloud_accounts.id"))

    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    provider: Mapped[CloudProvider] = mapped_column(SAEnum(CloudProvider))

    service_breakdown: Mapped[Optional[dict]] = mapped_column(JSON)  # {EC2: 856, S3: 120, ...}

    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project: Mapped["Project"] = relationship("Project", back_populates="cost_records")

    __table_args__ = (
        Index("ix_cost_record_project_period", "project_id", "period_start"),
    )


# ─── AI Conversations ─────────────────────────────────────────────────────────

class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"))

    title: Mapped[Optional[str]] = mapped_column(String(255))
    messages: Mapped[list] = mapped_column(JSON, default=list)  # [{role, content, ts}]
    generated_terraform: Mapped[Optional[str]] = mapped_column(Text)
    deployment_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("deployments.id"))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
