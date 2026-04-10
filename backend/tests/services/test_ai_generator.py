"""
Tests for the AI generator service (LangGraph pipeline)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_generator_parses_resources_from_comment():
    """Generator correctly parses # RESOURCES_LIST comment."""
    from app.services.ai.generator import generate_infrastructure

    mock_terraform = """# RESOURCES_LIST: VPC, EC2, RDS, ALB
# ESTIMATED_MONTHLY_COST: 340.00

terraform {
  required_providers {
    aws = { source = "hashicorp/aws" version = "~> 5.0" }
  }
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "test-vpc", cloudrizzle_managed = "true" }
}"""

    mock_result = {
        "id": "gen-001",
        "terraform": mock_terraform,
        "resources": ["VPC", "EC2", "RDS", "ALB"],
        "estimated_cost": 340.0,
        "validation_passed": True,
        "warnings": [],
        "model_used": "claude-3-5-sonnet-20240620",
    }

    with patch(
        "app.services.ai.generator.get_graph"
    ) as mock_get_graph:
        mock_graph = AsyncMock()
        mock_graph.ainvoke = AsyncMock(
            return_value={
                "terraform": mock_terraform,
                "resources": ["VPC", "EC2", "RDS", "ALB"],
                "estimated_cost": 340.0,
                "validation_passed": True,
                "warnings": [],
                "errors": [],
                "retry_count": 0,
                "prompt": "test",
                "cloud": "aws",
                "environment": "production",
                "model": "claude-3-5-sonnet-20240620",
            }
        )
        mock_get_graph.return_value = mock_graph

        result = await generate_infrastructure(
            prompt="Create a 3-tier AWS VPC",
            cloud="aws",
            environment="production",
            model="claude-3-5-sonnet-20240620",
        )

    assert result["terraform"] == mock_terraform
    assert result["resources"] == ["VPC", "EC2", "RDS", "ALB"]
    assert result["estimated_cost"] == 340.0
    assert result["validation_passed"] is True
    assert "id" in result


@pytest.mark.asyncio
async def test_generator_returns_unique_ids():
    """Each generation call returns a unique ID."""
    from app.services.ai.generator import generate_infrastructure

    mock_state = {
        "terraform": "resource \"aws_vpc\" \"main\" {}",
        "resources": [],
        "estimated_cost": 0.0,
        "validation_passed": True,
        "warnings": [],
        "errors": [],
        "retry_count": 0,
        "prompt": "test",
        "cloud": "aws",
        "environment": "production",
        "model": "claude-3-5-sonnet-20240620",
    }

    with patch("app.services.ai.generator.get_graph") as mock_get_graph:
        mock_graph = AsyncMock()
        mock_graph.ainvoke = AsyncMock(return_value=mock_state)
        mock_get_graph.return_value = mock_graph

        r1 = await generate_infrastructure("prompt 1", "aws", "production", "claude-3-5-sonnet-20240620")
        r2 = await generate_infrastructure("prompt 2", "aws", "production", "claude-3-5-sonnet-20240620")

    assert r1["id"] != r2["id"]


def test_validator_prompt_exists():
    """Validator prompt is defined and non-empty."""
    from app.services.ai.generator import VALIDATOR_PROMPT, SYSTEM_PROMPT
    assert len(SYSTEM_PROMPT) > 100
    assert len(VALIDATOR_PROMPT) > 50
    assert "JSON" in VALIDATOR_PROMPT
    assert "valid" in VALIDATOR_PROMPT.lower()


def test_should_retry_logic():
    """should_retry returns correct routing decisions."""
    from app.services.ai.generator import should_retry

    # Passed — go to done
    state_passed = {"validation_passed": True, "retry_count": 0}
    assert should_retry(state_passed) == "done"

    # Failed, first retry — go to fix
    state_failed = {"validation_passed": False, "retry_count": 0}
    assert should_retry(state_failed) == "fix"

    # Failed, second retry — go to fix
    state_retry1 = {"validation_passed": False, "retry_count": 1}
    assert should_retry(state_retry1) == "fix"

    # Failed, max retries reached — give up, go to done
    state_max = {"validation_passed": False, "retry_count": 2}
    assert should_retry(state_max) == "done"


def test_get_llm_returns_correct_type():
    """get_llm returns appropriate LLM based on model name."""
    from app.services.ai.generator import get_llm
    from langchain_anthropic import ChatAnthropic
    from langchain_openai import ChatOpenAI

    claude_llm = get_llm("claude-3-5-sonnet-20240620")
    assert isinstance(claude_llm, ChatAnthropic)

    gpt_llm = get_llm("gpt-4o")
    assert isinstance(gpt_llm, ChatOpenAI)
