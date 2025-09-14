#!/usr/bin/env python3
"""
FastAPI server for Journey Workflow Management

Provides REST API endpoints for the frontend to interact with
the Journey orchestrator and YAML workflow files.
"""

import sys
from pathlib import Path
from typing import Any, Dict, List

import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add the src directory to the path to import journey
sys.path.insert(0, str(Path(__file__).parent / "src"))

from examples.guided_meditation.functions import register_meditation_tools
from examples.what_is_the_status_of_my_loan.functions import register_acme_tools
from journey import ActionRegistry, Orchestrator, ToolRegistry
from journey.tool_registry import ToolDefinition


# Pydantic models for API requests/responses
class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str
    variables: List[str]
    nodes: List[Dict[str, Any]]
    path: str


class WorkflowListItem(BaseModel):
    id: str
    name: str
    description: str
    path: str
    node_count: int
    variable_count: int


class NodeRequest(BaseModel):
    id: str
    title: str
    blocks: List[Dict[str, Any]]


class WorkflowExecutionRequest(BaseModel):
    session_state: Dict[str, Any]


class WorkflowExecutionResponse(BaseModel):
    actions: List[Dict[str, Any]]
    session_state: Dict[str, Any]


class VariableUpdateRequest(BaseModel):
    variable_name: str
    value: Any


class ToolCatalogResponse(BaseModel):
    tools: List[ToolDefinition]
    categories: List[str]


# Global state
workflows_cache: Dict[str, Dict[str, Any]] = {}
action_registry = ActionRegistry()
tool_registry = ToolRegistry()

# Initialize immediately
register_acme_tools(tool_registry)
print("Registered ACME Financial tools")
register_meditation_tools(tool_registry)
print("Registered Guided Meditation tools")


