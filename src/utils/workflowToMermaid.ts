import { Workflow, WorkflowBlock } from "@/types/workflow";

type Edge = { from: string; to: string; label?: string };

const sanitizeId = (id: string) => {
  // Replace special characters with valid ones for Mermaid node IDs
  // Mermaid node IDs can only contain alphanumeric characters and underscores
  return id.replace(/[^a-zA-Z0-9]/g, "_").replace(/^(\d)/, "_$1");
};

function blockLabel(block: WorkflowBlock, index: number): string {
  const base = block.type;
  if (block.type === "PRESENT_CONTENT") return "PRESENT_CONTENT";
  if (block.type === "AWAIT_USER_INPUT") return "AWAIT_USER_INPUT";
  if (block.type === "SET_VARIABLE") return "SET_VARIABLE";
  if (block.type === "UPDATE_VARIABLE") return "UPDATE_VARIABLE";
  if (block.type === "GOTO_NODE") return "GOTO_NODE";
  if (block.type === "CONDITION") return "CONDITION";
  if (block.type === "END_WORKFLOW") return "END";
  return `${base}_${index + 1}`;
}

export function workflowToMermaid(workflow: Workflow): string {
  const lines: string[] = [];
  lines.push("flowchart TD");

  const nodeIds = workflow.nodes.map((n) => n.id);
  const edges: Edge[] = [];

  // Start node
  lines.push(`  Start([Start])`);

  for (let nodeIndex = 0; nodeIndex < workflow.nodes.length; nodeIndex++) {
    const wfNode = workflow.nodes[nodeIndex];
    const nodePrefix = sanitizeId(wfNode.id);
    
    // If node has no blocks, create a simple node
    if (wfNode.blocks.length === 0) {
      const nodeTitle = (wfNode.title || wfNode.id).replace(/[^a-zA-Z0-9 ]/g, "");
      lines.push(`  ${nodePrefix}[${nodeTitle}]`);
      continue;
    }

    // Emit blocks as individual nodes (not subgraphs to avoid complexity)
    wfNode.blocks.forEach((block, idx) => {
      const bid = `${nodePrefix}_${idx}`;
      const label = blockLabel(block, idx);
      
      if (block.type === "CONDITION") {
        lines.push(`  ${bid}{${label}}`);
      } else if (block.type === "END_WORKFLOW") {
        lines.push(`  ${bid}([${label}])`);
      } else {
        lines.push(`  ${bid}[${label}]`);
      }
    });

    // Wire blocks within this node
    let nodeHasTerminalBlock = false;
    for (let idx = 0; idx < wfNode.blocks.length; idx++) {
      const block = wfNode.blocks[idx];
      const from = `${nodePrefix}_${idx}`;
      const next = `${nodePrefix}_${idx + 1}`;
      const hasNext = idx + 1 < wfNode.blocks.length;
      const isLastBlockInNode = idx === wfNode.blocks.length - 1;

      if (block.type === "CONDITION" && Array.isArray(block.rules)) {
        // Find GOTO targets in rules
        const thenGoto = block.rules.find(r => r.then && r.then.find(a => a.type === "GOTO_NODE"));
        const elseGoto = block.rules.find(r => r.else && r.else.find(a => a.type === "GOTO_NODE"));
        
        if (thenGoto) {
          const gotoAction = thenGoto.then!.find(a => a.type === "GOTO_NODE");
          if (gotoAction && gotoAction.target && nodeIds.includes(gotoAction.target)) {
            const targetNodeIndex = workflow.nodes.findIndex(n => n.id === gotoAction.target);
            const targetNode = workflow.nodes[targetNodeIndex];
            const targetId = targetNode.blocks.length > 0 
              ? `${sanitizeId(gotoAction.target)}_0` 
              : sanitizeId(gotoAction.target);
            edges.push({ from, to: targetId, label: "YES" });
          }
        } else if (hasNext) {
          edges.push({ from, to: next, label: "YES" });
        } else if (isLastBlockInNode) {
          // If this is the last block and no explicit goto, check if we should flow to next node
          const nextNodeIndex = nodeIndex + 1;
          if (nextNodeIndex < workflow.nodes.length) {
            const nextNode = workflow.nodes[nextNodeIndex];
            const targetId = nextNode.blocks.length > 0 
              ? `${sanitizeId(nextNode.id)}_0` 
              : sanitizeId(nextNode.id);
            edges.push({ from, to: targetId, label: "YES" });
          }
        }

        if (elseGoto) {
          const gotoAction = elseGoto.else!.find(a => a.type === "GOTO_NODE");
          if (gotoAction && gotoAction.target && nodeIds.includes(gotoAction.target)) {
            const targetNodeIndex = workflow.nodes.findIndex(n => n.id === gotoAction.target);
            const targetNode = workflow.nodes[targetNodeIndex];
            const targetId = targetNode.blocks.length > 0 
              ? `${sanitizeId(gotoAction.target)}_0` 
              : sanitizeId(gotoAction.target);
            edges.push({ from, to: targetId, label: "NO" });
          }
        } else if (hasNext) {
          edges.push({ from, to: next, label: "NO" });
        } else if (isLastBlockInNode) {
          // If this is the last block and no explicit goto, check if we should flow to next node
          const nextNodeIndex = nodeIndex + 1;
          if (nextNodeIndex < workflow.nodes.length) {
            const nextNode = workflow.nodes[nextNodeIndex];
            const targetId = nextNode.blocks.length > 0 
              ? `${sanitizeId(nextNode.id)}_0` 
              : sanitizeId(nextNode.id);
            edges.push({ from, to: targetId, label: "NO" });
          }
        }
        
        if (isLastBlockInNode && (thenGoto || elseGoto)) {
          nodeHasTerminalBlock = true;
        }
      } else if (block.type === "GOTO_NODE" && block.target && nodeIds.includes(block.target)) {
        const targetNodeIndex = workflow.nodes.findIndex(n => n.id === block.target);
        const targetNode = workflow.nodes[targetNodeIndex];
        const targetId = targetNode.blocks.length > 0 
          ? `${sanitizeId(block.target)}_0` 
          : sanitizeId(block.target);
        edges.push({ from, to: targetId });
        if (isLastBlockInNode) {
          nodeHasTerminalBlock = true;
        }
      } else if (block.type === "END_WORKFLOW") {
        nodeHasTerminalBlock = true;
        // No outgoing edge
      } else if (hasNext) {
        edges.push({ from, to: next });
      } else if (isLastBlockInNode && !nodeHasTerminalBlock) {
        // This is the last block in the node and it's not a terminal block
        // Check if we should automatically flow to the next node
        const nextNodeIndex = nodeIndex + 1;
        if (nextNodeIndex < workflow.nodes.length) {
          const nextNode = workflow.nodes[nextNodeIndex];
          const targetId = nextNode.blocks.length > 0 
            ? `${sanitizeId(nextNode.id)}_0` 
            : sanitizeId(nextNode.id);
          edges.push({ from, to: targetId });
        }
      }
    }
    
    // Handle empty nodes - connect them to the next node if available
    if (wfNode.blocks.length === 0) {
      const nextNodeIndex = nodeIndex + 1;
      if (nextNodeIndex < workflow.nodes.length) {
        const nextNode = workflow.nodes[nextNodeIndex];
        const targetId = nextNode.blocks.length > 0 
          ? `${sanitizeId(nextNode.id)}_0` 
          : sanitizeId(nextNode.id);
        edges.push({ from: nodePrefix, to: targetId });
      }
    }
  }

  // Add all edges
  for (const e of edges) {
    if (e.label) {
      lines.push(`  ${e.from} -->|${e.label}| ${e.to}`);
    } else {
      lines.push(`  ${e.from} --> ${e.to}`);
    }
  }

  // Connect start to first node's first block
  if (workflow.nodes.length > 0) {
    const first = workflow.nodes[0];
    if (first.blocks.length > 0) {
      lines.push(`  Start --> ${sanitizeId(first.id)}_0`);
    } else {
      lines.push(`  Start --> ${sanitizeId(first.id)}`);
    }
  }

  return lines.join("\n");
}
