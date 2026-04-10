"""
Tests for the Terraform runner service
"""
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.terraform.runner import TerraformRunner


def test_setup_workspace_creates_files(tmp_path):
    """setup_workspace creates main.tf and backend.tf."""
    runner = TerraformRunner("test-workspace-001")
    runner.workspace_dir = tmp_path / "workspace"

    terraform_code = 'resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }'
    runner.setup_workspace(terraform_code)

    assert (runner.workspace_dir / "main.tf").exists()
    assert (runner.workspace_dir / "backend.tf").exists()

    content = (runner.workspace_dir / "main.tf").read_text()
    assert terraform_code in content


def test_setup_workspace_with_variables(tmp_path):
    """setup_workspace writes tfvars when variables provided."""
    runner = TerraformRunner("test-workspace-002")
    runner.workspace_dir = tmp_path / "workspace"

    runner.setup_workspace(
        'resource "aws_vpc" "main" {}',
        variables={"region": "us-east-1", "env": "production"},
    )

    assert (runner.workspace_dir / "terraform.tfvars.json").exists()


def test_cleanup_removes_workspace(tmp_path):
    """cleanup() removes the workspace directory."""
    runner = TerraformRunner("test-workspace-003")
    runner.workspace_dir = tmp_path / "workspace"
    runner.workspace_dir.mkdir(parents=True)
    (runner.workspace_dir / "main.tf").write_text("test")

    assert runner.workspace_dir.exists()
    runner.cleanup()
    assert not runner.workspace_dir.exists()


def test_parse_plan_summary_add():
    """_parse_plan_summary correctly extracts add/change/destroy counts."""
    runner = TerraformRunner("test")
    output = """
Terraform will perform the following actions:

  # aws_vpc.main will be created
  + resource "aws_vpc" "main" {}

  # aws_subnet.public will be created
  + resource "aws_subnet" "public" {}

Plan: 2 to add, 0 to change, 0 to destroy.
"""
    summary = runner._parse_plan_summary(output)
    assert summary["add"] == 2
    assert summary["change"] == 0
    assert summary["destroy"] == 0


def test_parse_plan_summary_mixed():
    runner = TerraformRunner("test")
    output = "Plan: 3 to add, 1 to change, 2 to destroy."
    summary = runner._parse_plan_summary(output)
    assert summary["add"] == 3
    assert summary["change"] == 1
    assert summary["destroy"] == 2


def test_parse_plan_summary_no_changes():
    runner = TerraformRunner("test")
    output = "No changes. Your infrastructure matches the configuration."
    summary = runner._parse_plan_summary(output)
    assert summary["add"] == 0
    assert summary["change"] == 0
    assert summary["destroy"] == 0


@pytest.mark.asyncio
async def test_run_command_timeout():
    """Commands that exceed timeout return error."""
    runner = TerraformRunner("test-timeout")

    import asyncio
    with patch("asyncio.create_subprocess_exec") as mock_proc:
        mock_process = AsyncMock()
        mock_process.communicate = AsyncMock(side_effect=asyncio.TimeoutError())
        mock_proc.return_value = mock_process

        code, stdout, stderr = await runner._run_command(["init"], timeout=1)
        assert code == 1
        assert "Timeout" in stderr


@pytest.mark.asyncio
async def test_run_plan_success():
    """run_plan returns plan summary on success."""
    from app.services.terraform.runner import run_plan

    with patch("app.services.terraform.runner.TerraformRunner") as MockRunner:
        instance = AsyncMock()
        instance.init = AsyncMock(return_value=(True, "Initialized!"))
        instance.plan = AsyncMock(
            return_value=(True, "Plan: 3 to add", {"add": 3, "change": 0, "destroy": 0, "estimated_cost": 0.0})
        )
        MockRunner.return_value = instance

        result = await run_plan("resource \"aws_vpc\" \"main\" {}", {})

    assert "plan_id" in result
    assert result["resources_to_add"] == 3
    assert result["resources_to_change"] == 0


@pytest.mark.asyncio
async def test_run_plan_init_failure():
    """run_plan returns error if terraform init fails."""
    from app.services.terraform.runner import run_plan

    with patch("app.services.terraform.runner.TerraformRunner") as MockRunner:
        instance = AsyncMock()
        instance.init = AsyncMock(return_value=(False, "Error: failed to install providers"))
        MockRunner.return_value = instance

        result = await run_plan("invalid terraform", {})

    assert "error" in result
    assert "init" in result["error"].lower()
