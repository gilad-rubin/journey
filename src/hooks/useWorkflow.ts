import { apiService } from "@/lib/api";
import {
  Workflow,
  WorkflowEditorState,
  WorkflowNode
} from "@/types/workflow";
import { useCallback, useState } from "react";

interface SimpleWorkflowInfo {
  name: string;
  path: string;
}

export interface UseWorkflowReturn {
  state: WorkflowEditorState;
  actions: {
    setWorkflow: (workflow: Workflow | null) => void;
    addNode: (node: WorkflowNode) => void;
    updateNode: (nodeId: string, node: WorkflowNode) => void;
    deleteNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
    selectBlock: (nodeId: string | null, blockIndex: number | null) => void;
    setEditingMode: (isEditing: boolean) => void;
    // New API-backed actions
    loadWorkflows: () => Promise<SimpleWorkflowInfo[]>;
    loadWorkflow: (workflowPath: string) => Promise<void>;
    saveWorkflow: (workflowPath: string) => Promise<void>;
    createWorkflow: (name: string, description?: string) => Promise<void>;
    executeWorkflowStep: (workflowPath: string, sessionState: Record<string, any>) => Promise<any>;
  };
  // Add backend connection state
  isLoading: boolean;
  error: string | null;
  availableWorkflows: SimpleWorkflowInfo[];
  currentWorkflowPath: string | null;
}

export const useWorkflow = (): UseWorkflowReturn => {
  const [state, setState] = useState<WorkflowEditorState>({
    workflow: null,
    selectedNodeId: null,
    selectedBlockIndex: null,
    isEditing: false,
  });

  // Backend connection state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWorkflows, setAvailableWorkflows] = useState<SimpleWorkflowInfo[]>([]);
  const [currentWorkflowPath, setCurrentWorkflowPath] = useState<string | null>(null);

  const setWorkflow = useCallback((workflow: Workflow | null) => {
    setState(prev => ({ ...prev, workflow }));
  }, []);

  const addNode = useCallback((node: WorkflowNode) => {
    setState(prev => {
      if (!prev.workflow) return prev;
      return {
        ...prev,
        workflow: {
          ...prev.workflow,
          nodes: [...prev.workflow.nodes, node],
        },
      };
    });
  }, []);

  const updateNode = useCallback((nodeId: string, node: WorkflowNode) => {
    setState(prev => {
      if (!prev.workflow) return prev;
      const nodeIndex = prev.workflow.nodes.findIndex(n => n.id === nodeId);
      if (nodeIndex === -1) return prev;

      const newNodes = [...prev.workflow.nodes];
      newNodes[nodeIndex] = node;
      return {
        ...prev,
        workflow: {
          ...prev.workflow,
          nodes: newNodes,
        },
      };
    });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setState(prev => {
      if (!prev.workflow) return prev;
      const newNodes = prev.workflow.nodes.filter(node => node.id !== nodeId);
      return {
        ...prev,
        workflow: {
          ...prev.workflow,
          nodes: newNodes,
        },
      };
    });
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  const selectBlock = useCallback((nodeId: string | null, blockIndex: number | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId, selectedBlockIndex: blockIndex }));
  }, []);

  const setEditingMode = useCallback((isEditing: boolean) => {
    setState(prev => ({ ...prev, isEditing }));
  }, []);

  // New API-backed actions
  const loadWorkflows = useCallback(async (): Promise<SimpleWorkflowInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const workflows = await apiService.listWorkflowsSimple();
      setAvailableWorkflows(workflows);
      return workflows;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflows';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWorkflow = useCallback(async (workflowPath: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const workflow = await apiService.getWorkflowContent(workflowPath);
      setWorkflow(workflow);
      setCurrentWorkflowPath(workflowPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setWorkflow]);

  const saveWorkflow = useCallback(async (workflowPath: string): Promise<void> => {
    if (!state.workflow) {
      throw new Error('No workflow to save');
    }

    setIsLoading(true);
    setError(null);
    try {
      await apiService.saveWorkflow(workflowPath, state.workflow);
      setCurrentWorkflowPath(workflowPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workflow';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [state.workflow]);

  const createWorkflow = useCallback(async (name: string, description?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.createWorkflow(name, description || "");
      setWorkflow(result.workflow);
      setCurrentWorkflowPath(result.path);
      // Reload workflows list to include the new workflow
      await loadWorkflows();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workflow';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setWorkflow, loadWorkflows]);

  const executeWorkflowStep = useCallback(async (
    workflowPath: string,
    sessionState: Record<string, any>
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.executeWorkflowStep(workflowPath, sessionState);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute workflow step';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    state,
    actions: {
      setWorkflow,
      addNode,
      updateNode,
      deleteNode,
      selectNode,
      selectBlock,
      setEditingMode,
      loadWorkflows,
      loadWorkflow,
      saveWorkflow,
      createWorkflow,
      executeWorkflowStep,
    },
    isLoading,
    error,
    availableWorkflows,
    currentWorkflowPath,
  };
};
