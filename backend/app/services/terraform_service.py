"""
Terraform Service — executes terraform plan and apply via subprocess.
All state is stored in the configured S3 backend (or local for dev).
"""

import asyncio
import os
import json
import tempfile
import shutil
import logging
from pathlib import Path
from uuid import UUID
from app.core.config import settings

logger = logging.getLogger(__name__)


async def run_terraform_plan(
    project_id: UUID,
    terraform_code: str,
    vars: dict,
) -> str:
    """
    Write HCL to a temp dir, run 'terraform init && terraform plan'.
    Returns plan output as string.
    """
    work_dir = _create_workdir(project_id)
    try:
        _write_terraform_files(work_dir, terraform_code, vars)

        # terraform init
        init_out = await _run_tf(["terraform", "init", "-no-color"], work_dir)
        logger.info(f"[{project_id}] terraform init OK")

        # terraform plan
        plan_out = await _run_tf(
            ["terraform", "plan", "-no-color", "-var-file=terraform.tfvars.json"],
            work_dir,
        )
        logger.info(f"[{project_id}] terraform plan OK")
        return f"=== INIT ===\n{init_out}\n\n=== PLAN ===\n{plan_out}"

    except RuntimeError as e:
        logger.error(f"[{project_id}] terraform plan FAILED: {e}")
        raise
    finally:
        _cleanup_workdir(work_dir)


async def run_terraform_apply(
    project_id: UUID,
    terraform_code: str,
    vars: dict,
) -> str:
    """
    Run 'terraform apply -auto-approve'.
    Returns apply output.
    """
    work_dir = _create_workdir(project_id)
    try:
        _write_terraform_files(work_dir, terraform_code, vars)

        await _run_tf(["terraform", "init", "-no-color"], work_dir)

        apply_out = await _run_tf(
            ["terraform", "apply", "-auto-approve", "-no-color", "-var-file=terraform.tfvars.json"],
            work_dir,
        )
        logger.info(f"[{project_id}] terraform apply OK")
        return apply_out

    except RuntimeError as e:
        logger.error(f"[{project_id}] terraform apply FAILED: {e}")
        raise
    finally:
        _cleanup_workdir(work_dir)


async def run_terraform_destroy(
    project_id: UUID,
    terraform_code: str,
    vars: dict,
) -> str:
    work_dir = _create_workdir(project_id)
    try:
        _write_terraform_files(work_dir, terraform_code, vars)
        await _run_tf(["terraform", "init", "-no-color"], work_dir)
        out = await _run_tf(
            ["terraform", "destroy", "-auto-approve", "-no-color"],
            work_dir,
        )
        return out
    finally:
        _cleanup_workdir(work_dir)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _create_workdir(project_id: UUID) -> Path:
    base = Path(settings.TERRAFORM_WORKDIR)
    base.mkdir(parents=True, exist_ok=True)
    work_dir = Path(tempfile.mkdtemp(prefix=f"tf-{project_id}-", dir=base))
    return work_dir


def _cleanup_workdir(work_dir: Path):
    try:
        shutil.rmtree(work_dir, ignore_errors=True)
    except Exception as e:
        logger.warning(f"Could not clean up {work_dir}: {e}")


def _write_terraform_files(work_dir: Path, hcl_code: str, vars: dict):
    # Main Terraform file
    (work_dir / "main.tf").write_text(hcl_code)

    # Variable values
    (work_dir / "terraform.tfvars.json").write_text(json.dumps(vars, indent=2))

    # Backend config (if S3 bucket configured)
    if settings.TERRAFORM_STATE_BUCKET:
        backend = f'''
terraform {{
  backend "s3" {{
    bucket = "{settings.TERRAFORM_STATE_BUCKET}"
    key    = "cloudrizzle/state.tfstate"
    region = "us-east-1"
  }}
}}
'''
        (work_dir / "backend.tf").write_text(backend)


async def _run_tf(cmd: list[str], cwd: Path, timeout: int = 300) -> str:
    """Run a terraform command asynchronously, capture output."""
    env = {**os.environ}

    # Ensure terraform binary is available
    tf_bin = shutil.which("terraform") or settings.TERRAFORM_BIN
    if not tf_bin or not Path(tf_bin).exists():
        raise RuntimeError(
            "Terraform binary not found. Install terraform: https://developer.hashicorp.com/terraform/downloads"
        )

    cmd[0] = tf_bin  # Replace 'terraform' with full path

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(cwd),
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        output = stdout.decode("utf-8", errors="replace")

        if proc.returncode != 0:
            raise RuntimeError(f"Command {' '.join(cmd)} failed:\n{output}")

        return output
    except asyncio.TimeoutError:
        proc.kill()
        raise RuntimeError(f"Terraform command timed out after {timeout}s")
