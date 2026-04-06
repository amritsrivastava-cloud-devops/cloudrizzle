"""Initial migration — create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # organizations
    op.create_table('organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('website', sa.String(500)),
        sa.Column('industry', sa.String(100)),
        sa.Column('team_size', sa.String(50)),
        sa.Column('logo_url', sa.Text()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # users
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('company', sa.String(255)),
        sa.Column('timezone', sa.String(100), nullable=False, server_default='UTC'),
        sa.Column('avatar_url', sa.Text()),
        sa.Column('role', sa.Enum('user', 'admin', name='userrole'), nullable=False, server_default='user'),
        sa.Column('plan', sa.Enum('free', 'pro', 'enterprise', name='userplan'), nullable=False, server_default='free'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('email_verified_at', sa.DateTime()),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True)),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # cloud_accounts
    op.create_table('cloud_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('provider', sa.Enum('aws', 'azure', 'gcp', name='cloudprovider'), nullable=False),
        sa.Column('default_region', sa.String(100)),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_connected', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('encrypted_credentials', sa.Text()),
        sa.Column('credential_type', sa.String(50), nullable=False, server_default='access_key'),
        sa.Column('last_tested_at', sa.DateTime()),
        sa.Column('test_error', sa.Text()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_id', 'name', name='uq_cloud_account_owner_name'),
    )

    # templates
    op.create_table('templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('category', sa.String(100)),
        sa.Column('provider', sa.Enum('aws', 'azure', 'gcp', name='cloudprovider')),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('terraform_code', sa.Text()),
        sa.Column('variables_schema', postgresql.JSON()),
        sa.Column('tags', postgresql.JSON()),
        sa.Column('star_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('use_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True)),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # projects
    op.create_table('projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cloud_account_id', postgresql.UUID(as_uuid=True)),
        sa.Column('template_id', postgresql.UUID(as_uuid=True)),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('slug', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('active', 'deploying', 'paused', 'error', 'archived', name='projectstatus'), nullable=False, server_default='active'),
        sa.Column('environment', sa.Enum('production', 'staging', 'development', name='environment'), nullable=False, server_default='production'),
        sa.Column('provider', sa.Enum('aws', 'azure', 'gcp', name='cloudprovider')),
        sa.Column('region', sa.String(100)),
        sa.Column('terraform_state_key', sa.String(500)),
        sa.Column('last_terraform_output', postgresql.JSON()),
        sa.Column('monthly_cost', sa.Float(), nullable=False, server_default='0'),
        sa.Column('cost_updated_at', sa.DateTime()),
        sa.Column('compute_usage', sa.Float(), nullable=False, server_default='0'),
        sa.Column('storage_usage', sa.Float(), nullable=False, server_default='0'),
        sa.Column('health_score', sa.Float(), nullable=False, server_default='100'),
        sa.Column('tags', postgresql.JSON()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['cloud_account_id'], ['cloud_accounts.id']),
        sa.ForeignKeyConstraint(['template_id'], ['templates.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_id', 'slug', name='uq_project_owner_slug'),
    )
    op.create_index('ix_project_status', 'projects', ['status'])
    op.create_index('ix_projects_slug', 'projects', ['slug'])

    # deployments
    op.create_table('deployments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('triggered_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('deployment_ref', sa.String(100), nullable=False),
        sa.Column('version', sa.String(100)),
        sa.Column('status', sa.Enum('queued', 'running', 'success', 'failed', 'rolled_back', 'cancelled', name='deploymentstatus'), nullable=False, server_default='queued'),
        sa.Column('environment', sa.Enum('production', 'staging', 'development', name='environment'), nullable=False, server_default='production'),
        sa.Column('terraform_plan', sa.Text()),
        sa.Column('terraform_apply', sa.Text()),
        sa.Column('terraform_vars', postgresql.JSON()),
        sa.Column('generated_code', sa.Text()),
        sa.Column('prompt', sa.Text()),
        sa.Column('queued_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('duration_seconds', sa.Integer()),
        sa.Column('error_message', sa.Text()),
        sa.Column('rollback_deployment_id', postgresql.UUID(as_uuid=True)),
        sa.Column('logs', postgresql.JSON()),
        sa.Column('metadata', postgresql.JSON()),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['triggered_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('deployment_ref'),
    )
    op.create_index('ix_deployment_project_status', 'deployments', ['project_id', 'status'])
    op.create_index('ix_deployment_queued_at', 'deployments', ['queued_at'])

    # infra_resources
    op.create_table('infra_resources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('deployment_id', postgresql.UUID(as_uuid=True)),
        sa.Column('resource_type', sa.String(200)),
        sa.Column('resource_name', sa.String(255)),
        sa.Column('resource_id', sa.String(500)),
        sa.Column('provider', sa.Enum('aws', 'azure', 'gcp', name='cloudprovider')),
        sa.Column('region', sa.String(100)),
        sa.Column('status', sa.Enum('creating', 'active', 'updating', 'deleting', 'deleted', 'error', name='infraresourcestatus'), nullable=False, server_default='creating'),
        sa.Column('attributes', postgresql.JSON()),
        sa.Column('monthly_cost', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # cost_records
    op.create_table('cost_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cloud_account_id', postgresql.UUID(as_uuid=True)),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('provider', sa.Enum('aws', 'azure', 'gcp', name='cloudprovider')),
        sa.Column('service_breakdown', postgresql.JSON()),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cost_record_project_period', 'cost_records', ['project_id', 'period_start'])

    # ai_conversations
    op.create_table('ai_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True)),
        sa.Column('title', sa.String(255)),
        sa.Column('messages', postgresql.JSON()),
        sa.Column('generated_terraform', sa.Text()),
        sa.Column('deployment_id', postgresql.UUID(as_uuid=True)),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('ai_conversations')
    op.drop_table('cost_records')
    op.drop_table('infra_resources')
    op.drop_table('deployments')
    op.drop_table('projects')
    op.drop_table('templates')
    op.drop_table('cloud_accounts')
    op.drop_table('users')
    op.drop_table('organizations')
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS userplan")
    op.execute("DROP TYPE IF EXISTS cloudprovider")
    op.execute("DROP TYPE IF EXISTS projectstatus")
    op.execute("DROP TYPE IF EXISTS deploymentstatus")
    op.execute("DROP TYPE IF EXISTS environment")
    op.execute("DROP TYPE IF EXISTS infraresourcestatus")
