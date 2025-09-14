export interface WorkflowVariable {
  name: string;
  value?: any;
}

// Action definitions for the new system
export interface ActionArgument {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description?: string;
  default?: any;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  arguments: ActionArgument[];
  returnType: "string" | "number" | "boolean" | "array" | "object";
  category: string;
  examples: string[];
}

export interface WorkflowBlock {
  type: BlockType;
  payload?: string;
  target?: string;
  prompt?: string;
  operation?: "append" | "set";
  source?: string;
  input?: string;
  output_bool?: string;
  criteria?: string;
  rules?: ConditionRule[];
  then?: WorkflowBlock[];
  else?: WorkflowBlock[];
  // New fields for actions
  action?: string; // Action ID
  actionArgs?: Record<string, any>; // Action arguments
}

export interface ConditionRule {
  // Legacy format
  if?: string;
  // New structured format
  variable?: string;
  operator?: string;
  value?: string;
  then?: WorkflowBlock[];
  else?: WorkflowBlock[];
}

export interface WorkflowNode {
  id: string;
  title: string;
  blocks: WorkflowBlock[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  variables: string[];
  nodes: WorkflowNode[];
  actions?: ActionDefinition[]; // Registered custom actions
}

// Updated block types - removed ANALYZE_RESPONSE
export type BlockType =
  | "PRESENT_CONTENT"
  | "AWAIT_USER_INPUT"
  | "SET_VARIABLE"
  | "UPDATE_VARIABLE"
  | "GET_VARIABLE"
  | "CONDITION"
  | "GOTO_NODE"
  | "END_WORKFLOW";

// Block categories for the new naming system
export interface BlockCategory {
  id: string;
  name: string;
  description: string;
  blocks: BlockType[];
}

export const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    id: "ui",
    name: "Chat Starter Pack",
    description: "Present to user, await response",
    blocks: ["PRESENT_CONTENT", "AWAIT_USER_INPUT"]
  },
  {
    id: "navigation",
    name: "Navigation",
    description: "Control workflow flow",
    blocks: ["GOTO_NODE", "END_WORKFLOW"]
  },
  {
    id: "condition",
    name: "Condition",
    description: "Conditional logic",
    blocks: ["CONDITION"]
  },
  {
    id: "blackboard",
    name: "Blackboard",
    description: "Variable operations",
    blocks: ["SET_VARIABLE", "UPDATE_VARIABLE", "GET_VARIABLE"]
  }
];

export interface WorkflowEditorState {
  workflow: Workflow | null;
  selectedNodeId: string | null;
  selectedBlockIndex: number | null;
  isEditing: boolean;
}

export interface BlockEditorProps {
  block: WorkflowBlock;
  onChange: (block: WorkflowBlock) => void;
  onDelete: () => void;
}

export interface NodeEditorProps {
  node: WorkflowNode;
  onChange: (node: WorkflowNode) => void;
  onDelete: () => void;
  isSelected: boolean;
  onClick: () => void;
}
