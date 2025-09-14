import { WorkflowBlock, WorkflowNode } from "@/types/workflow";

/**
 * Get all variables that are available at a specific point in the workflow
 * This includes variables defined by blocks before the current position
 */
export const getAvailableVariablesAtPosition = (
  nodes: WorkflowNode[],
  currentNodeId: string,
  currentBlockIndex: number,
): string[] => {
  const variables = new Set<string>();

  // Find the current node index
  const currentNodeIndex = nodes.findIndex((node) => node.id === currentNodeId);
  if (currentNodeIndex === -1) return [];

  // Process all nodes before the current node
  for (let nodeIndex = 0; nodeIndex < currentNodeIndex; nodeIndex++) {
    const node = nodes[nodeIndex];
    extractVariablesFromBlocks(node.blocks, variables);
  }

  // Process blocks in the current node up to the current block
  const currentNode = nodes[currentNodeIndex];
  const blocksToProcess = currentNode.blocks.slice(0, currentBlockIndex);
  extractVariablesFromBlocks(blocksToProcess, variables);

  return Array.from(variables).sort();
};

/**
 * Extract variables defined by blocks and add them to the variables set
 */
const extractVariablesFromBlocks = (
  blocks: WorkflowBlock[],
  variables: Set<string>,
): void => {
  for (const block of blocks) {
    switch (block.type) {
      case "AWAIT_USER_INPUT":
      case "SET_VARIABLE":
      case "UPDATE_VARIABLE":
        if (block.target) {
          variables.add(block.target);
        }
        break;
      case "ANALYZE_RESPONSE":
        if (block.output_bool) {
          variables.add(block.output_bool);
        }
        break;
    }
  }
};

/**
 * Get all variables defined in the entire workflow
 */
export const getAllWorkflowVariables = (nodes: WorkflowNode[]): string[] => {
  const variables = new Set<string>();

  for (const node of nodes) {
    extractVariablesFromBlocks(node.blocks, variables);
  }

  return Array.from(variables).sort();
};

/**
 * Extract variable references from text content (e.g., {variableName})
 */
export const extractVariableReferences = (text: string): string[] => {
  const regex = /\{([^}]+)\}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
};

/**
 * Check if a variable is referenced in the workflow
 */
export const isVariableReferenced = (
  nodes: WorkflowNode[],
  variableName: string,
): boolean => {
  for (const node of nodes) {
    for (const block of node.blocks) {
      // Check in payload/content
      if (
        block.payload &&
        extractVariableReferences(block.payload).includes(variableName)
      ) {
        return true;
      }

      // Check in source values
      if (
        block.source &&
        extractVariableReferences(block.source).includes(variableName)
      ) {
        return true;
      }

      // Check in conditional logic
      if (block.rules) {
        for (const rule of block.rules) {
          if (rule.field === variableName || rule.value === variableName) {
            return true;
          }
        }
      }
    }
  }

  return false;
};
