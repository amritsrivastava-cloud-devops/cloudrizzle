"""
CloudRizzle Backend — FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import structlog

from app.core.config import settings
from app.core.database import create_tables
from app.core.template_catalog import seed_default_templates
from app.api.routes.projects import router as projects_router
from app.api.routes.deployments import router as deployments_router
from app.api.routes.infra import router as infra_router
from app.api.routes.ai import router as ai_router
from app.api.routes.misc import (
    profile_router, cloud_router, templates_router,
    monitoring_router, costs_router,
)
from app.api.routes.admin.routes import router as admin_router
from app.api.routes.webhooks import router as webhooks_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("CloudRizzle starting up", env=settings.APP_ENV)
    await create_tables()
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        await seed_default_templates(session)
    logger.info("Database tables ready")
    yield
    logger.info("CloudRizzle shutting down")


app = FastAPI(
    title="CloudRizzle API",
    description="AI-powered multi-cloud infrastructure platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ─── Routes ───────────────────────────────────────────────────
API_PREFIX = f"/api/{settings.API_VERSION}"

app.include_router(projects_router, prefix=API_PREFIX)
app.include_router(deployments_router, prefix=API_PREFIX)
app.include_router(infra_router, prefix=API_PREFIX)
app.include_router(ai_router, prefix=API_PREFIX)
app.include_router(profile_router, prefix=API_PREFIX)
app.include_router(cloud_router, prefix=API_PREFIX)
app.include_router(templates_router, prefix=API_PREFIX)
app.include_router(monitoring_router, prefix=API_PREFIX)
app.include_router(costs_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)
app.include_router(webhooks_router, prefix=API_PREFIX)


# ─── Health Check ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "env": settings.APP_ENV,
    }


@app.get("/")
async def root():
    return {
        "message": "CloudRizzle API",
        "docs": "/docs",
        "version": "1.0.0",
    }
