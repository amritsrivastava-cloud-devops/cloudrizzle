from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator


class Settings(BaseSettings):
    # App
    APP_NAME: str = "CloudRizzle"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-in-production"
    API_VERSION: str = "v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/cloudrizzle"
    DATABASE_URL_SYNC: str = "postgresql://postgres:password@localhost:5432/cloudrizzle"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Clerk
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_WEBHOOK_SECRET: str = ""
    BACKEND_BYPASS_AUTH: bool = False
    ADMIN_EMAILS: List[str] = []
    LOCAL_ADMIN_USERNAME: str = "admin"
    LOCAL_ADMIN_PASSWORD: str = "admin"
    LOCAL_ADMIN_SESSION_VALUE: str = "enabled"

    # AI
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEFAULT_AI_MODEL: str = "claude-3-5-sonnet-20240620"

    # Temporal
    TEMPORAL_HOST: str = "localhost:7233"
    TEMPORAL_NAMESPACE: str = "default"
    TEMPORAL_TASK_QUEUE: str = "cloudrizzle-tasks"

    # Terraform
    TERRAFORM_BINARY_PATH: str = "/usr/local/bin/terraform"
    TERRAFORM_WORKING_DIR: str = "/tmp/cloudrizzle-terraform"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    APP_INVITE_REDIRECT_URL: str = "http://localhost:3000/sign-up"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://cloudrizzle.com",
        "https://www.cloudrizzle.com",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                return value
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    @field_validator("ADMIN_EMAILS", mode="before")
    @classmethod
    def parse_admin_emails(cls, value):
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                return value
            return [email.strip().lower() for email in stripped.split(",") if email.strip()]
        return value

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