app = FastAPI(
    title="Journey Workflow API",
    description="API for managing and executing Journey workflows",
    version="1.0.0",
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:8084",
        "http://localhost:8085",
        "http://localhost:8086",
        "http://localhost:8087",
        "http://localhost:8088",
        "http://localhost:8089",
        "http://localhost:8090",
        "http://localhost:8091",
        "http://localhost:8092",
        "http://localhost:8093",
        "http://localhost:8094",
        "http://localhost:8095",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:8083",
        "http://127.0.0.1:8084",
        "http://127.0.0.1:8085",
        "http://127.0.0.1:8086",
        "http://127.0.0.1:8087",
        "http://127.0.0.1:8088",
        "http://127.0.0.1:8089",
        "http://127.0.0.1:8090",
        "http://127.0.0.1:8091",
        "http://127.0.0.1:8092",
        "http://127.0.0.1:8093",
        "http://127.0.0.1:8094",
        "http://127.0.0.1:8095",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def load_available_workflows():
    """Load all available workflow files"""
    # Load from examples directory
    examples_dir = Path(__file__).parent / "examples"
    for yaml_file in examples_dir.rglob("*.yaml"):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                workflow_data = yaml.safe_load(f)
                # Handle empty YAML files
                if workflow_data is None:
                    workflow_data = {
                        "id": yaml_file.stem,
                        "name": yaml_file.stem.replace("_", " ").title(),
                        "description": "Empty workflow",
                        "variables": [],
                        "nodes": [],
                    }
                # Make path relative to backend directory
                relative_path = yaml_file.relative_to(Path(__file__).parent)
                workflows_cache[str(relative_path)] = workflow_data
                print(f"Loaded workflow: {relative_path}")
        except Exception as e:
            print(f"Failed to load workflow {yaml_file}: {e}")


@app.on_event("startup")
async def startup_event():
    """Load workflows on startup"""
    await load_available_workflows()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Journey Workflow API is running", "version": "1.0.0"}


@app.get("/api/workflows", response_model=List[WorkflowListItem])
async def list_workflows():
    """Get list of available workflows"""
    workflows = []
    for path, data in workflows_cache.items():
        workflows.append(
            WorkflowListItem(
                path=path,
                id=data.get("id", "unknown"),
                name=data.get("name", "Untitled"),
                description=data.get("description", ""),
                node_count=len(data.get("nodes", [])),
                variable_count=len(data.get("variables", [])),
            )
        )
    return workflows


@app.get("/api/workflows/{workflow_path:path}", response_model=WorkflowResponse)
async def get_workflow(workflow_path: str):
    """Get a specific workflow"""
    # Try to find in cache first
    if workflow_path in workflows_cache:
        data = workflows_cache[workflow_path]
        return WorkflowResponse(
            id=data.get("id", "unknown"),
            name=data.get("name", "Untitled"),
            description=data.get("description", ""),
            variables=data.get("variables", []),
            nodes=data.get("nodes", []),
            path=workflow_path,
        )

    # Try to load if not in cache
    full_path = Path(__file__).parent / workflow_path
    if full_path.exists():
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                workflow_data = yaml.safe_load(f)
                workflows_cache[workflow_path] = workflow_data
                return WorkflowResponse(
                    id=workflow_data.get("id", "unknown"),
                    name=workflow_data.get("name", "Untitled"),
                    description=workflow_data.get("description", ""),
                    variables=workflow_data.get("variables", []),
                    nodes=workflow_data.get("nodes", []),
                    path=workflow_path,
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load workflow: {e}")

    raise HTTPException(status_code=404, detail="Workflow not found")


@app.put("/api/workflows/{workflow_path:path}")
async def save_workflow(workflow_path: str, workflow_data: Dict[str, Any]):
    """Save a workflow"""
    full_path = Path(__file__).parent / workflow_path

    try:
        # Ensure directory exists
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Save the workflow
        with open(full_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(
                workflow_data,
                f,
                default_flow_style=False,
                sort_keys=False,
                allow_unicode=True,
                width=None,
                indent=2,
            )

        # Update cache
        workflows_cache[workflow_path] = workflow_data

        return {"message": "Workflow saved successfully", "path": workflow_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save workflow: {e}")


class CreateWorkflowRequest(BaseModel):
    name: str
    description: str = ""


@app.post("/api/workflows/create")
async def create_new_workflow(request: CreateWorkflowRequest):
    """Create a new workflow with an empty structure"""
    try:
        # Create folder name from workflow name (sanitize for filesystem)
        folder_name = request.name.lower().replace(" ", "_").replace("-", "_")
        # Remove any non-alphanumeric characters except underscores
        import re

        folder_name = re.sub(r"[^a-zA-Z0-9_]", "", folder_name)

        # Create the examples subfolder
        examples_dir = Path(__file__).parent / "examples" / folder_name
        examples_dir.mkdir(parents=True, exist_ok=True)

        # Create the workflow file
        workflow_filename = f"{folder_name}.yaml"
        workflow_path = examples_dir / workflow_filename
        relative_path = workflow_path.relative_to(Path(__file__).parent)

        # Create empty workflow structure
        empty_workflow = {
            "id": folder_name,
            "name": request.name,
            "description": request.description or f"New workflow: {request.name}",
            "variables": [],
            "nodes": [],
        }

        # Save the workflow
        with open(workflow_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(
                empty_workflow,
                f,
                default_flow_style=False,
                sort_keys=False,
                allow_unicode=True,
                width=None,
                indent=2,
            )

        # Update cache
        workflows_cache[str(relative_path)] = empty_workflow

        return {
            "message": "Workflow created successfully",
            "path": str(relative_path),
            "folder": folder_name,
            "workflow": empty_workflow,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {e}")


@app.post("/api/workflows/{workflow_path:path}/execute")
async def execute_workflow_step(workflow_path: str, request: WorkflowExecutionRequest):
    """Execute the next step in a workflow"""
    full_path = Path(__file__).parent / workflow_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")

    try:
        # Create orchestrator
        orchestrator = Orchestrator(str(full_path), action_registry, tool_registry)

        # Get next actions
        actions = orchestrator.get_next_step(request.session_state)

        return WorkflowExecutionResponse(
            actions=actions, session_state=request.session_state
        )
    except Exception as e:
        print(f"Workflow execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {e}")


@app.get("/api/tools", response_model=ToolCatalogResponse)
async def get_tool_catalog():
    """Get all available tools with their type information"""
    tools = tool_registry.list_tools()
    categories = list(set(tool.category for tool in tools))

    return ToolCatalogResponse(tools=tools, categories=sorted(categories))


@app.get("/api/tools/{tool_name}", response_model=ToolDefinition)
async def get_tool_definition(tool_name: str):
    """Get detailed information about a specific tool"""
    tool_def = tool_registry.get_tool_definition(tool_name)
    if not tool_def:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")
    return tool_def


@app.get("/api/tools/category/{category}", response_model=List[ToolDefinition])
async def get_tools_by_category(category: str):
    """Get tools filtered by category"""
    tools = tool_registry.get_tools_by_category(category)
    if not tools:
        raise HTTPException(
            status_code=404, detail=f"No tools found in category '{category}'"
        )
    return tools


# Legacy compatibility endpoints - redirect to new tool endpoints
@app.get("/api/functions", response_model=ToolCatalogResponse)
async def get_function_catalog_legacy():
    """Legacy endpoint: Get all available functions (now tools)"""
    return await get_tool_catalog()


@app.get("/api/functions/{function_name}", response_model=ToolDefinition)
async def get_function_definition_legacy(function_name: str):
    """Legacy endpoint: Get function definition (now tool)"""
    return await get_tool_definition(function_name)


@app.get("/api/functions/category/{category}", response_model=List[ToolDefinition])
async def get_functions_by_category_legacy(category: str):
    """Legacy endpoint: Get functions by category (now tools)"""
    return await get_tools_by_category(category)


@app.post("/api/workflows/{workflow_path:path}/nodes/{node_index}")
async def update_node(workflow_path: str, node_index: int, node_data: NodeRequest):
    """Update a specific node in a workflow"""
    full_path = Path(__file__).parent / workflow_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")

    try:
        # Load current workflow
        with open(full_path, "r", encoding="utf-8") as f:
            workflow = yaml.safe_load(f)

        # Update the node
        if 0 <= node_index < len(workflow.get("nodes", [])):
            workflow["nodes"][node_index] = {
                "id": node_data.id,
                "title": node_data.title,
                "blocks": node_data.blocks,
            }

            # Save back to file
            with open(full_path, "w", encoding="utf-8") as f:
                yaml.safe_dump(
                    workflow,
                    f,
                    default_flow_style=False,
                    sort_keys=False,
                    allow_unicode=True,
                    width=None,
                    indent=2,
                )

            # Update cache
            workflows_cache[workflow_path] = workflow

            return {"message": "Node updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Invalid node index")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update node: {e}")


@app.post("/api/workflows/{workflow_path:path}/nodes")
async def add_node(workflow_path: str, node_data: NodeRequest):
    """Add a new node to a workflow"""
    full_path = Path(__file__).parent / workflow_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")

    try:
        # Load current workflow
        with open(full_path, "r", encoding="utf-8") as f:
            workflow = yaml.safe_load(f)

        # Add the new node
        new_node = {
            "id": node_data.id,
            "title": node_data.title,
            "blocks": node_data.blocks,
        }

        if "nodes" not in workflow:
            workflow["nodes"] = []
        workflow["nodes"].append(new_node)

        # Save back to file
        with open(full_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(
                workflow,
                f,
                default_flow_style=False,
                sort_keys=False,
                allow_unicode=True,
                width=None,
                indent=2,
            )

        # Update cache
        workflows_cache[workflow_path] = workflow

        return {
            "message": "Node added successfully",
            "node_index": len(workflow["nodes"]) - 1,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add node: {e}")


@app.delete("/api/workflows/{workflow_path:path}/nodes/{node_index}")
async def delete_node(workflow_path: str, node_index: int):
    """Delete a node from a workflow"""
    full_path = Path(__file__).parent / workflow_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Workflow not found")

    try:
        # Load current workflow
        with open(full_path, "r", encoding="utf-8") as f:
            workflow = yaml.safe_load(f)

        # Delete the node
        if 0 <= node_index < len(workflow.get("nodes", [])):
            deleted_node = workflow["nodes"].pop(node_index)

            # Save back to file
            with open(full_path, "w", encoding="utf-8") as f:
                yaml.safe_dump(
                    workflow,
                    f,
                    default_flow_style=False,
                    sort_keys=False,
                    allow_unicode=True,
                    width=None,
                    indent=2,
                )

            # Update cache
            workflows_cache[workflow_path] = workflow

            return {
                "message": "Node deleted successfully",
                "deleted_node": deleted_node,
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid node index")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete node: {e}")


@app.get("/api/block-types")
async def get_block_types():
    """Get available block types and their schemas"""
    block_types = {
        "PRESENT_CONTENT": {
            "description": "Display content to the user",
            "required_fields": ["payload"],
            "optional_fields": [],
            "field_types": {"payload": "text"},
        },
        "AWAIT_USER_INPUT": {
            "description": "Wait for user input and store in variable",
            "required_fields": [],
            "optional_fields": ["target"],
            "field_types": {"target": "variable_name"},
        },
        "SET_VARIABLE": {
            "description": "Set a variable to a specific value",
            "required_fields": ["target", "source"],
            "optional_fields": [],
            "field_types": {"target": "variable_name", "source": "text_or_function"},
        },
        "UPDATE_VARIABLE": {
            "description": "Update a variable with an operation",
            "required_fields": ["target", "source", "operation"],
            "optional_fields": [],
            "field_types": {
                "target": "variable_name",
                "source": "text",
                "operation": "operation_type",
            },
        },
        "ANALYZE_RESPONSE": {
            "description": "Analyze a response using a function",
            "required_fields": ["input", "criteria", "output_bool"],
            "optional_fields": [],
            "field_types": {
                "input": "variable_reference",
                "criteria": "function_name",
                "output_bool": "variable_name",
            },
        },
        "CONDITION": {
            "description": "Conditional logic with structured rules",
            "required_fields": ["rules"],
            "optional_fields": [],
            "field_types": {"rules": "structured_condition_rules"},
        },
        "GOTO_NODE": {
            "description": "Navigate to another node",
            "required_fields": ["target"],
            "optional_fields": [],
            "field_types": {"target": "node_id"},
        },
        "END_WORKFLOW": {
            "description": "End the workflow execution",
            "required_fields": [],
            "optional_fields": [],
            "field_types": {},
        },
    }
    return block_types


@app.get("/api/variables")
async def get_common_variables():
    """Get commonly used variable names"""
    common_variables = [
        "Context",
        "Latest User Response",
    ]
    return {"variables": common_variables}


@app.get("/api/actions")
async def get_action_catalog():
    """Get all available actions with their type information"""
    actions = action_registry.list_actions()
    categories = list(set(action.category for action in actions))

    return {"actions": actions, "categories": categories}


@app.get("/api/actions/{action_name}")
async def get_action_definition(action_name: str):
    """Get definition for a specific action"""
    action_def = action_registry.get_action_definition(action_name)
    if not action_def:
        raise HTTPException(status_code=404, detail=f"Action '{action_name}' not found")
    return action_def


@app.get("/api/actions/category/{category}")
async def get_actions_by_category(category: str):
    """Get actions filtered by category"""
    actions = action_registry.get_actions_by_category(category)
    if not actions:
        raise HTTPException(
            status_code=404, detail=f"No actions found in category '{category}'"
        )
    return actions


if __name__ == "__main__":
    import uvicorn

    print("Starting Journey API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
