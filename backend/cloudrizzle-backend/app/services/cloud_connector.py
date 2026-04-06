"""
Cloud Connector Service
Tests connectivity to AWS, Azure, and GCP using provided credentials.
Returns (success: bool, error_message: str | None)
"""

import logging
from typing import Tuple
from app.models.models import CloudProvider

logger = logging.getLogger(__name__)


async def test_cloud_connection(
    provider: CloudProvider,
    credentials: dict,
    region: str | None = None,
) -> Tuple[bool, str | None]:
    """Test that the given credentials can connect to the cloud provider."""
    try:
        if provider == CloudProvider.AWS:
            return await _test_aws(credentials, region or "us-east-1")
        elif provider == CloudProvider.AZURE:
            return await _test_azure(credentials)
        elif provider == CloudProvider.GCP:
            return await _test_gcp(credentials)
        else:
            return False, f"Unknown provider: {provider}"
    except Exception as e:
        return False, str(e)


async def _test_aws(creds: dict, region: str) -> Tuple[bool, str | None]:
    try:
        import boto3
        from botocore.exceptions import ClientError, NoCredentialsError

        client = boto3.client(
            "sts",
            region_name=region,
            aws_access_key_id=creds.get("aws_access_key_id"),
            aws_secret_access_key=creds.get("aws_secret_access_key"),
            aws_session_token=creds.get("aws_session_token"),
        )
        response = client.get_caller_identity()
        logger.info(f"AWS connection OK: account {response['Account']}")
        return True, None

    except ImportError:
        return False, "boto3 not installed"
    except Exception as e:
        return False, str(e)


async def _test_azure(creds: dict) -> Tuple[bool, str | None]:
    try:
        from azure.identity import ClientSecretCredential
        from azure.mgmt.resource import SubscriptionClient

        credential = ClientSecretCredential(
            tenant_id=creds.get("tenant_id"),
            client_id=creds.get("client_id"),
            client_secret=creds.get("client_secret"),
        )
        client = SubscriptionClient(credential)
        # List subscriptions to verify access
        subs = list(client.subscriptions.list())
        logger.info(f"Azure connection OK: {len(subs)} subscriptions")
        return True, None

    except ImportError:
        return False, "azure-mgmt-resource not installed"
    except Exception as e:
        return False, str(e)


async def _test_gcp(creds: dict) -> Tuple[bool, str | None]:
    try:
        import google.auth
        from google.oauth2 import service_account
        from google.cloud import resourcemanager_v3

        if "type" in creds:
            # Service account JSON
            sa_creds = service_account.Credentials.from_service_account_info(
                creds,
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
        else:
            return False, "Invalid GCP credentials — expected service account JSON"

        client = resourcemanager_v3.ProjectsClient(credentials=sa_creds)
        projects = list(client.search_projects())
        logger.info(f"GCP connection OK: {len(projects)} projects")
        return True, None

    except ImportError:
        return False, "google-cloud-resource-manager not installed"
    except Exception as e:
        return False, str(e)
