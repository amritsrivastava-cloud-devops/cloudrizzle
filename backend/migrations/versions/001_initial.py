"""Initial migration — create all tables

Revision ID: 001
Revises: 
Create Date: 2025-04-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("clerk_id", sa.String, nullable=False, unique=True),
        sa.Column("email", sa.String, nullable=False, unique=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("avatar", sa.String, nullable=True),
        sa.Column("role", sa.String, nullable=False, server_default="user"),
        sa.Column("plan", sa.String, nullable=False, server_default="free"),
        sa.Column("status", sa.String, nullable=False, server_default="active"),
        sa.Column("ai_credits_used", sa.Integer, server_default="0"),
        sa.Column("ai_credits_limit", sa.Integer, server_default="50"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("last_active_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_users_clerk_id", "users", ["clerk_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # cloud_accounts
    op.create_table(
        "cloud_accounts",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("user_id", sa.String, sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("provider", sa.String, nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("account_id", sa.String, nullable=False),
        sa.Column("region", sa.String, nullable=False),
        sa.Column("access_type", sa.String, nullable=False),
        sa.Column("credentials_encrypted", JSONB, server_default="{}"),
        sa.Column("status", sa.String, server_default="connected"),
        sa.Column("monthly_cost", sa.Float, server_default="0.0"),
        sa.Column("last_sync_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_cloud_accounts_user_id", "cloud_accounts", ["user_id"])

    # projects
    op.create_table(
        "projects",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("user_id", sa.String, sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("cloud_account_id", sa.String, sa.ForeignKey("cloud_accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("cloud", sa.String, nullable=False),
        sa.Column("environment", sa.String, server_default="production"),
        sa.Column("status", sa.String, server_default="active"),
        sa.Column("resource_count", sa.Integer, server_default="0"),
        sa.Column("monthly_cost", sa.Float, server_default="0.0"),
        sa.Column("terraform_state", JSONB, nullable=True),
        sa.Column("last_deployed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])

    # deployments
    op.create_table(
        "deployments",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("project_id", sa.String, sa.ForeignKey("projects.id", ondelete="CASCADE")),
        sa.Column("user_id", sa.String, sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("version", sa.String, nullable=False),
        sa.Column("environment", sa.String, nullable=False),
        sa.Column("status", sa.String, server_default="queued"),
        sa.Column("terraform_plan", sa.Text, nullable=True),
        sa.Column("terraform_code", sa.Text, nullable=True),
        sa.Column("logs", JSONB, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("triggered_by", sa.String, server_default="user"),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_deployments_project_id", "deployments", ["project_id"])
    op.create_index("ix_deployments_user_id", "deployments", ["user_id"])

    # infra_resources
    op.create_table(
        "infra_resources",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("project_id", sa.String, sa.ForeignKey("projects.id", ondelete="CASCADE")),
        sa.Column("user_id", sa.String, sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("resource_id", sa.String, nullable=False),
        sa.Column("type", sa.String, nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("cloud", sa.String, nullable=False),
        sa.Column("region", sa.String, nullable=False),
        sa.Column("status", sa.String, server_default="active"),
        sa.Column("monthly_cost", sa.Float, server_default="0.0"),
        sa.Column("metadata", JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # templates
    op.create_table(
        "templates",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("cloud", sa.String, nullable=False),
        sa.Column("category", sa.String, nullable=False),
        sa.Column("resources", JSONB, server_default="[]"),
        sa.Column("terraform_code", sa.Text, nullable=False),
        sa.Column("status", sa.String, server_default="published"),
        sa.Column("usage_count", sa.Integer, server_default="0"),
        sa.Column("success_rate", sa.Float, server_default="100.0"),
        sa.Column("is_popular", sa.Boolean, server_default="false"),
        sa.Column("is_new", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String, primary_key=True),
        sa.Column("user_id", sa.String, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String, nullable=False),
        sa.Column("resource_type", sa.String, nullable=False),
        sa.Column("resource_id", sa.String, nullable=True),
        sa.Column("details", JSONB, server_default="{}"),
        sa.Column("ip_address", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("templates")
    op.drop_table("infra_resources")
    op.drop_table("deployments")
    op.drop_table("projects")
    op.drop_table("cloud_accounts")
    op.drop_table("users")
