import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BlockType, WorkflowBlock } from "@/types/workflow";
import {
  GitBranch,
  Type as InputIcon,
  MessageSquare,
  Navigation,
  Save,
  Settings,
  Square,
  X
} from "lucide-react";
import React, { useState } from "react";
import { VariableAutocomplete } from "./VariableAutocomplete";

const blockTypeConfig = {
  PRESENT_CONTENT: {
    icon: MessageSquare,
    label: "Present Content",
    color: "bg-blue-500",
    description: "Display content to the user",
  },
  AWAIT_USER_INPUT: {
    icon: InputIcon,
    label: "Await User Input",
    color: "bg-green-500",
    description: "Wait for user input",
  },
  SET_VARIABLE: {
    icon: Settings,
    label: "Set Variable",
    color: "bg-purple-500",
    description: "Set a variable value",
  },
  UPDATE_VARIABLE: {
    icon: Settings,
    label: "Update Variable",
    color: "bg-purple-600",
    description: "Update an existing variable",
  },
  CONDITION: {
    icon: GitBranch,
    label: "Condition",
    color: "bg-slate-500",
    description: "Conditional logic",
  },
  GOTO_NODE: {
    icon: Navigation,
    label: "Go To Node",
    color: "bg-indigo-500",
    description: "Navigate to another node",
  },
  GET_VARIABLE: {
    icon: Settings,
    label: "Get Variable",
    color: "bg-purple-400",
    description: "Get a variable value",
  },
  END_WORKFLOW: {
    icon: Square,
    label: "End Workflow",
    color: "bg-red-500",
    description: "End the workflow",
  },
};

interface BlockEditDialogProps {
  block: WorkflowBlock;
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: WorkflowBlock) => void;
  availableNodes?: string[];
  availableVariables?: string[];
}

export const BlockEditDialog: React.FC<BlockEditDialogProps> = ({
  block,
  isOpen,
  onClose,
  onSave,
  availableNodes = [],
  availableVariables = [],
}) => {
  const [editedBlock, setEditedBlock] = useState<WorkflowBlock>(block);
  const config = blockTypeConfig[editedBlock.type];
  const Icon = config.icon;

  const handleFieldChange = (field: string, value: string) => {
    setEditedBlock((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (newType: BlockType) => {
    setEditedBlock((prev) => ({ ...prev, type: newType }));
  };

  const handleSave = () => {
    onSave(editedBlock);
    onClose();
  };

  const handleCancel = () => {
    setEditedBlock(block); // Reset to original
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg text-white", config.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">{config.label}</div>
              <div className="text-sm text-muted-foreground font-normal">
                {config.description}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Block Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="block-type" className="text-sm font-medium">
              Block Type
            </Label>
            <Select
              value={editedBlock.type}
              onValueChange={(value) => handleTypeChange(value as BlockType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(blockTypeConfig).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn("p-1 rounded text-white", config.color)}
                      >
                        <config.icon className="w-3 h-3" />
                      </div>
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Block-specific fields */}
          {(editedBlock.type === "PRESENT_CONTENT" ||
            editedBlock.type === "AWAIT_USER_INPUT") && (
              <div className="space-y-3">
                <Label htmlFor="content" className="text-sm font-medium">
                  {editedBlock.type === "PRESENT_CONTENT" ? "Content" : "Prompt"}
                </Label>
                <div className="w-full">
                  <VariableAutocomplete
                    value={editedBlock.payload || ""}
                    onChange={(value) => handleFieldChange("payload", value)}
                    availableVariables={availableVariables}
                    placeholder={
                      editedBlock.type === "PRESENT_CONTENT"
                        ? "Enter the content to display... Use @ for variables"
                        : "Enter the prompt for user input... Use @ for variables"
                    }
                    className="w-full min-h-[120px] border border-gray-300 rounded-md px-3 py-3 text-sm"
                    multiline={true}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Use {"{variable_name}"} to include variable values in your
                  content
                </div>
              </div>
            )}

          {(editedBlock.type === "AWAIT_USER_INPUT" ||
            editedBlock.type === "SET_VARIABLE" ||
            editedBlock.type === "UPDATE_VARIABLE") && (
              <div className="space-y-2">
                <Label htmlFor="target" className="text-sm font-medium">
                  Target Variable
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="target"
                    value={editedBlock.target || ""}
                    onChange={(e) => handleFieldChange("target", e.target.value)}
                    placeholder="Variable name"
                    className="flex-1"
                  />
                  {availableVariables.length > 0 && (
                    <Select
                      value=""
                      onValueChange={(value) =>
                        handleFieldChange("target", value)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Choose..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVariables.map((variable) => (
                          <SelectItem key={variable} value={variable}>
                            {variable}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}

          {editedBlock.type === "GOTO_NODE" && (
            <div className="space-y-2">
              <Label htmlFor="target-node" className="text-sm font-medium">
                Target Node
              </Label>
              <div className="flex gap-2">
                <Input
                  id="target-node"
                  value={editedBlock.target || ""}
                  onChange={(e) => handleFieldChange("target", e.target.value)}
                  placeholder="Node ID"
                  className="flex-1"
                />
                {availableNodes.length > 0 && (
                  <Select
                    value=""
                    onValueChange={(value) =>
                      handleFieldChange("target", value)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableNodes.map((nodeId) => (
                        <SelectItem key={nodeId} value={nodeId}>
                          {nodeId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {(editedBlock.type === "SET_VARIABLE" ||
            editedBlock.type === "UPDATE_VARIABLE") && (
              <div className="space-y-3">
                <Label htmlFor="source" className="text-sm font-medium">
                  Source Value
                </Label>
                <div className="w-full">
                  <VariableAutocomplete
                    value={editedBlock.source || ""}
                    onChange={(value) => handleFieldChange("source", value)}
                    availableVariables={availableVariables}
                    placeholder="Variable value or expression... Use @ for variables"
                    className="w-full min-h-[100px] border border-gray-300 rounded-md px-3 py-3 text-sm"
                    multiline={true}
                  />
                </div>
                {editedBlock.type === "UPDATE_VARIABLE" && (
                  <div className="space-y-2">
                    <Label htmlFor="operation" className="text-sm font-medium">
                      Operation
                    </Label>
                    <Select
                      value={editedBlock.operation || "set"}
                      onValueChange={(value) =>
                        handleFieldChange("operation", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">Set (Replace)</SelectItem>
                        <SelectItem value="append">Append</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

          {editedBlock.type === "GET_VARIABLE" && (
            <div className="space-y-2">
              <Label htmlFor="source-var" className="text-sm font-medium">
                Source Variable
              </Label>
              <div className="flex gap-2">
                <Input
                  id="source-var"
                  value={editedBlock.source || ""}
                  onChange={(e) => handleFieldChange("source", e.target.value)}
                  placeholder="Variable name"
                  className="flex-1"
                />
                {availableVariables.length > 0 && (
                  <Select
                    value=""
                    onValueChange={(value) =>
                      handleFieldChange("source", value)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariables.map((variable) => (
                        <SelectItem key={variable} value={variable}>
                          {variable}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {editedBlock.type === "CONDITION" && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm font-medium mb-2">
                  Conditional Logic
                </div>
                <div className="text-sm text-muted-foreground">
                  Advanced conditional logic editing will be available in a
                  future update. For now, you can import/export YAML with
                  complex conditions.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
