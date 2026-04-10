"""Shared pytest fixtures for CloudRizzle backend tests."""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.core.database import Base, get_db
from app.models.user import User, Project, Deployment, Template

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:testpass@localhost:5432/cloudrizzle_test"

test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture()
async def db_session():
    async with test_engine.begin() as conn:
        async with TestSessionLocal(bind=conn) as session:
            yield session
            await session.rollback()


@pytest_asyncio.fixture()
async def client(db_session):
    async def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def test_user(db_session):
    user = User(id="test-user-id", clerk_id="clerk_test_user", email="test@cr.com",
                name="Test User", role="user", plan="pro", status="active",
                ai_credits_used=0, ai_credits_limit=1000)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture()
async def test_admin(db_session):
    admin = User(id="test-admin-id", clerk_id="clerk_test_admin", email="admin@cr.com",
                 name="Test Admin", role="admin", plan="enterprise", status="active",
                 ai_credits_used=0, ai_credits_limit=10000)
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture()
async def test_project(db_session, test_user):
    project = Project(id="test-project-id", user_id=test_user.id, name="Test VPC Stack",
                      cloud="aws", environment="production", status="active",
                      resource_count=3, monthly_cost=120.50)
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest_asyncio.fixture()
async def test_deployment(db_session, test_project, test_user):
    deployment = Deployment(id="test-deploy-id", project_id=test_project.id,
                            user_id=test_user.id, version="v1.0.0",
                            environment="production", status="success",
                            triggered_by="test", duration_seconds=120)
    db_session.add(deployment)
    await db_session.commit()
    await db_session.refresh(deployment)
    return deployment


@pytest_asyncio.fixture()
async def test_template(db_session):
    template = Template(id="test-tpl-id", name="Test VPC Template",
                        description="A test VPC template", cloud="aws",
                        category="networking", resources=["VPC", "EC2"],
                        terraform_code='resource "aws_vpc" "main" {}',
                        status="published", usage_count=100, success_rate=98.5)
    db_session.add(template)
    await db_session.commit()
    await db_session.refresh(template)
    return template


@pytest_asyncio.fixture()
async def authed_client(client, test_user):
    from app.core.security import get_current_user
    async def mock_user():
        return test_user
    app.dependency_overrides[get_current_user] = mock_user
    yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def admin_client(client, test_admin):
    from app.core.security import get_current_user, get_admin_user
    async def mock_admin():
        return test_admin
    app.dependency_overrides[get_current_user] = mock_admin
    app.dependency_overrides[get_admin_user] = mock_admin
    yield client
    app.dependency_overrides.clear()
