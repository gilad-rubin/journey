import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BlockType,
  WorkflowBlock,
  WorkflowNode as WorkflowNodeType,
} from "@/types/workflow";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  MoreVertical,
  Plus,
  Trash2
} from "lucide-react";
import React, { useState } from "react";
import { ActionSelector } from "./ActionSelector";
import { WorkflowBlock as WorkflowBlockComponent } from "./WorkflowBlock";

interface WorkflowNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  isEditing: boolean;
  selectedBlockIndex: number | null;
  onSelect: () => void;
  onSelectBlock: (index: number) => void;
  onChange: (node: WorkflowNodeType) => void;
  onDelete: () => void;
  onAddBlock: (blockType: BlockType) => void;
  availableNodes?: WorkflowNodeType[];
  workflowNodes?: WorkflowNodeType[];
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected,
  isEditing,
  selectedBlockIndex,
  onSelect,
  onSelectBlock,
  onChange,
  onDelete,
  onAddBlock,
  availableNodes = [],
  workflowNodes = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showActionSelector, setShowActionSelector] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(node.title);

  // Get available variables from all previous blocks in all nodes
  const availableVariables = workflowNodes.flatMap(n =>
    n.blocks
      .filter(b => b.type === "AWAIT_USER_INPUT" || b.type === "SET_VARIABLE" || b.type === "UPDATE_VARIABLE")
      .map(b => b.target)
      .filter(Boolean)
  );

  const handleTitleEditStart = () => {
    setEditingTitleValue(node.title);
    setIsEditingTitle(true);
  };

  const handleTitleChange = (newTitle: string) => {
    setEditingTitleValue(newTitle);
  };

  const handleTitleSave = () => {
    onChange({ ...node, title: editingTitleValue });
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditingTitleValue(node.title);
    setIsEditingTitle(false);
  };

  const handleBlockChange = (index: number, updatedBlock: WorkflowBlock) => {
    const updatedBlocks = node.blocks.map((block, i) =>
      i === index ? updatedBlock : block,
    );
    onChange({ ...node, blocks: updatedBlocks });
  };

  const handleBlockDelete = (index: number) => {
    const updatedBlocks = node.blocks.filter((_, i) => i !== index);
    onChange({ ...node, blocks: updatedBlocks });
  };

  const handleAddBlock = () => {
    setShowActionSelector(true);
  };

  const handleActionSelect = (newBlock: WorkflowBlock) => {
    const updatedBlocks = [...node.blocks, newBlock];
    onChange({ ...node, blocks: updatedBlocks });
    setShowActionSelector(false);
  };

  return (
    <div
      data-node-id={node.id}
      className={cn(
        "border border-gray-200 rounded-lg bg-white transition-all duration-200 hover:shadow-sm hover:border-gray-300",
        isSelected && "border-primary shadow-sm",
        "group relative",
      )}
      onClick={onSelect}
    >
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0 h-auto hover:bg-transparent"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </Button>

            {isEditingTitle ? (
              <Input
                value={editingTitleValue}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave();
                  } else if (e.key === "Escape") {
                    handleTitleCancel();
                  }
                }}
                className="h-7 font-medium border-none p-0 focus:ring-0"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-gray-900">
                  {node.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTitleEditStart();
                  }}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {node.blocks.length} blocks
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement duplicate
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {node.id}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0">
          <div className="space-y-3">
            {node.blocks.map((block, index) => (
              <WorkflowBlockComponent
                key={index}
                block={block}
                index={index}
                nodeId={node.id}
                isSelected={selectedBlockIndex === index}
                onSelect={() => onSelectBlock(index)}
                onChange={(updatedBlock) =>
                  handleBlockChange(index, updatedBlock)
                }
                onDelete={() => handleBlockDelete(index)}
                availableNodes={availableNodes}
                workflowNodes={workflowNodes}
              />
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed text-gray-600 hover:text-gray-900 h-8"
              onClick={(e) => {
                e.stopPropagation();
                handleAddBlock();
              }}
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Block
            </Button>
          </div>
        </div>
      )}

      {showActionSelector && (
        <ActionSelector
          availableVariables={availableVariables}
          availableNodes={availableNodes}
          onSelect={handleActionSelect}
          onCancel={() => setShowActionSelector(false)}
        />
      )}
    </div>
  );
};
