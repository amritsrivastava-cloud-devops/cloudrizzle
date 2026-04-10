import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Integer, Float, Boolean, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


# ─── Enums ────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    enterprise = "enterprise"


class UserStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class CloudProvider(str, enum.Enum):
    aws = "aws"
    azure = "azure"
    gcp = "gcp"


class ProjectStatus(str, enum.Enum):
    active = "active"
    error = "error"
    queued = "queued"
    stopped = "stopped"


class Environment(str, enum.Enum):
    production = "production"
    staging = "staging"
    development = "development"


class DeploymentStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    success = "success"
    failed = "failed"
    pending = "pending"


class ResourceStatus(str, enum.Enum):
    running = "running"
    stopped = "stopped"
    error = "error"
    pending = "pending"
    active = "active"
    available = "available"
    degraded = "degraded"


# ─── User ─────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    clerk_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar: Mapped[str | None] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    role: Mapped[str] = mapped_column(String, default="user")
    plan: Mapped[str] = mapped_column(String, default="free")
    status: Mapped[str] = mapped_column(String, default="active")
    ai_credits_used: Mapped[int] = mapped_column(Integer, default=0)
    ai_credits_limit: Mapped[int] = mapped_column(Integer, default=100)
    credits_reset_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_active_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    cloud_accounts: Mapped[list["CloudAccount"]] = relationship("CloudAccount", back_populates="user", cascade="all, delete-orphan")


# ─── CloudAccount ─────────────────────────────────────────────
class CloudAccount(Base):
    __tablename__ = "cloud_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String)  # aws | azure | gcp
    name: Mapped[str] = mapped_column(String)
    account_id: Mapped[str] = mapped_column(String)
    region: Mapped[str] = mapped_column(String)
    access_type: Mapped[str] = mapped_column(String)  # iam_role | service_principal | service_account
    credentials_encrypted: Mapped[dict] = mapped_column(JSONB, default=dict)  # Encrypted creds
    status: Mapped[str] = mapped_column(String, default="connected")
    monthly_cost: Mapped[float] = mapped_column(Float, default=0.0)
    last_sync_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="cloud_accounts")


# ─── Project ──────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    cloud_account_id: Mapped[str | None] = mapped_column(String, ForeignKey("cloud_accounts.id"), nullable=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cloud: Mapped[str] = mapped_column(String)
    environment: Mapped[str] = mapped_column(String, default="production")
    status: Mapped[str] = mapped_column(String, default="active")
    resource_count: Mapped[int] = mapped_column(Integer, default=0)
    monthly_cost: Mapped[float] = mapped_column(Float, default=0.0)
    terraform_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    last_deployed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    deployments: Mapped[list["Deployment"]] = relationship("Deployment", back_populates="project", cascade="all, delete-orphan")
    resources: Mapped[list["InfraResource"]] = relationship("InfraResource", back_populates="project", cascade="all, delete-orphan")


# ─── Deployment ───────────────────────────────────────────────
class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    version: Mapped[str] = mapped_column(String)
    environment: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="queued")
    terraform_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    terraform_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    logs: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    triggered_by: Mapped[str] = mapped_column(String, default="user")  # user | ai | api
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="deployments")


# ─── InfraResource ────────────────────────────────────────────
class InfraResource(Base):
    __tablename__ = "infra_resources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"), index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    resource_id: Mapped[str] = mapped_column(String)  # Cloud provider resource ID
    type: Mapped[str] = mapped_column(String)          # EC2, RDS, AKS, etc.
    name: Mapped[str] = mapped_column(String)
    cloud: Mapped[str] = mapped_column(String)
    region: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="active")
    monthly_cost: Mapped[float] = mapped_column(Float, default=0.0)
    resource_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="resources")


# ─── Template ─────────────────────────────────────────────────
class Template(Base):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    cloud: Mapped[str] = mapped_column(String)         # aws | azure | gcp | multi
    category: Mapped[str] = mapped_column(String)
    resources: Mapped[list] = mapped_column(JSONB, default=list)
    terraform_code: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="published")
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    success_rate: Mapped[float] = mapped_column(Float, default=100.0)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ─── AuditLog ─────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String)
    resource_type: Mapped[str] = mapped_column(String)
    resource_id: Mapped[str | None] = mapped_column(String, nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
