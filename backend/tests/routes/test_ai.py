"""Tests for /api/v1/ai routes."""
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
class TestValidateTerraform:
    async def test_valid_terraform(self, authed_client):
        resp = await authed_client.post("/api/v1/ai/validate", json={
            "terraform": 'terraform {} provider "aws" {} resource "aws_instance" "x" { tags = {} }'
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "valid" in data
        assert "errors" in data
        assert isinstance(data["errors"], list)

    async def test_empty_terraform_invalid(self, authed_client):
        resp = await authed_client.post("/api/v1/ai/validate", json={"terraform": "# comment"})
        assert resp.status_code == 200
        assert resp.json()["valid"] is False

    async def test_requires_auth(self, client):
        resp = await client.post("/api/v1/ai/validate", json={"terraform": "test"})
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestEstimateCost:
    async def test_returns_cost(self, authed_client):
        resp = await authed_client.post("/api/v1/ai/estimate-cost", json={
            "terraform": 'resource "aws_instance" "x" {} resource "aws_lb" "y" {}'
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "estimated_monthly_cost" in data
        assert data["estimated_monthly_cost"] > 0
        assert data["currency"] == "USD"


@pytest.mark.asyncio
class TestGenerateInfra:
    async def test_generate_calls_service(self, authed_client):
        mock_result = {
            "id": "gen-123",
            "terraform": 'resource "aws_vpc" "main" {}',
            "resources": ["VPC"],
            "estimated_cost": 0.0,
            "validation_passed": True,
            "warnings": [],
            "model_used": "claude-3-5-sonnet-20240620",
        }
        with patch("app.api.routes.ai.generate_infrastructure", new=AsyncMock(return_value=mock_result)):
            resp = await authed_client.post("/api/v1/ai/generate", json={
                "prompt": "Create a simple AWS VPC with subnets",
                "cloud": "aws",
                "environment": "production",
                "model": "claude-3-5-sonnet-20240620",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert "terraform" in data
        assert "resources" in data
        assert data["validation_passed"] is True

    async def test_requires_auth(self, client):
        resp = await client.post("/api/v1/ai/generate", json={
            "prompt": "Create a VPC", "cloud": "aws",
            "environment": "production", "model": "claude-3-5-sonnet-20240620"
        })
        assert resp.status_code == 401

    async def test_prompt_too_short_422(self, authed_client):
        resp = await authed_client.post("/api/v1/ai/generate", json={
            "prompt": "VPC", "cloud": "aws",
            "environment": "production", "model": "claude-3-5-sonnet-20240620"
        })
        assert resp.status_code == 422

    async def test_exhausted_credits_403(self, authed_client, test_user, db_session):
        test_user.ai_credits_used = test_user.ai_credits_limit
        await db_session.commit()
        resp = await authed_client.post("/api/v1/ai/generate", json={
            "prompt": "Create a production AWS VPC with EC2 and RDS databases",
            "cloud": "aws", "environment": "production",
            "model": "claude-3-5-sonnet-20240620"
        })
        assert resp.status_code == 403
        assert "credits" in resp.json()["detail"].lower()
        test_user.ai_credits_used = 0
        await db_session.commit()
