"""Tests for /api/v1/projects routes."""
import pytest
from app.models.user import Project


@pytest.mark.asyncio
class TestListProjects:
    async def test_list_returns_user_projects(self, authed_client, test_project):
        resp = await authed_client.get("/api/v1/projects")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(p["id"] == test_project.id for p in data)

    async def test_list_requires_auth(self, client):
        resp = await client.get("/api/v1/projects")
        assert resp.status_code == 401

    async def test_filter_by_cloud(self, authed_client, test_project):
        resp = await authed_client.get("/api/v1/projects", params={"cloud": "aws"})
        assert resp.status_code == 200
        for p in resp.json():
            assert p["cloud"] == "aws"


@pytest.mark.asyncio
class TestCreateProject:
    async def test_create_success(self, authed_client):
        resp = await authed_client.post("/api/v1/projects", json={
            "name": "My New Project", "cloud": "aws", "environment": "staging"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My New Project"
        assert data["cloud"] == "aws"
        assert data["status"] == "active"

    async def test_create_requires_auth(self, client):
        resp = await client.post("/api/v1/projects", json={
            "name": "Unauthed", "cloud": "aws", "environment": "production"
        })
        assert resp.status_code == 401

    async def test_name_too_short_returns_422(self, authed_client):
        resp = await authed_client.post("/api/v1/projects", json={
            "name": "X", "cloud": "aws", "environment": "production"
        })
        assert resp.status_code == 422

    async def test_invalid_cloud_returns_422(self, authed_client):
        resp = await authed_client.post("/api/v1/projects", json={
            "name": "Valid Name", "cloud": "invalid", "environment": "production"
        })
        assert resp.status_code == 422


@pytest.mark.asyncio
class TestGetProject:
    async def test_get_own_project(self, authed_client, test_project):
        resp = await authed_client.get(f"/api/v1/projects/{test_project.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == test_project.id

    async def test_get_nonexistent_404(self, authed_client):
        resp = await authed_client.get("/api/v1/projects/does-not-exist")
        assert resp.status_code == 404

    async def test_cannot_access_other_users_project(self, authed_client, db_session, test_admin):
        p = Project(id="admin-proj", user_id=test_admin.id, name="Admin Project",
                    cloud="gcp", environment="production", status="active")
        db_session.add(p)
        await db_session.commit()
        resp = await authed_client.get("/api/v1/projects/admin-proj")
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestUpdateProject:
    async def test_update_name(self, authed_client, test_project):
        resp = await authed_client.put(f"/api/v1/projects/{test_project.id}",
                                       json={"name": "Updated Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    async def test_update_nonexistent_404(self, authed_client):
        resp = await authed_client.put("/api/v1/projects/bad-id", json={"name": "X"})
        assert resp.status_code == 404


@pytest.mark.asyncio
class TestDeleteProject:
    async def test_delete_own_project(self, authed_client, db_session, test_user):
        p = Project(id="to-delete", user_id=test_user.id, name="Delete Me",
                    cloud="aws", environment="development", status="active")
        db_session.add(p)
        await db_session.commit()
        resp = await authed_client.delete("/api/v1/projects/to-delete")
        assert resp.status_code == 204

    async def test_delete_nonexistent_404(self, authed_client):
        resp = await authed_client.delete("/api/v1/projects/bad-id")
        assert resp.status_code == 404
