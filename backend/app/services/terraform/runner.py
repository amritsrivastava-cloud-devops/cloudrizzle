"""
Terraform Runner Service
Handles: plan → apply → destroy operations
Runs Terraform as subprocess, captures output, parses results.
"""
import asyncio
import os
import json
import uuid
import shutil
from pathlib import Path
from typing import Optional
import structlog
from app.core.config import settings

logger = structlog.get_logger()


class TerraformRunner:
    """Executes Terraform commands safely in isolated workspaces."""

    def __init__(self, workspace_id: str):
        self.workspace_id = workspace_id
        self.workspace_dir = Path(settings.TERRAFORM_WORKING_DIR) / workspace_id
        self.terraform_bin = settings.TERRAFORM_BINARY_PATH

    def setup_workspace(self, terraform_code: str, variables: dict = None):
        """Create isolated workspace with Terraform files."""
        self.workspace_dir.mkdir(parents=True, exist_ok=True)

        # Write main.tf
        main_tf = self.workspace_dir / "main.tf"
        main_tf.write_text(terraform_code)

        # Write terraform.tfvars if variables provided
        if variables:
            tfvars = self.workspace_dir / "terraform.tfvars.json"
            tfvars.write_text(json.dumps(variables))

        # Write backend config (S3 state storage in production)
        backend_tf = self.workspace_dir / "backend.tf"
        backend_tf.write_text(f"""
terraform {{
  backend "local" {{
    path = "{self.workspace_dir}/terraform.tfstate"
  }}
}}
""")
        logger.info("Workspace created", workspace=str(self.workspace_dir))

    async def _run_command(self, args: list[str], timeout: int = 300) -> tuple[int, str, str]:
        """Run terraform command, return (returncode, stdout, stderr)."""
        cmd = [self.terraform_bin] + args
        logger.info("Running Terraform", cmd=" ".join(cmd))

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(self.workspace_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, "TF_IN_AUTOMATION": "true", "TF_CLI_ARGS": "-no-color"},
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            return proc.returncode, stdout.decode(), stderr.decode()

        except asyncio.TimeoutError:
            logger.error("Terraform command timed out", cmd=args)
            return 1, "", "Timeout: command exceeded maximum duration"

    async def init(self) -> tuple[bool, str]:
        """Run terraform init."""
        code, stdout, stderr = await self._run_command(["init", "-input=false"], timeout=120)
        success = code == 0
        if not success:
            logger.error("Terraform init failed", stderr=stderr)
        return success, stdout + stderr

    async def plan(self, plan_file: str = "tfplan") -> tuple[bool, str, dict]:
        """Run terraform plan, return (success, output, summary)."""
        plan_path = str(self.workspace_dir / plan_file)
        code, stdout, stderr = await self._run_command(
            ["plan", "-input=false", f"-out={plan_path}", "-detailed-exitcode"],
            timeout=300,
        )

        # Exit code 2 = success with changes
        success = code in (0, 2)
        output = stdout + stderr

        # Parse resource counts from output
        summary = self._parse_plan_summary(output)
        return success, output, summary

    async def apply(self, plan_file: str = "tfplan") -> tuple[bool, str]:
        """Run terraform apply on a saved plan."""
        plan_path = str(self.workspace_dir / plan_file)
        code, stdout, stderr = await self._run_command(
            ["apply", "-input=false", "-auto-approve", plan_path],
            timeout=600,
        )
        return code == 0, stdout + stderr

    async def destroy(self) -> tuple[bool, str]:
        """Run terraform destroy."""
        code, stdout, stderr = await self._run_command(
            ["destroy", "-input=false", "-auto-approve"],
            timeout=600,
        )
        return code == 0, stdout + stderr

    async def show_state(self) -> dict:
        """Get current terraform state as JSON."""
        code, stdout, stderr = await self._run_command(
            ["show", "-json"],
            timeout=60,
        )
        if code == 0:
            try:
                return json.loads(stdout)
            except json.JSONDecodeError:
                return {}
        return {}

    def _parse_plan_summary(self, output: str) -> dict:
        """Parse resource counts from terraform plan output."""
        summary = {"add": 0, "change": 0, "destroy": 0, "estimated_cost": 0.0}
        for line in output.split("\n"):
            line = line.strip()
            if "Plan:" in line:
                parts = line.split(",")
                for part in parts:
                    part = part.strip()
                    if "to add" in part:
                        try:
                            summary["add"] = int(part.split()[0])
                        except (ValueError, IndexError):
                            pass
                    elif "to change" in part:
                        try:
                            summary["change"] = int(part.split()[0])
                        except (ValueError, IndexError):
                            pass
                    elif "to destroy" in part:
                        try:
                            summary["destroy"] = int(part.split()[0])
                        except (ValueError, IndexError):
                            pass
        return summary

    def cleanup(self):
        """Remove workspace directory."""
        if self.workspace_dir.exists():
            shutil.rmtree(self.workspace_dir)
            logger.info("Workspace cleaned up", workspace=str(self.workspace_dir))


async def run_plan(terraform_code: str, cloud_credentials: dict) -> dict:
    """
    Public API: run terraform plan on given code.
    Returns plan summary with resource counts and estimated cost.
    """
    workspace_id = str(uuid.uuid4())
    runner = TerraformRunner(workspace_id)

    try:
        runner.setup_workspace(terraform_code)

        # Inject cloud credentials as env vars
        _inject_credentials(cloud_credentials)

        init_ok, init_output = await runner.init()
        if not init_ok:
            return {"error": "Terraform init failed", "output": init_output}

        plan_ok, plan_output, summary = await runner.plan()
        if not plan_ok:
            return {"error": "Terraform plan failed", "output": plan_output}

        return {
            "plan_id": workspace_id,
            "plan_output": plan_output,
            "resources_to_add": summary["add"],
            "resources_to_change": summary["change"],
            "resources_to_destroy": summary["destroy"],
            "estimated_cost": summary["estimated_cost"],
        }
    except Exception as e:
        logger.error("Plan failed", error=str(e))
        return {"error": str(e)}


async def run_apply(plan_id: str) -> dict:
    """Apply a previously created plan."""
    runner = TerraformRunner(plan_id)

    try:
        apply_ok, apply_output = await runner.apply()
        state = await runner.show_state()

        if apply_ok:
            return {"success": True, "output": apply_output, "state": state}
        else:
            return {"success": False, "output": apply_output, "error": "Apply failed"}
    except Exception as e:
        logger.error("Apply failed", error=str(e))
        return {"success": False, "error": str(e)}
    finally:
        # Don't cleanup — we need the state file
        pass


def _inject_credentials(credentials: dict):
    """Inject cloud credentials as environment variables."""
    for key, value in credentials.items():
        os.environ[key] = str(value)
