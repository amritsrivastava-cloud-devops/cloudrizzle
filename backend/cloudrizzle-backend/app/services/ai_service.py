"""
AI Service — converts natural language prompts into valid Terraform HCL
using Claude (Anthropic) as the primary model.
"""

import json
import logging
from typing import Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert cloud infrastructure engineer specializing in Terraform.
Your job is to convert natural language infrastructure requests into production-ready Terraform HCL code.

Rules:
1. Always output ONLY valid Terraform HCL — no prose, no markdown fences
2. Include all required providers and versions
3. Use variables for all configurable values
4. Add meaningful comments for complex resources
5. Follow Terraform best practices (explicit dependencies, tagging, etc.)
6. For AWS: use us-east-1 as default region unless specified
7. Always output a JSON summary block at the end as a comment:
   # RESOURCES_JSON: {"resources": [{"type": "aws_instance", "name": "web", "estimated_cost": 8.50}]}

Never include sensitive values. Always use variables or data sources for credentials.
"""


async def generate_terraform_from_prompt(
    prompt: str,
    cloud_provider: str = "aws",
    region: str | None = None,
    context: dict | None = None,
) -> Tuple[str, list[dict]]:
    """
    Returns (terraform_hcl_code, resources_list)
    resources_list: [{type, name, estimated_cost}]
    """
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        user_message = f"Cloud provider: {cloud_provider}\n"
        if region:
            user_message += f"Region: {region}\n"
        if context:
            user_message += f"Context: {json.dumps(context)}\n"
        user_message += f"\nRequest: {prompt}"

        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=settings.AI_MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        terraform_code = response.content[0].text
        resources = _extract_resources(terraform_code)
        return terraform_code, resources

    except ImportError:
        logger.warning("Anthropic SDK not installed — using mock generator")
        return _mock_terraform(prompt, cloud_provider), []
    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        raise RuntimeError(f"Failed to generate Terraform: {e}")


def _extract_resources(hcl_code: str) -> list[dict]:
    """Parse the RESOURCES_JSON comment from AI output."""
    try:
        marker = "# RESOURCES_JSON:"
        if marker in hcl_code:
            json_str = hcl_code.split(marker)[1].strip().split("\n")[0]
            data = json.loads(json_str)
            return data.get("resources", [])
    except Exception:
        pass
    return []


def _mock_terraform(prompt: str, provider: str) -> str:
    """Fallback mock when AI API is not configured."""
    return f'''# Generated from: {prompt}
# Provider: {provider}

terraform {{
  required_providers {{
    aws = {{
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }}
  }}
  required_version = ">= 1.5.0"
}}

provider "aws" {{
  region = var.region
}}

variable "region" {{
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}}

variable "environment" {{
  description = "Environment name"
  type        = string
  default     = "production"
}}

# TODO: Add specific resources based on prompt

# RESOURCES_JSON: {{"resources": []}}
'''


async def get_ai_recommendations(
    cloud_accounts: list,
    projects: list,
    cost_data: dict,
) -> list[dict]:
    """
    Analyze infrastructure and return optimization recommendations.
    Returns list of {severity, title, description, impact, action}
    """
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        context = {
            "projects_count": len(projects),
            "monthly_cost": cost_data.get("total", 0),
            "providers": list({p.get("provider") for p in cloud_accounts}),
        }

        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1024,
            system="You are a cloud cost optimization expert. Analyze the provided infrastructure context and return ONLY a JSON array of recommendations. Each item: {severity: 'critical'|'medium'|'low', title: str, description: str, impact: str, action: str}",
            messages=[{"role": "user", "content": f"Analyze this infrastructure: {json.dumps(context)}"}],
        )
        return json.loads(response.content[0].text)
    except Exception as e:
        logger.warning(f"Could not get AI recommendations: {e}")
        return [
            {
                "severity": "medium",
                "title": "Review Unused Resources",
                "description": "Check for unattached volumes and idle instances",
                "impact": "Potential cost savings",
                "action": "Review",
            }
        ]
