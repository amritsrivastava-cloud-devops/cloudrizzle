"""
Cloud Provider Services
Handles connections and resource queries for AWS, Azure, GCP.
"""
import boto3
from typing import Optional
import structlog

logger = structlog.get_logger()


# ─── AWS ──────────────────────────────────────────────────────
class AWSService:
    def __init__(self, access_key: str, secret_key: str, region: str = "us-east-1"):
        self.session = boto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )
        self.region = region

    def test_connection(self) -> bool:
        """Verify credentials work."""
        try:
            sts = self.session.client("sts")
            sts.get_caller_identity()
            return True
        except Exception as e:
            logger.error("AWS connection failed", error=str(e))
            return False

    def list_ec2_instances(self) -> list:
        ec2 = self.session.client("ec2")
        try:
            response = ec2.describe_instances(
                Filters=[{"Name": "tag:cloudrizzle_managed", "Values": ["true"]}]
            )
            instances = []
            for reservation in response["Reservations"]:
                for instance in reservation["Instances"]:
                    name = next(
                        (t["Value"] for t in instance.get("Tags", []) if t["Key"] == "Name"),
                        instance["InstanceId"],
                    )
                    instances.append({
                        "resource_id": instance["InstanceId"],
                        "type": "EC2 Instance",
                        "name": name,
                        "cloud": "aws",
                        "region": self.region,
                        "status": instance["State"]["Name"],
                        "metadata": {
                            "instance_type": instance.get("InstanceType", ""),
                            "public_ip": instance.get("PublicIpAddress", ""),
                            "private_ip": instance.get("PrivateIpAddress", ""),
                        },
                    })
            return instances
        except Exception as e:
            logger.error("Failed to list EC2", error=str(e))
            return []

    def list_rds_instances(self) -> list:
        rds = self.session.client("rds")
        try:
            response = rds.describe_db_instances()
            instances = []
            for db in response["DBInstances"]:
                instances.append({
                    "resource_id": db["DBInstanceIdentifier"],
                    "type": f"RDS {db.get('Engine', 'DB').upper()}",
                    "name": db["DBInstanceIdentifier"],
                    "cloud": "aws",
                    "region": self.region,
                    "status": db["DBInstanceStatus"],
                    "metadata": {
                        "engine": db.get("Engine", ""),
                        "instance_class": db.get("DBInstanceClass", ""),
                        "storage_gb": str(db.get("AllocatedStorage", 0)),
                    },
                })
            return instances
        except Exception as e:
            logger.error("Failed to list RDS", error=str(e))
            return []

    def get_monthly_cost(self) -> float:
        """Get current month cost from Cost Explorer."""
        try:
            ce = self.session.client("ce", region_name="us-east-1")
            from datetime import date, timedelta
            today = date.today()
            start = today.replace(day=1).isoformat()
            end = today.isoformat()

            response = ce.get_cost_and_usage(
                TimePeriod={"Start": start, "End": end},
                Granularity="MONTHLY",
                Metrics=["UnblendedCost"],
            )
            total = sum(
                float(r["Total"]["UnblendedCost"]["Amount"])
                for r in response.get("ResultsByTime", [])
            )
            return round(total, 2)
        except Exception as e:
            logger.error("Failed to get AWS cost", error=str(e))
            return 0.0

    def get_all_managed_resources(self) -> list:
        """Get all CloudRizzle-managed resources."""
        resources = []
        resources.extend(self.list_ec2_instances())
        resources.extend(self.list_rds_instances())
        return resources


