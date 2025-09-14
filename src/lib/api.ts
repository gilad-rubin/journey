/**
 * API service for communicating with the Redwood backend
 */

import { Workflow, WorkflowBlock, WorkflowNode } from '@/types/workflow';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface WorkflowListItem {
    id: string;
    name: string;
    description: string;
    path: string;
    node_count: number;
    variable_count: number;
}

export interface FunctionArgument {
    name: string;
    type: string;
    default?: any;
    required: boolean;
    description?: string;
}

export interface FunctionDefinition {
    id: string;
    name: string;
    description: string;
    arguments: FunctionArgument[];
    return_type: string;
    category: string;
    examples: string[];
}

export interface FunctionCatalog {
    functions: FunctionDefinition[];
    categories: string[];
}

export interface ActionArgument {
    name: string;
    type: string;
    default?: any;
    required: boolean;
    description?: string;
}

export interface ActionDefinition {
    id: string;
    name: string;
    description: string;
    arguments: ActionArgument[];
    return_type: string;
    category: string;
    examples: string[];
}

export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    arguments: ActionArgument[];
    return_type: string;
    category: string;
    examples: string[];
}

export interface ActionCatalog {
    actions: ActionDefinition[];
    categories: string[];
}

export interface ToolCatalog {
    tools: ToolDefinition[];
    categories: string[];
}

export interface WorkflowExecutionRequest {
    session_state: {
        current_node_id?: string;
        current_block_index?: number;
        variables?: Record<string, any>;
    };
}

export interface WorkflowExecutionResponse {
    actions: WorkflowBlock[];
    session_state: {
        current_node_id?: string;
        current_block_index?: number;
        variables?: Record<string, any>;
    };
}

export interface BlockTypesResponse {
    [blockType: string]: {
        description: string;
        required_fields: string[];
        optional_fields: string[];
        field_types: Record<string, string>;
    };
}

class ApiService {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API request failed: ${response.status} ${error}`);
        }

        return response.json();
    }

    // Workflow management
    async listWorkflows(): Promise<WorkflowListItem[]> {
        return this.request<WorkflowListItem[]>('/api/workflows');
    }

    async getWorkflow(workflowPath: string): Promise<Workflow & { path: string }> {
        return this.request<Workflow & { path: string }>(`/api/workflows/${encodeURIComponent(workflowPath)}`);
    }

    async saveWorkflow(workflowPath: string, workflow: Workflow): Promise<{ message: string; path: string }> {
        return this.request<{ message: string; path: string }>(`/api/workflows/${encodeURIComponent(workflowPath)}`, {
            method: 'PUT',
            body: JSON.stringify(workflow),
        });
    }

    async createWorkflow(name: string, description: string = ""): Promise<{ message: string; path: string; folder: string; workflow: Workflow }> {
        return this.request<{ message: string; path: string; folder: string; workflow: Workflow }>('/api/workflows/create', {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        });
    }

    async updateNode(
        workflowPath: string,
        nodeIndex: number,
        node: WorkflowNode
    ): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/api/workflows/${encodeURIComponent(workflowPath)}/nodes/${nodeIndex}`, {
            method: 'POST',
            body: JSON.stringify(node),
        });
    }

    async addNode(
        workflowPath: string,
        node: WorkflowNode
    ): Promise<{ message: string; node_index: number }> {
        return this.request<{ message: string; node_index: number }>(`/api/workflows/${encodeURIComponent(workflowPath)}/nodes`, {
            method: 'POST',
            body: JSON.stringify(node),
        });
    }

    async deleteNode(
        workflowPath: string,
        nodeIndex: number
    ): Promise<{ message: string; deleted_node: WorkflowNode }> {
        return this.request<{ message: string; deleted_node: WorkflowNode }>(`/api/workflows/${encodeURIComponent(workflowPath)}/nodes/${nodeIndex}`, {
            method: 'DELETE',
        });
    }

    // New methods for sidebar
    async listWorkflowsSimple(): Promise<{ name: string, path: string }[]> {
        const data = await this.request<{ name: string, path: string }[]>('/api/workflows');
        return data;
    }

    async getWorkflowContent(workflowPath: string): Promise<Workflow> {
        const response = await this.request<{ id: string, name: string, description: string, variables: string[], nodes: WorkflowNode[], path: string }>(`/api/workflows/${encodeURIComponent(workflowPath)}`);
        return {
            id: response.id,
            name: response.name,
            description: response.description,
            variables: response.variables,
            nodes: response.nodes
        };
    }

    // Workflow execution
    async executeWorkflowStep(
        workflowPath: string,
        sessionState: Record<string, any>
    ): Promise<WorkflowExecutionResponse> {
        return this.request<WorkflowExecutionResponse>(`/api/workflows/${encodeURIComponent(workflowPath)}/execute`, {
            method: 'POST',
            body: JSON.stringify({ session_state: sessionState }),
        });
    }

    // Function introspection
    async getFunctionCatalog(): Promise<FunctionCatalog> {
        return this.request<FunctionCatalog>('/api/functions');
    }

    async getFunctionDefinition(functionName: string): Promise<FunctionDefinition> {
        return this.request<FunctionDefinition>(`/api/functions/${encodeURIComponent(functionName)}`);
    }

    async getFunctionsByCategory(category: string): Promise<FunctionDefinition[]> {
        return this.request<FunctionDefinition[]>(`/api/functions/category/${encodeURIComponent(category)}`);
    }

    // Metadata
    async getBlockTypes(): Promise<BlockTypesResponse> {
        return this.request<BlockTypesResponse>('/api/block-types');
    }

    async getCommonVariables(): Promise<{ variables: string[] }> {
        return this.request<{ variables: string[] }>('/api/variables');
    }

    // Health check
    async healthCheck(): Promise<{ message: string; version: string }> {
        return this.request<{ message: string; version: string }>('/');
    }

    // Actions and Tools
    async getActionCatalog(): Promise<ActionCatalog> {
        return this.request<ActionCatalog>('/api/actions');
    }

    async getToolCatalog(): Promise<ToolCatalog> {
        return this.request<ToolCatalog>('/api/tools');
    }

    async getActionDefinition(actionName: string): Promise<ActionDefinition> {
        return this.request<ActionDefinition>(`/api/actions/${encodeURIComponent(actionName)}`);
    }

    async getToolDefinition(toolName: string): Promise<ToolDefinition> {
        return this.request<ToolDefinition>(`/api/tools/${encodeURIComponent(toolName)}`);
    }
}

export const apiService = new ApiService();
export default apiService; 