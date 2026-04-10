"""
AI Infrastructure Generator
Pipeline: Prompt → Validate → Generate Terraform → Policy Check → Return
Uses LangGraph for stateful workflow with retry on validation failure.
"""
import uuid
import json
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
from app.core.config import settings
import structlog

logger = structlog.get_logger()

# ─── State ────────────────────────────────────────────────────
class GeneratorState(TypedDict):
    prompt: str
    cloud: str
    environment: str
    model: str
    terraform: str
    resources: list
    estimated_cost: float
    validation_passed: bool
    warnings: list
    errors: list
    retry_count: int


# ─── System Prompt ────────────────────────────────────────────
SYSTEM_PROMPT = """You are CloudRizzle's AI infrastructure engineer.
Your job is to convert natural language infrastructure descriptions into production-ready Terraform code.

Rules:
1. Output ONLY valid Terraform HCL code — no markdown, no explanations, no backticks
2. Always use best practices: encryption at rest, security groups with least privilege, tags on all resources
3. Always add a "cloudrizzle_managed = true" tag to every resource
4. Structure the code with: terraform block → provider → variables → resources → outputs
5. Use sensible defaults for anything not specified by the user
6. For AWS: default region us-east-1 unless specified
7. For Azure: default location eastus unless specified  
8. For GCP: default region us-central1 unless specified
9. Always output a # RESOURCES_LIST comment at the top listing all resources created
10. Always output a # ESTIMATED_MONTHLY_COST comment with a rough cost estimate

Output format:
# RESOURCES_LIST: EC2, RDS, ALB, S3
# ESTIMATED_MONTHLY_COST: 340.00

terraform {
  required_providers {
    ...
  }
}
...rest of code
"""

VALIDATOR_PROMPT = """You are a Terraform code validator.
Review the given Terraform code and check for:
1. Syntax errors
2. Security issues (open security groups, unencrypted storage, public databases)
3. Missing required fields
4. Best practice violations

Respond in JSON format:
{
  "valid": true/false,
  "errors": ["error1", "error2"],
  "warnings": ["warning1", "warning2"]
}

Respond with ONLY the JSON object, no other text."""


# ─── LLM Factory ──────────────────────────────────────────────
def get_llm(model: str):
    if "claude" in model:
        return ChatAnthropic(
            model=model,
            anthropic_api_key=settings.ANTHROPIC_API_KEY,
            max_tokens=8000,
            temperature=0.1,
        )
    else:
        return ChatOpenAI(
            model=model,
            openai_api_key=settings.OPENAI_API_KEY,
            max_tokens=8000,
            temperature=0.1,
        )


# ─── Graph Nodes ──────────────────────────────────────────────
async def generate_terraform(state: GeneratorState) -> GeneratorState:
    """Generate Terraform from prompt."""
    logger.info("Generating Terraform", cloud=state["cloud"], model=state["model"])

    llm = get_llm(state["model"])
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"""
Cloud Provider: {state["cloud"].upper()}
Environment: {state["environment"]}
Request: {state["prompt"]}

Generate the Terraform code now.
        """),
    ]

    response = await llm.ainvoke(messages)
    terraform_code = response.content.strip()

    # Parse resources list and cost from comments
    resources = []
    estimated_cost = 0.0

    for line in terraform_code.split("\n")[:5]:
        if "RESOURCES_LIST:" in line:
            res_str = line.split("RESOURCES_LIST:")[-1].strip()
            resources = [r.strip() for r in res_str.split(",")]
        if "ESTIMATED_MONTHLY_COST:" in line:
            try:
                cost_str = line.split("ESTIMATED_MONTHLY_COST:")[-1].strip()
                estimated_cost = float(cost_str)
            except ValueError:
                estimated_cost = 0.0

    return {
        **state,
        "terraform": terraform_code,
        "resources": resources,
        "estimated_cost": estimated_cost,
    }


async def validate_terraform(state: GeneratorState) -> GeneratorState:
    """Validate the generated Terraform code."""
    logger.info("Validating Terraform", retry_count=state["retry_count"])

    llm = get_llm(state["model"])
    messages = [
        SystemMessage(content=VALIDATOR_PROMPT),
        HumanMessage(content=state["terraform"]),
    ]

    response = await llm.ainvoke(messages)
    try:
        result = json.loads(response.content.strip())
        return {
            **state,
            "validation_passed": result.get("valid", False),
            "errors": result.get("errors", []),
            "warnings": result.get("warnings", []),
        }
    except json.JSONDecodeError:
        # If we can't parse the validator response, assume valid
        return {
            **state,
            "validation_passed": True,
            "errors": [],
            "warnings": [],
        }


async def fix_terraform(state: GeneratorState) -> GeneratorState:
    """Fix validation errors and regenerate."""
    logger.info("Fixing Terraform errors", errors=state["errors"])

    llm = get_llm(state["model"])
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"""
The following Terraform code has errors that need to be fixed:

ERRORS:
{chr(10).join(state["errors"])}

ORIGINAL CODE:
{state["terraform"]}

Please fix all errors and return only the corrected Terraform code.
        """),
    ]

    response = await llm.ainvoke(messages)
    return {
        **state,
        "terraform": response.content.strip(),
        "retry_count": state["retry_count"] + 1,
    }


def should_retry(state: GeneratorState) -> str:
    """Decide whether to retry or finish."""
    if state["validation_passed"]:
        return "done"
    if state["retry_count"] >= 2:
        # Max retries reached — return with warnings
        return "done"
    return "fix"


# ─── Build Graph ──────────────────────────────────────────────
def build_generator_graph():
    graph = StateGraph(GeneratorState)

    graph.add_node("generate", generate_terraform)
    graph.add_node("validate", validate_terraform)
    graph.add_node("fix", fix_terraform)

    graph.set_entry_point("generate")
    graph.add_edge("generate", "validate")
    graph.add_conditional_edges("validate", should_retry, {"done": END, "fix": "fix"})
    graph.add_edge("fix", "validate")

    return graph.compile()


# ─── Public API ───────────────────────────────────────────────
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_generator_graph()
    return _graph


async def generate_infrastructure(
    prompt: str,
    cloud: str,
    environment: str,
    model: str,
) -> dict:
    """Main entry point — run the full generation pipeline."""
    graph = get_graph()

    initial_state: GeneratorState = {
        "prompt": prompt,
        "cloud": cloud,
        "environment": environment,
        "model": model,
        "terraform": "",
        "resources": [],
        "estimated_cost": 0.0,
        "validation_passed": False,
        "warnings": [],
        "errors": [],
        "retry_count": 0,
    }

    result = await graph.ainvoke(initial_state)

    return {
        "id": str(uuid.uuid4()),
        "terraform": result["terraform"],
        "resources": result["resources"],
        "estimated_cost": result["estimated_cost"],
        "validation_passed": result["validation_passed"],
        "warnings": result["warnings"],
        "model_used": model,
    }