# ─── Azure ────────────────────────────────────────────────────
class AzureService:
    def __init__(self, subscription_id: str, tenant_id: str, client_id: str, client_secret: str):
        self.subscription_id = subscription_id
        from azure.identity import ClientSecretCredential
        self.credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )

    def test_connection(self) -> bool:
        try:
            from azure.mgmt.resource import SubscriptionClient
            client = SubscriptionClient(self.credential)
            list(client.subscriptions.list())
            return True
        except Exception as e:
            logger.error("Azure connection failed", error=str(e))
            return False

    def list_vms(self) -> list:
        try:
            from azure.mgmt.compute import ComputeManagementClient
            client = ComputeManagementClient(self.credential, self.subscription_id)
            vms = []
            for vm in client.virtual_machines.list_all():
                tags = vm.tags or {}
                if tags.get("cloudrizzle_managed") == "true":
                    vms.append({
                        "resource_id": vm.id,
                        "type": "Azure VM",
                        "name": vm.name,
                        "cloud": "azure",
                        "region": vm.location,
                        "status": "running",
                        "metadata": {"size": vm.hardware_profile.vm_size if vm.hardware_profile else ""},
                    })
            return vms
        except Exception as e:
            logger.error("Failed to list Azure VMs", error=str(e))
            return []

    def get_monthly_cost(self) -> float:
        """Get Azure monthly cost from Cost Management API."""
        try:
            from azure.mgmt.costmanagement import CostManagementClient
            from datetime import date
            client = CostManagementClient(self.credential)
            today = date.today()
            start = today.replace(day=1).isoformat()

            scope = f"/subscriptions/{self.subscription_id}"
            result = client.query.usage(
                scope=scope,
                parameters={
                    "type": "ActualCost",
                    "timeframe": "Custom",
                    "timePeriod": {"from": start + "T00:00:00Z", "to": today.isoformat() + "T23:59:59Z"},
                    "dataset": {"granularity": "Monthly", "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}}},
                },
            )
            total = sum(row[0] for row in (result.rows or []))
            return round(float(total), 2)
        except Exception as e:
            logger.error("Failed to get Azure cost", error=str(e))
            return 0.0


# ─── GCP ──────────────────────────────────────────────────────
class GCPService:
    def __init__(self, project_id: str, credentials_json: dict):
        self.project_id = project_id
        self.credentials_json = credentials_json
        import google.auth
        from google.oauth2 import service_account
        self.credentials = service_account.Credentials.from_service_account_info(
            credentials_json,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )

    def test_connection(self) -> bool:
        try:
            from google.cloud import resourcemanager_v3
            client = resourcemanager_v3.ProjectsClient(credentials=self.credentials)
            client.get_project(name=f"projects/{self.project_id}")
            return True
        except Exception as e:
            logger.error("GCP connection failed", error=str(e))
            return False

    def list_compute_instances(self) -> list:
        try:
            from google.cloud import compute_v1
            client = compute_v1.InstancesClient(credentials=self.credentials)
            instances = []
            agg_list = client.aggregated_list(project=self.project_id)
            for zone, response in agg_list:
                if response.instances:
                    for instance in response.instances:
                        labels = dict(instance.labels) if instance.labels else {}
                        if labels.get("cloudrizzle_managed") == "true":
                            instances.append({
                                "resource_id": str(instance.id),
                                "type": "GCE Instance",
                                "name": instance.name,
                                "cloud": "gcp",
                                "region": zone,
                                "status": instance.status.lower(),
                                "metadata": {"machine_type": instance.machine_type},
                            })
            return instances
        except Exception as e:
            logger.error("Failed to list GCE instances", error=str(e))
            return []

    def get_monthly_cost(self) -> float:
        """Get GCP billing data."""
        # Requires BigQuery billing export — simplified for now
        return 0.0


# ─── Factory ──────────────────────────────────────────────────
def get_cloud_service(provider: str, credentials: dict):
    """Get appropriate cloud service client from credentials."""
    if provider == "aws":
        return AWSService(
            access_key=credentials.get("access_key_id", ""),
            secret_key=credentials.get("secret_access_key", ""),
            region=credentials.get("region", "us-east-1"),
        )
    elif provider == "azure":
        return AzureService(
            subscription_id=credentials.get("subscription_id", ""),
            tenant_id=credentials.get("tenant_id", ""),
            client_id=credentials.get("client_id", ""),
            client_secret=credentials.get("client_secret", ""),
        )
    elif provider == "gcp":
        return GCPService(
            project_id=credentials.get("project_id", ""),
            credentials_json=credentials.get("service_account_json", {}),
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")
