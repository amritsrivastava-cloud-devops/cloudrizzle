"""Tests for /api/v1/templates routes."""
import pytest


@pytest.mark.asyncio
class TestTemplates:
    async def test_list_no_auth_needed(self, client, test_template):
        resp = await client.get("/api/v1/templates")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_filter_by_cloud(self, client, test_template):
        resp = await client.get("/api/v1/templates", params={"cloud": "aws"})
        assert resp.status_code == 200
        for t in resp.json():
            assert t["cloud"] == "aws"

    async def test_get_by_id(self, client, test_template):
        resp = await client.get(f"/api/v1/templates/{test_template.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == test_template.id
        assert "terraform_code" in data

    async def test_nonexistent_404(self, client):
        resp = await client.get("/api/v1/templates/bad-id")
        assert resp.status_code == 404

    async def test_get_increments_usage(self, client, test_template, db_session):
        original = test_template.usage_count
        await client.get(f"/api/v1/templates/{test_template.id}")
        await db_session.refresh(test_template)
        assert test_template.usage_count == original + 1
