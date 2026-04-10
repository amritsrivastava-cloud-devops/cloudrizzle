"""Tests for health and root endpoints."""
import pytest


@pytest.mark.asyncio
class TestHealth:
    async def test_health_200(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["app"] == "CloudRizzle"
        assert "version" in data

    async def test_root_200(self, client):
        resp = await client.get("/")
        assert resp.status_code == 200
        assert "message" in resp.json()

    async def test_docs_accessible(self, client):
        resp = await client.get("/docs")
        assert resp.status_code == 200
