from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Template


DEFAULT_TEMPLATE_CATALOG = [
    {
        "name": "3-Tier VPC Foundation",
        "description": "Production-ready AWS network foundation with public and private subnets, NAT, ALB, and RDS-ready connectivity.",
        "cloud": "aws",
        "category": "networking",
        "resources": ["VPC", "Subnets", "NAT Gateway", "ALB", "Security Groups"],
        "terraform_code": """terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.10.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "cloudrizzle-vpc-foundation"
  }
}
""",
        "status": "published",
        "usage_count": 2841,
        "success_rate": 98.4,
        "is_popular": True,
        "is_new": False,
    },
    {
        "name": "Serverless API Gateway Stack",
        "description": "AWS serverless API template with Lambda, API Gateway, DynamoDB, CloudWatch logging, and IAM boundaries.",
        "cloud": "aws",
        "category": "serverless",
        "resources": ["Lambda", "API Gateway", "DynamoDB", "CloudWatch", "IAM"],
        "terraform_code": """resource "aws_lambda_function" "api" {
  function_name = "cloudrizzle-api"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "lambda.zip"
}
""",
        "status": "published",
        "usage_count": 1920,
        "success_rate": 97.1,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "EKS Service Platform",
        "description": "Managed Kubernetes baseline on AWS with EKS, managed node groups, ALB ingress, and container registry integration.",
        "cloud": "aws",
        "category": "kubernetes",
        "resources": ["EKS", "Managed Node Groups", "ALB", "IAM", "ECR"],
        "terraform_code": """module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "cloudrizzle-eks"
  cluster_version = "1.29"
  subnet_ids      = []
  vpc_id          = ""
}
""",
        "status": "published",
        "usage_count": 1560,
        "success_rate": 94.7,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "Static Website Edge Delivery",
        "description": "AWS static hosting with S3, CloudFront, Route53, and ACM for secure global delivery.",
        "cloud": "aws",
        "category": "storage",
        "resources": ["S3", "CloudFront", "Route53", "ACM"],
        "terraform_code": """resource "aws_s3_bucket" "site" {
  bucket = "cloudrizzle-site"
}
""",
        "status": "published",
        "usage_count": 3102,
        "success_rate": 99.8,
        "is_popular": True,
        "is_new": False,
    },
    {
        "name": "AKS Microservices Cluster",
        "description": "Azure Kubernetes architecture with AKS, ACR, Key Vault, Azure Monitor, and managed ingress.",
        "cloud": "azure",
        "category": "kubernetes",
        "resources": ["AKS", "ACR", "Key Vault", "Azure Monitor", "Load Balancer"],
        "terraform_code": """resource "azurerm_kubernetes_cluster" "aks" {
  name                = "cloudrizzle-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "cloudrizzle"
}
""",
        "status": "published",
        "usage_count": 1247,
        "success_rate": 91.2,
        "is_popular": True,
        "is_new": False,
    },
    {
        "name": "Azure App Service Stack",
        "description": "Managed application platform on Azure with App Service, SQL Database, Redis, Key Vault, and Application Insights.",
        "cloud": "azure",
        "category": "compute",
        "resources": ["App Service", "Azure SQL", "Redis", "Key Vault", "Insights"],
        "terraform_code": """resource "azurerm_linux_web_app" "app" {
  name                = "cloudrizzle-app"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id
}
""",
        "status": "published",
        "usage_count": 741,
        "success_rate": 98.1,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "Azure Landing Zone Core",
        "description": "Governed Azure landing zone with hub-spoke networking, policy assignments, diagnostics, and baseline identity controls.",
        "cloud": "azure",
        "category": "security",
        "resources": ["Management Groups", "VNets", "Policy", "Log Analytics", "Key Vault"],
        "terraform_code": """resource "azurerm_virtual_network" "hub" {
  name                = "cloudrizzle-hub"
  address_space       = ["10.20.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}
""",
        "status": "published",
        "usage_count": 528,
        "success_rate": 96.6,
        "is_popular": False,
        "is_new": True,
    },
    {
        "name": "Azure PostgreSQL Data Platform",
        "description": "Stateful Azure data stack with Flexible Server PostgreSQL, private networking, backups, and monitoring.",
        "cloud": "azure",
        "category": "database",
        "resources": ["PostgreSQL Flexible Server", "Private DNS", "VNet", "Monitor Alerts"],
        "terraform_code": """resource "azurerm_postgresql_flexible_server" "db" {
  name                = "cloudrizzle-pg"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  version             = "14"
}
""",
        "status": "published",
        "usage_count": 463,
        "success_rate": 97.4,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "Cloud Run Service Mesh",
        "description": "GCP serverless service deployment with Cloud Run, Cloud SQL, Secret Manager, and Cloud Armor edge controls.",
        "cloud": "gcp",
        "category": "serverless",
        "resources": ["Cloud Run", "Cloud SQL", "Secret Manager", "Cloud Armor"],
        "terraform_code": """resource "google_cloud_run_v2_service" "app" {
  name     = "cloudrizzle-run"
  location = "us-central1"
}
""",
        "status": "published",
        "usage_count": 892,
        "success_rate": 96.8,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "GKE Autopilot Platform",
        "description": "GKE Autopilot with Workload Identity, Artifact Registry, Logging, and secure delivery defaults.",
        "cloud": "gcp",
        "category": "kubernetes",
        "resources": ["GKE", "Artifact Registry", "IAM", "Cloud Logging"],
        "terraform_code": """resource "google_container_cluster" "autopilot" {
  name             = "cloudrizzle-gke"
  location         = "us-central1"
  enable_autopilot = true
}
""",
        "status": "published",
        "usage_count": 483,
        "success_rate": 97.3,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "GCP Analytics Lakehouse",
        "description": "Analytics-ready GCP architecture with BigQuery, GCS data lake, IAM boundaries, and scheduled processing.",
        "cloud": "gcp",
        "category": "storage",
        "resources": ["BigQuery", "Cloud Storage", "Cloud Scheduler", "IAM"],
        "terraform_code": """resource "google_storage_bucket" "lake" {
  name     = "cloudrizzle-lake"
  location = "US"
}
""",
        "status": "published",
        "usage_count": 374,
        "success_rate": 95.9,
        "is_popular": False,
        "is_new": True,
    },
    {
        "name": "GCP Secure Web App",
        "description": "Global web app footprint on GCP with HTTPS load balancing, Cloud CDN, managed certificates, and WAF.",
        "cloud": "gcp",
        "category": "networking",
        "resources": ["Load Balancer", "Cloud CDN", "Managed SSL", "Cloud Armor"],
        "terraform_code": """resource "google_compute_backend_service" "web" {
  name = "cloudrizzle-web"
}
""",
        "status": "published",
        "usage_count": 451,
        "success_rate": 98.2,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "Multi-Cloud Disaster Recovery",
        "description": "Cross-cloud disaster recovery blueprint with AWS primary, Azure secondary, failover DNS, and synchronized backups.",
        "cloud": "multi",
        "category": "disaster-recovery",
        "resources": ["AWS VPC", "Azure VNet", "Route53", "VPN", "Backup Vault"],
        "terraform_code": """# Multi-cloud DR baseline
module "aws_primary" {
  source = "./modules/aws-primary"
}

module "azure_secondary" {
  source = "./modules/azure-secondary"
}
""",
        "status": "published",
        "usage_count": 312,
        "success_rate": 96.8,
        "is_popular": False,
        "is_new": True,
    },
    {
        "name": "Unified Kubernetes Platform",
        "description": "Standardized Kubernetes operating model spanning EKS, AKS, and GKE with shared ingress, observability, and policy controls.",
        "cloud": "multi",
        "category": "kubernetes",
        "resources": ["EKS", "AKS", "GKE", "Ingress", "Observability"],
        "terraform_code": """# Multi-cluster platform blueprint
locals {
  clusters = ["aws", "azure", "gcp"]
}
""",
        "status": "published",
        "usage_count": 274,
        "success_rate": 94.9,
        "is_popular": False,
        "is_new": False,
    },
    {
        "name": "Cross-Cloud Observability Stack",
        "description": "Shared monitoring foundation for AWS, Azure, and GCP with metrics, logs, traces, dashboards, and alert routing.",
        "cloud": "multi",
        "category": "monitoring",
        "resources": ["Prometheus", "Grafana", "Loki", "OpenTelemetry", "Alertmanager"],
        "terraform_code": """resource "grafana_folder" "platform" {
  title = "CloudRizzle Platform"
}
""",
        "status": "published",
        "usage_count": 198,
        "success_rate": 98.7,
        "is_popular": True,
        "is_new": False,
    },
    {
        "name": "Portable CI/CD Delivery Pipeline",
        "description": "Reusable delivery workflow for AWS, Azure, and GCP deployments with artifact promotion, approvals, and rollback automation.",
        "cloud": "multi",
        "category": "compute",
        "resources": ["CI/CD", "Artifact Registry", "Secrets", "Approvals", "Rollback Hooks"],
        "terraform_code": """# Portable delivery pipeline baseline
variable "environments" {
  type    = list(string)
  default = ["staging", "production"]
}
""",
        "status": "published",
        "usage_count": 226,
        "success_rate": 97.9,
        "is_popular": False,
        "is_new": True,
    },
]


async def seed_default_templates(db: AsyncSession) -> None:
    existing_names = set((await db.execute(select(Template.name))).scalars().all())
    created_any = False

    for payload in DEFAULT_TEMPLATE_CATALOG:
        if payload["name"] in existing_names:
            continue

        db.add(Template(**payload))
        created_any = True

    if created_any:
        await db.commit()
