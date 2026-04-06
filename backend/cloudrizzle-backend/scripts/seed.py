"""
Seed script — populate database with initial data for development.
Run: python scripts/seed.py
"""

import asyncio
import json
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import AsyncSessionLocal, create_tables
from app.models.models import (
    User, Organization, CloudAccount, Project, Deployment, Template,
    UserRole, UserPlan, CloudProvider, ProjectStatus, DeploymentStatus, Environment
)
from app.core.security import hash_password, encrypt_credential


async def seed():
    await create_tables()

    async with AsyncSessionLocal() as db:
        # ── Organization ─────────────────────────────────────────────────────
        org = Organization(
            name="TechCorp Inc.",
            website="https://techcorp.com",
            industry="Technology",
            team_size="10-50",
        )
        db.add(org)
        await db.flush()

        # ── Admin User ───────────────────────────────────────────────────────
        admin = User(
            email="amritsrivastava.infra@gmail.com",
            hashed_password=hash_password("Admin@12345"),
            full_name="Amrit Srivastava",
            company="cloudrizzle.com",
            role=UserRole.ADMIN,
            plan=UserPlan.ENTERPRISE,
            is_active=True,
            is_verified=True,
            organization_id=org.id,
        )
        db.add(admin)

        # ── Regular Users ────────────────────────────────────────────────────
        user1 = User(
            email="bose4305@gmail.com",
            hashed_password=hash_password("User@12345"),
            full_name="bose",
            role=UserRole.USER,
            plan=UserPlan.PRO,
            is_active=True,
            is_verified=True,
            organization_id=org.id,
        )
        user2 = User(
            email="crickletkibatien183@gmail.com",
            hashed_password=hash_password("User@12345"),
            full_name="Cricket ki batian",
            role=UserRole.USER,
            plan=UserPlan.PRO,
            is_active=True,
            is_verified=True,
            organization_id=org.id,
        )
        db.add_all([user1, user2])
        await db.flush()

        # ── Cloud Accounts ───────────────────────────────────────────────────
        creds_aws = encrypt_credential(json.dumps({
            "aws_access_key_id": "AKIAIOSFODNN7EXAMPLE",
            "aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        }))
        accounts = [
            CloudAccount(owner_id=admin.id, name="Prod AWS", provider=CloudProvider.AWS,
                         default_region="us-east-1", is_default=True, is_connected=True,
                         encrypted_credentials=creds_aws, last_tested_at=datetime.utcnow()),
            CloudAccount(owner_id=admin.id, name="Production AWS", provider=CloudProvider.AWS,
                         default_region="us-west-2", is_connected=True,
                         encrypted_credentials=creds_aws, last_tested_at=datetime.utcnow()),
            CloudAccount(owner_id=admin.id, name="Azure Atom", provider=CloudProvider.AZURE,
                         default_region="eastus", is_connected=True,
                         encrypted_credentials=encrypt_credential(json.dumps({"tenant_id": "xxx", "client_id": "yyy", "client_secret": "zzz"})),
                         last_tested_at=datetime.utcnow()),
            CloudAccount(owner_id=admin.id, name="Staging GCP", provider=CloudProvider.GCP,
                         default_region="us-central1", is_connected=True,
                         encrypted_credentials=encrypt_credential(json.dumps({"type": "service_account"})),
                         last_tested_at=datetime.utcnow()),
        ]
        db.add_all(accounts)
        await db.flush()

        # ── Templates ─────────────────────────────────────────────────────────
        templates_data = [
            {"name": "S3 Static Website", "category": "Web Hosting", "provider": CloudProvider.AWS,
             "description": "Host a static website using S3 and CloudFront CDN with automatic HTTPS",
             "star_count": 48, "is_featured": True,
             "terraform_code": "# S3 + CloudFront template\n\nresource \"aws_s3_bucket\" \"website\" {\n  bucket = var.bucket_name\n}"},
            {"name": "Microservices Stack", "category": "Architecture", "provider": CloudProvider.AWS,
             "description": "Complete microservices architecture with ECS, API Gateway and service mesh",
             "star_count": 92, "is_featured": True,
             "terraform_code": "# Microservices template\n"},
            {"name": "ML Ops Platform", "category": "Machine Learning", "provider": CloudProvider.AZURE,
             "description": "End-to-end machine learning pipeline with model training and serving",
             "star_count": 61, "is_featured": False,
             "terraform_code": "# ML Ops template\n"},
            {"name": "Kubernetes Cluster", "category": "Container", "provider": CloudProvider.AWS,
             "description": "Production-ready Kubernetes cluster with auto-scaling and monitoring",
             "star_count": 115, "is_featured": True,
             "terraform_code": "# EKS cluster template\n"},
            {"name": "Serverless API", "category": "Serverless", "provider": CloudProvider.AWS,
             "description": "REST API built with Lambda, API Gateway and DynamoDB",
             "star_count": 79, "is_featured": False,
             "terraform_code": "# Lambda API template\n"},
        ]
        for t in templates_data:
            tmpl = Template(**t, is_public=True, created_by=admin.id)
            db.add(tmpl)
        await db.flush()

        # ── Projects ──────────────────────────────────────────────────────────
        projects_data = [
            {"name": "kjhgjohvgbj", "slug": "kjhgjohvgbj", "status": ProjectStatus.ACTIVE,
             "environment": Environment.PRODUCTION, "provider": CloudProvider.AWS,
             "region": "us-east-1", "monthly_cost": 0.0, "health_score": 100.0},
            {"name": "aws deploy server ec2", "slug": "aws-deploy-server-ec2", "status": ProjectStatus.ACTIVE,
             "environment": Environment.PRODUCTION, "provider": CloudProvider.AWS,
             "region": "us-east-1", "monthly_cost": 0.0, "health_score": 100.0},
            {"name": "S3 Static Website Project", "slug": "s3-static-website-project",
             "status": ProjectStatus.DEPLOYING, "environment": Environment.STAGING,
             "provider": CloudProvider.AWS, "region": "us-east-1", "monthly_cost": 0.0, "health_score": 100.0,
             "description": "Deployed from S3 Static Website template"},
            {"name": "Microservices Stack Project", "slug": "microservices-stack-project",
             "status": ProjectStatus.DEPLOYING, "environment": Environment.DEVELOPMENT,
             "provider": CloudProvider.AWS, "monthly_cost": 0.0, "health_score": 100.0,
             "description": "Deployed from Microservices Stack template"},
            {"name": "Analytics Platform", "slug": "analytics-platform",
             "status": ProjectStatus.ACTIVE, "environment": Environment.PRODUCTION,
             "provider": CloudProvider.AWS, "monthly_cost": 856.0, "health_score": 95.0},
        ]
        created_projects = []
        for p in projects_data:
            proj = Project(owner_id=admin.id, cloud_account_id=accounts[0].id, **p)
            db.add(proj)
            created_projects.append(proj)
        await db.flush()

        # ── Deployments ───────────────────────────────────────────────────────
        dep_refs = [
            ("DEP-17668132026425-802LN", "9867686", DeploymentStatus.QUEUED, Environment.PRODUCTION),
            ("DEP-17655622833-9DLF1", "v1.2", DeploymentStatus.QUEUED, Environment.DEVELOPMENT),
            ("DEP-00000000000-NA001", "v1.0.9", DeploymentStatus.QUEUED, Environment.PRODUCTION),
            ("DEP-00000000000-NA002", "v1.7.9", DeploymentStatus.ROLLED_BACK, Environment.PRODUCTION),
            ("DEP-00000000000-NA003", "v2.5.0-rc1", DeploymentStatus.RUNNING, Environment.STAGING),
            ("DEP-00000000000-NA004", "v0.9.2", DeploymentStatus.FAILED, Environment.DEVELOPMENT),
        ]
        for ref, ver, status, env in dep_refs:
            d = Deployment(
                project_id=created_projects[0].id,
                triggered_by=admin.id,
                deployment_ref=ref,
                version=ver,
                status=status,
                environment=env,
                queued_at=datetime.utcnow() - timedelta(days=1),
                duration_seconds=45 if status == DeploymentStatus.FAILED else None,
            )
            db.add(d)

        await db.commit()
        print("✅ Database seeded successfully!")
        print(f"   Admin: amritsrivastava.infra@gmail.com / Admin@12345")
        print(f"   User:  bose4305@gmail.com / User@12345")


if __name__ == "__main__":
    asyncio.run(seed())
