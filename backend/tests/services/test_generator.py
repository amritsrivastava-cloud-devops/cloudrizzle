"""Tests for AI generator service."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
class TestGeneratorPipeline:
    async def test_generate_returns_expected_structure(self):
        mock_terraform = """# RESOURCES_LIST: VPC, EC2, RDS
# ESTIMATED_MONTHLY_COST: 240.00

terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { cloudrizzle_managed = "true" }
}"""

        mock_validation = '{"valid": true, "errors": [], "warnings": []}'

        with patch("app.services.ai.generator.get_llm") as mock_llm_factory:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(side_effect=[
                MagicMock(content=mock_terraform),
                MagicMock(content=mock_validation),
            ])
            mock_llm_factory.return_value = mock_llm

            from app.services.ai.generator import generate_infrastructure
            result = await generate_infrastructure(
                prompt="Create a VPC with EC2 and RDS",
                cloud="aws",
                environment="production",
                model="claude-3-5-sonnet-20240620",
            )

        assert "id" in result
        assert "terraform" in result
        assert "resources" in result
        assert "estimated_cost" in result
        assert "validation_passed" in result
        assert "model_used" in result
        assert result["validation_passed"] is True
        assert result["estimated_cost"] == 240.00

    async def test_parse_resources_from_comment(self):
        from app.services.ai.generator import generate_infrastructure

        mock_terraform = """# RESOURCES_LIST: EC2, RDS, ALB
# ESTIMATED_MONTHLY_COST: 180.50

resource "aws_instance" "x" {}"""

        mock_valid = '{"valid": true, "errors": [], "warnings": []}'

        with patch("app.services.ai.generator.get_llm") as mock_llm_factory:
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(side_effect=[
                MagicMock(content=mock_terraform),
                MagicMock(content=mock_valid),
            ])
            mock_llm_factory.return_value = mock_llm

            result = await generate_infrastructure(
                prompt="Create EC2 with RDS and load balancer",
                cloud="aws",
                environment="staging",
                model="gpt-4o",
            )

        assert "EC2" in result["resources"]
        assert "RDS" in result["resources"]
        assert result["estimated_cost"] == 180.50


@pytest.mark.asyncio
class TestTerraformRunner:
    async def test_parse_plan_summary_add(self):
        from app.services.terraform.runner import TerraformRunner
        runner = TerraformRunner("test-workspace")
        output = """
Terraform will perform the following actions:
  # aws_vpc.main will be created
  # aws_instance.app will be created

Plan: 2 to add, 0 to change, 0 to destroy.
"""
        summary = runner._parse_plan_summary(output)
        assert summary["add"] == 2
        assert summary["change"] == 0
        assert summary["destroy"] == 0

    async def test_parse_plan_summary_mixed(self):
        from app.services.terraform.runner import TerraformRunner
        runner = TerraformRunner("test-workspace")
        output = "Plan: 3 to add, 1 to change, 2 to destroy."
        summary = runner._parse_plan_summary(output)
        assert summary["add"] == 3
        assert summary["change"] == 1
        assert summary["destroy"] == 2
