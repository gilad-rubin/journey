import { readFileSync } from 'fs';
import yaml from 'js-yaml';

const sanitizeId = (id) => {
  return id.replace(/[^a-zA-Z0-9]/g, "_").replace(/^(\d)/, "_$1");
};

function blockLabel(block, index) {
  const base = block.type;
  if (block.type === "PRESENT_CONTENT") return "PRESENT_CONTENT";
  if (block.type === "AWAIT_USER_INPUT") return "AWAIT_USER_INPUT";
  if (block.type === "SET_VARIABLE") {
    // Show variable assignment details
    let label = "SET VARIABLE";
    
    // Check for optional description first
    if (block.description) {
      label = block.description;
    } else if (block.target) {
      // Show what variable is being set
      label = `Set: ${block.target}`;
      
      // Show the source/action
      if (block.action) {
        // Show action name (cleaner than full action string)
        const actionName = block.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        label += `<br/>via ${actionName}`;
      } else if (block.source) {
        // Show source (fallback for legacy format)
        let source = block.source;
        if (source.startsWith('tool:')) {
          source = source.substring(5).replace(/_/g, ' ');
          source = source.replace(/\b\w/g, l => l.toUpperCase());
        }
        label += `<br/>from ${source}`;
      }
    }
    
    return label;
  }
  if (block.type === "UPDATE_VARIABLE") return "UPDATE_VARIABLE";
  if (block.type === "GOTO_NODE") return "GOTO_NODE";
  if (block.type === "CONDITION") {
    // Extract condition details for display
    if (Array.isArray(block.rules) && block.rules.length > 0) {
      const rule = block.rules[0]; // Show first rule for simplicity
      if (rule.variable && rule.operator) {
        const operator = rule.operator.replace(/_/g, ' ');
        
        // Handle boolean operators that don't need a value
        if (rule.operator === 'is_true' || rule.operator === 'is_false') {
          return `${rule.variable}<br/>${operator}`;
        }
        
        // Handle operators with values
        if (rule.value !== undefined && rule.value !== '') {
          return `${rule.variable}<br/>${operator}<br/>${rule.value}`;
        }
        
        // Fallback for operators without values
        return `${rule.variable}<br/>${operator}`;
      }
    }
    return "CONDITION";
  }
  if (block.type === "END_WORKFLOW") return "END";
  return `${base}_${index + 1}`;
}

function workflowToMermaid(workflow) {
  const lines = [];
  lines.push("flowchart TD");

  const nodeIds = workflow.nodes.map((n) => n.id);
  const edges = [];

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
          const gotoAction = thenGoto.then.find(a => a.type === "GOTO_NODE");
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
          const gotoAction = elseGoto.else.find(a => a.type === "GOTO_NODE");
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

// Read the YAML workflow
const yamlContent = readFileSync('./backend/examples/what_is_the_status_of_my_loan/what_is_the_status_of_my_loan.yaml', 'utf8');
const workflow = yaml.load(yamlContent);

// Generate the mermaid diagram
console.log('=== Updated Mermaid Diagram ===');
const result = workflowToMermaid(workflow);
console.log(result);
console.log('\n=== Analysis ===');

// Count nodes and connections
const lines = result.split('\n');
const nodeLines = lines.filter(line => line.trim().match(/^\s*\w+(\[|\{|\()/));
const edgeLines = lines.filter(line => line.trim().includes('-->'));

console.log(`Total nodes: ${nodeLines.length}`);
console.log(`Total edges: ${edgeLines.length}`);

// Check if Start is connected
const startConnections = edgeLines.filter(line => line.includes('Start -->'));
console.log(`Start connections: ${startConnections.length}`);

// Check for disconnected components
const allNodes = new Set();
const connectedNodes = new Set();

nodeLines.forEach(line => {
  const match = line.trim().match(/^\s*(\w+)/);
  if (match) allNodes.add(match[1]);
});

edgeLines.forEach(line => {
  const match = line.match(/(\w+)\s*-->/);
  if (match) connectedNodes.add(match[1]);
  const toMatch = line.match(/-->\s*(?:\|[^|]*\|)?\s*(\w+)/);
  if (toMatch) connectedNodes.add(toMatch[1]);
});

const disconnected = [...allNodes].filter(node => !connectedNodes.has(node));
console.log(`Disconnected nodes: ${disconnected.length > 0 ? disconnected.join(', ') : 'None'}`);