import { cn } from "@/lib/utils";
import { WorkflowNode } from "@/types/workflow";
import React, { useEffect, useRef } from "react";

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  className?: string;
}

interface Connection {
  from: string;
  to: string;
  type: "next" | "goto" | "condition";
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Extract connections from the workflow
  const extractConnections = (nodes: WorkflowNode[]): Connection[] => {
    const connections: Connection[] = [];

    nodes.forEach((node, index) => {
      // Sequential flow to next node
      if (index < nodes.length - 1) {
        const hasEndWorkflow = node.blocks.some(
          (block) => block.type === "END_WORKFLOW",
        );
        const hasGotoNode = node.blocks.some(
          (block) => block.type === "GOTO_NODE",
        );

        if (!hasEndWorkflow && !hasGotoNode) {
          connections.push({
            from: node.id,
            to: nodes[index + 1].id,
            type: "next",
          });
        }
      }

      // GOTO_NODE connections
      node.blocks.forEach((block) => {
        if (block.type === "GOTO_NODE" && block.target) {
          connections.push({
            from: node.id,
            to: block.target,
            type: "goto",
          });
        }
      });

      // CONDITION connections
      node.blocks.forEach((block) => {
        if (block.type === "CONDITION" && block.rules) {
          block.rules.forEach((rule) => {
            if (rule.then) {
              rule.then.forEach((thenBlock) => {
                if (thenBlock.type === "GOTO_NODE" && thenBlock.target) {
                  connections.push({
                    from: node.id,
                    to: thenBlock.target,
                    type: "condition",
                  });
                }
              });
            }
            if (rule.else) {
              rule.else.forEach((elseBlock) => {
                if (elseBlock.type === "GOTO_NODE" && elseBlock.target) {
                  connections.push({
                    from: node.id,
                    to: elseBlock.target,
                    type: "condition",
                  });
                }
              });
            }
          });
        }
      });
    });

    return connections;
  };

  const connections = extractConnections(nodes);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    connections.forEach((connection) => {
      const fromElement = document.querySelector(
        `[data-node-id="${connection.from}"]`,
      );
      const toElement = document.querySelector(
        `[data-node-id="${connection.to}"]`,
      );

      if (!fromElement || !toElement) return;

      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      const fromX = fromRect.left + fromRect.width / 2 - canvasRect.left;
      const fromY = fromRect.bottom - canvasRect.top;
      const toX = toRect.left + toRect.width / 2 - canvasRect.left;
      const toY = toRect.top - canvasRect.top;

      // Set line style based on connection type
      ctx.strokeStyle =
        connection.type === "next"
          ? "#6366f1" // indigo
          : connection.type === "goto"
            ? "#8b5cf6" // violet
            : "#64748b"; // slate-500 for neutral

      ctx.lineWidth = 2;
      ctx.setLineDash(connection.type === "condition" ? [5, 5] : []);

      // Draw curved line
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);

      const controlY = fromY + (toY - fromY) / 2;
      ctx.bezierCurveTo(fromX, controlY, toX, controlY, toX, toY);

      ctx.stroke();

      // Draw arrow head
      const angle = Math.atan2(toY - controlY, toX - toX);
      const headLength = 10;

      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();
    });
  }, [connections, nodes]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 pointer-events-none z-0",
        "w-full h-full",
        className,
      )}
      width={1200}
      height={2000}
    />
  );
};
