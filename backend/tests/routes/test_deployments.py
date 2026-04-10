"""Tests for /api/v1/deployments routes."""
import pytest


@pytest.mark.asyncio
class TestListDeployments:
    async def test_requires_auth(self, client):
        resp = await client.get("/api/v1/deployments")
        assert resp.status_code == 401

    async def test_returns_list(self, authed_client, test_deployment):
        resp = await authed_client.get("/api/v1/deployments")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert any(d["id"] == test_deployment.id for d in resp.json())

    async def test_filter_by_project(self, authed_client, test_deployment, test_project):
        resp = await authed_client.get("/api/v1/deployments", params={"project_id": test_project.id})
        assert resp.status_code == 200
        for d in resp.json():
            assert d["project_id"] == test_project.id

    async def test_filter_by_status(self, authed_client, test_deployment):
        resp = await authed_client.get("/api/v1/deployments", params={"status": "success"})
        assert resp.status_code == 200
        for d in resp.json():
            assert d["status"] == "success"


@pytest.mark.asyncio
class TestGetDeployment:
    async def test_get_own(self, authed_client, test_deployment):
        resp = await authed_client.get(f"/api/v1/deployments/{test_deployment.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == test_deployment.id
        assert resp.json()["version"] == "v1.0.0"

    async def test_nonexistent_404(self, authed_client):
        resp = await authed_client.get("/api/v1/deployments/bad-id")
        assert resp.status_code == 404

    async def test_get_logs(self, authed_client, test_deployment):
        resp = await authed_client.get(f"/api/v1/deployments/{test_deployment.id}/logs")
        assert resp.status_code == 200
        assert "logs" in resp.json()
        assert "error" in resp.json()
