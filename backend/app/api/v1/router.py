from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.projects import router as projects_router
from app.api.v1.endpoints.cloud_accounts import router as cloud_accounts_router
from app.api.v1.endpoints.deployments import router as deployments_router
from app.api.v1.endpoints.ai_assistant import router as ai_router
from app.api.v1.endpoints.misc import (
    users_router, templates_router, costs_router,
    monitoring_router, admin_router
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(projects_router)
api_router.include_router(cloud_accounts_router)
api_router.include_router(deployments_router)
api_router.include_router(ai_router)
api_router.include_router(templates_router)
api_router.include_router(costs_router)
api_router.include_router(monitoring_router)
api_router.include_router(admin_router)
