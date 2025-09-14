import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BlockType,
  WorkflowBlock as WorkflowBlockType,
  WorkflowNode,
} from "@/types/workflow";
import { getAvailableVariablesAtPosition } from "@/utils/variableTracking";
import {
  ChevronDown,
  GitBranch,
  Type as InputIcon,
  MessageSquare,
  Navigation,
  Settings,
  Square,
  Trash2
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ActionOrValueSelector } from "./ActionOrValueSelector";
import { SimpleConditionEditor } from "./SimpleConditionEditor";
import { VariableAutocomplete } from "./VariableAutocomplete";
// Using inline cn function to avoid import issues
const cn = (...classes: (string | undefined | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface WorkflowBlockProps {
  block: WorkflowBlockType;
  index: number;
  nodeId: string;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (block: WorkflowBlockType) => void;
  onDelete: () => void;
  availableNodes?: WorkflowNode[];
  workflowNodes?: WorkflowNode[];
  availableVariablesOverride?: string[];
}

const blockTypeConfig = {
  PRESENT_CONTENT: {
    icon: MessageSquare,
    label: "Present Content",
    color: "bg-blue-500",
  },
  AWAIT_USER_INPUT: {
    icon: InputIcon,
    label: "Await User Input",
    color: "bg-green-500",
  },
  SET_VARIABLE: {
    icon: Settings,
    label: "Set Variable",
    color: "bg-purple-500",
  },
  UPDATE_VARIABLE: {
    icon: Settings,
    label: "Update Variable",
    color: "bg-purple-600",
  },
  GET_VARIABLE: {
    icon: Settings,
    label: "Get Variable",
    color: "bg-purple-400",
  },
  CONDITION: {
    icon: GitBranch,
    label: "Condition",
    color: "bg-slate-500",
  },
  GOTO_NODE: {
    icon: Navigation,
    label: "Go To Node",
    color: "bg-indigo-500",
  },
  END_WORKFLOW: {
    icon: Square,
    label: "End Workflow",
    color: "bg-red-500",
  },
};

const blockTypeCategories = {
  ui: [
    { type: "PRESENT_CONTENT" as BlockType, label: "Present Content" },
    { type: "AWAIT_USER_INPUT" as BlockType, label: "Await User Input" },
  ],
  blackboard: [
    { type: "SET_VARIABLE" as BlockType, label: "Set Variable" },
    { type: "UPDATE_VARIABLE" as BlockType, label: "Update Variable" },
    { type: "GET_VARIABLE" as BlockType, label: "Get Variable" },
  ],
  condition: [
    { type: "CONDITION" as BlockType, label: "Condition" },
  ],
  navigation: [
    { type: "GOTO_NODE" as BlockType, label: "Go To Node" },
    { type: "END_WORKFLOW" as BlockType, label: "End Workflow" },
  ],
};

// Dropdown helper components
interface DropdownProps {
  trigger: React.ReactNode;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SelectButton: React.FC<{
  children: React.ReactNode;
  placeholder?: boolean;
  className?: string;
}> = ({ children, placeholder = false, className = "" }) => (
  <button
    className={cn(
      "flex items-center gap-1 px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50",
      placeholder && "text-gray-500",
      className,
    )}
  >
    {children}
  </button>
);

export const WorkflowBlock: React.FC<WorkflowBlockProps> = ({
  block,
  index,
  nodeId,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  availableNodes = [],
  workflowNodes = [],
  availableVariablesOverride,
}) => {
  const config = block.type ? blockTypeConfig[block.type] : null;
  const Icon = config?.icon;

  const handleTypeChange = (newType: BlockType) => {
    onChange({ ...block, type: newType });
  };

  const handleFieldChange = (field: string, value: any) => {
    if (field === "source" && value?.startsWith?.("tool:")) {
      console.log('[WorkflowBlock] TOOL SOURCE CHANGE:', field, '=', value);
    }
    onChange({ ...block, [field]: value });
  };

  const allBlockTypes = [
    ...blockTypeCategories.ui.map((b) => ({ ...b, category: "Chat Starter Pack" })),
    ...blockTypeCategories.blackboard.map((b) => ({ ...b, category: "Blackboard" })),
    ...blockTypeCategories.condition.map((b) => ({ ...b, category: "Condition" })),
    ...blockTypeCategories.navigation.map((b) => ({ ...b, category: "Navigation" })),
  ];

  // Get variables defined before this block
  const currentAvailableVariables = availableVariablesOverride !== undefined
    ? availableVariablesOverride
    : getAvailableVariablesAtPosition(workflowNodes, nodeId, index);

  if (!block.type) {
    // New block - show type selector
    return (
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-gray-400 transition-colors"
        onClick={onSelect}
      >
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-3">Choose block type:</div>
          <div className="grid grid-cols-2 gap-2">
            {allBlockTypes.map(({ type, label }) => {
              const typeConfig = blockTypeConfig[type];
              const TypeIcon = typeConfig.icon;
              return (
                <button
                  key={type}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeChange(type);
                  }}
                  className="flex items-center gap-2 p-2 text-left hover:bg-gray-50 rounded text-sm border border-gray-200"
                >
                  <div
                    className={cn("p-1 rounded text-white", typeConfig.color)}
                  >
                    <TypeIcon className="w-3 h-3" />
                  </div>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-lg bg-white transition-all duration-200 hover:shadow-sm hover:border-gray-300",
        isSelected && "border-primary shadow-sm",
        "group relative",
      )}
      onClick={() => onSelect()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("p-1.5 rounded text-white", config.color)}>
              <Icon className="w-3 h-3" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-900">
              {config?.label}
            </div>
            {/* Type selector always visible */}
            <Dropdown
              trigger={
                <Button variant="ghost" size="sm" className="h-6 px-1">
                  <ChevronDown className="w-3 h-3" />
                </Button>
              }
              options={allBlockTypes.map((b) => ({
                value: b.type,
                label: b.label,
              }))}
              onSelect={(newType) => handleTypeChange(newType as BlockType)}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">#{index + 1}</span>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Content - Always editable */}
      <div className="p-3 space-y-3">
        {/* PRESENT_CONTENT */}
        {block.type === "PRESENT_CONTENT" && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-2">Content:</div>
            <VariableAutocomplete
              value={block.payload || ""}
              onChange={(value) => handleFieldChange("payload", value)}
              availableVariables={currentAvailableVariables}
              placeholder="Content to display... Use @ to reference variables"
              className="w-full min-h-[80px] text-sm border border-gray-300 rounded-md px-3 py-2"
              multiline={true}
            />
          </div>
        )}

        {/* AWAIT_USER_INPUT */}
        {block.type === "AWAIT_USER_INPUT" && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-2">Target Variable (optional):</div>
            <Input
              value={block.target || ""}
              onChange={(e) => handleFieldChange("target", e.target.value)}
              placeholder="Variable name to store input (leave empty for generic input)"
              className="h-9 text-sm w-full"
            />
          </div>
        )}

        {/* SET_VARIABLE */}
        {block.type === "SET_VARIABLE" && (() => {
          console.log('[WorkflowBlock] SET_VARIABLE render - block.source:', block.source, 'block.action:', block.action, 'full block:', JSON.stringify(block, null, 2));
          return (
            <div className="space-y-3 w-full">
              <div>
                <div className="text-xs text-gray-500 mb-2">Target Variable:</div>
                <Input
                  value={block.target || ""}
                  onChange={(e) => handleFieldChange("target", e.target.value)}
                  placeholder="Variable name (free text)"
                  className="h-9 text-sm w-full"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Source Value:</div>
                <ActionOrValueSelector
                  value={block.source || ""}
                  onChange={(value) => {
                    console.log('[WorkflowBlock] ActionOrValueSelector onChange called with:', value);

                    // Handle tool selection in a single update
                    if (value?.startsWith?.("tool:")) {
                      const toolId = value.replace("tool:", "");
                      console.log('[WorkflowBlock] Tool selected, updating all fields at once:', { source: value, action: toolId });

                      // Update all tool-related fields in a single change
                      onChange({
                        ...block,
                        source: value,
                        action: toolId,
                        actionArgs: {} // Reset args when changing tool
                      });
                    } else {
                      // Non-tool selection, just update source
                      handleFieldChange("source", value);
                    }
                  }}
                  availableVariables={currentAvailableVariables}
                  placeholder="Enter static value..."
                  onToolArgChange={(argName, argValue) => {
                    console.log('[WorkflowBlock] Tool arg change:', argName, '=', argValue);
                    const newArgs = { ...block.actionArgs, [argName]: argValue };
                    handleFieldChange("actionArgs", newArgs);
                  }}
                  toolArgs={block.actionArgs}
                />
              </div>
            </div>
          );
        })()}

        {/* UPDATE_VARIABLE */}
        {block.type === "UPDATE_VARIABLE" && (
          <div className="space-y-3 w-full">
            <div>
              <div className="text-xs text-gray-500 mb-2">Target Variable:</div>
              <div className="flex gap-2">
                <Input
                  value={block.target || ""}
                  onChange={(e) => handleFieldChange("target", e.target.value)}
                  placeholder="Variable name"
                  className="h-9 text-sm flex-1"
                />
                {currentAvailableVariables.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleFieldChange("target", e.target.value);
                      }
                    }}
                    className="h-9 text-sm border border-gray-300 rounded-md px-3 w-[140px]"
                  >
                    <option value="">Choose...</option>
                    {currentAvailableVariables.map((variable) => (
                      <option key={variable} value={variable}>
                        {variable}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-2">Source Value:</div>
              <ActionOrValueSelector
                value={block.source || ""}
                onChange={(value) => {
                  console.log('[WorkflowBlock] ActionOrValueSelector onChange called with:', value);

                  // Handle tool selection in a single update
                  if (value?.startsWith?.("tool:")) {
                    const toolId = value.replace("tool:", "");
                    console.log('[WorkflowBlock] Tool selected, updating all fields at once:', { source: value, action: toolId });

                    // Update all tool-related fields in a single change
                    onChange({
                      ...block,
                      source: value,
                      action: toolId,
                      actionArgs: {} // Reset args when changing tool
                    });
                  } else {
                    // Non-tool selection, just update source
                    handleFieldChange("source", value);
                  }
                }}
                availableVariables={currentAvailableVariables}
                placeholder="Enter value to update with..."
                onToolArgChange={(argName, argValue) => {
                  console.log('[WorkflowBlock] Tool arg change:', argName, '=', argValue);
                  const newArgs = { ...block.actionArgs, [argName]: argValue };
                  handleFieldChange("actionArgs", newArgs);
                }}
                toolArgs={block.actionArgs}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-2">Operation:</div>
              <Dropdown
                trigger={
                  <SelectButton className="w-full">
                    {block.operation === "append" ? "Append" : "Set (Replace)"}
                    <ChevronDown size={14} />
                  </SelectButton>
                }
                options={[
                  { value: "set", label: "Set (Replace)" },
                  { value: "append", label: "Append" },
                ]}
                onSelect={(value) => handleFieldChange("operation", value)}
              />
            </div>
          </div>
        )}

        {/* GOTO_NODE - Dropdown only */}
        {block.type === "GOTO_NODE" && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-2">Target Node:</div>
            <select
              value={block.target || ""}
              onChange={(e) => handleFieldChange("target", e.target.value)}
              className="h-9 text-sm border border-gray-300 rounded-md px-3 w-full"
            >
              <option value="">Select node...</option>
              {availableNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CONDITION */}
        {block.type === "CONDITION" && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-2">
              Conditions & Actions:
            </div>
            <SimpleConditionEditor
              block={block}
              onChange={onChange}
              availableVariables={currentAvailableVariables}
              availableNodes={availableNodes}
            />
          </div>
        )}

        {/* GET_VARIABLE */}
        {block.type === "GET_VARIABLE" && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Source Variable:</div>
            <select
              value={block.source || ""}
              onChange={(e) => handleFieldChange("source", e.target.value)}
              className="h-8 text-sm border border-gray-300 rounded-md px-2 w-full"
            >
              <option value="">Select variable...</option>
              {currentAvailableVariables.map((variable) => (
                <option key={variable} value={variable}>
                  {variable}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
