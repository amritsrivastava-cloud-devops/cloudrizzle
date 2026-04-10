"""Tests for /api/v1/admin routes."""
import pytest


@pytest.mark.asyncio
class TestAdminStats:
    async def test_requires_admin(self, authed_client):
        resp = await authed_client.get("/api/v1/admin/stats")
        assert resp.status_code == 403

    async def test_returns_data(self, admin_client):
        resp = await admin_client.get("/api/v1/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        for field in ["total_users", "total_projects", "total_deployments", "failed_deployments_30d", "mrr", "arr"]:
            assert field in data

    async def test_requires_auth(self, client):
        resp = await client.get("/api/v1/admin/stats")
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestAdminUsers:
    async def test_list_requires_admin(self, authed_client):
        resp = await authed_client.get("/api/v1/admin/users")
        assert resp.status_code == 403

    async def test_list_returns_all(self, admin_client, test_user):
        resp = await admin_client.get("/api/v1/admin/users")
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data and "total" in data

    async def test_get_user_detail(self, admin_client, test_user):
        resp = await admin_client.get(f"/api/v1/admin/users/{test_user.id}")
        assert resp.status_code == 200
        assert resp.json()["email"] == test_user.email
        assert "project_count" in resp.json()

    async def test_get_nonexistent_404(self, admin_client):
        resp = await admin_client.get("/api/v1/admin/users/bad-id")
        assert resp.status_code == 404

    async def test_suspend_unsuspend(self, admin_client, db_session, test_user):
        resp = await admin_client.post(f"/api/v1/admin/users/{test_user.id}/suspend")
        assert resp.status_code == 200
        await db_session.refresh(test_user)
        assert test_user.status == "suspended"

        resp = await admin_client.post(f"/api/v1/admin/users/{test_user.id}/unsuspend")
        assert resp.status_code == 200
        await db_session.refresh(test_user)
        assert test_user.status == "active"


@pytest.mark.asyncio
class TestAdminMonitoring:
    async def test_platform_metrics_requires_admin(self, authed_client):
        resp = await authed_client.get("/api/v1/admin/monitoring/platform")
        assert resp.status_code == 403

    async def test_platform_metrics_structure(self, admin_client):
        resp = await admin_client.get("/api/v1/admin/monitoring/platform")
        assert resp.status_code == 200
        data = resp.json()
        for field in ["cpu_percent", "memory_percent", "api_latency_ms", "uptime_percent"]:
            assert field in data

    async def test_platform_logs(self, admin_client):
        resp = await admin_client.get("/api/v1/admin/monitoring/logs")
        assert resp.status_code == 200
        assert isinstance(resp.json()["logs"], list)


@pytest.mark.asyncio
class TestAdminRevenue:
    async def test_requires_admin(self, authed_client):
        resp = await authed_client.get("/api/v1/admin/revenue/summary")
        assert resp.status_code == 403

    async def test_structure(self, admin_client):
        resp = await admin_client.get("/api/v1/admin/revenue/summary")
        assert resp.status_code == 200
        for f in ["mrr", "arr", "churn_rate", "arpu", "by_plan"]:
            assert f in resp.json()
