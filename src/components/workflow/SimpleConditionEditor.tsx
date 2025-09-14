import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BlockType, WorkflowBlock, WorkflowNode } from "@/types/workflow";
import { Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { ActionSelector } from "./ActionSelector";
import { VariableAutocomplete } from "./VariableAutocomplete";
import { WorkflowBlock as WorkflowBlockComponent } from "./WorkflowBlock";

interface SimpleConditionEditorProps {
    block: WorkflowBlock;
    onChange: (block: WorkflowBlock) => void;
    availableVariables: string[];
    availableNodes?: WorkflowNode[];
}

interface SimpleCondition {
    id: string;
    variable: string;
    operator: string;
    value: string;
}

// Enhanced block editor for nested actions that supports editing existing blocks
const ActionBlockEditor: React.FC<{
    block: WorkflowBlock;
    onChange: (block: WorkflowBlock) => void;
    onDelete: () => void;
    availableVariables: string[];
    availableNodes: WorkflowNode[];
}> = ({ block, onChange, onDelete, availableVariables, availableNodes }) => {
    const handleFieldChange = (field: string, value: any) => {
        onChange({ ...block, [field]: value });
    };

    const getBlockTypeName = (type: BlockType) => {
        const typeMap: Record<BlockType, string> = {
            'PRESENT_CONTENT': 'Present Content',
            'AWAIT_USER_INPUT': 'Await User Input',
            'SET_VARIABLE': 'Set Variable',
            'UPDATE_VARIABLE': 'Update Variable',
            'GET_VARIABLE': 'Get Variable',
            'GOTO_NODE': 'Go To Node',
            'END_WORKFLOW': 'End Workflow',
            'CONDITION': 'Condition'
        };
        return typeMap[type] || type;
    };

    return (
        <div className="border border-gray-200 rounded-md p-2 space-y-2 bg-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {getBlockTypeName(block.type)}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-7 w-7 p-0 ml-2"
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>

            {/* PRESENT_CONTENT */}
            {block.type === "PRESENT_CONTENT" && (
                <div className="w-full">
                    <VariableAutocomplete
                        value={block.payload || ""}
                        onChange={(value) => handleFieldChange("payload", value)}
                        availableVariables={availableVariables}
                        placeholder="Content to display... Use @ for variables"
                        className="w-full min-h-[80px] text-sm border border-gray-300 rounded-md px-3 py-2"
                        multiline={true}
                    />
                </div>
            )}

            {/* AWAIT_USER_INPUT */}
            {block.type === "AWAIT_USER_INPUT" && (
                <div className="space-y-2 w-full">
                    <Input
                        value={block.target || ""}
                        onChange={(e) => handleFieldChange("target", e.target.value)}
                        placeholder="Variable name"
                        className="h-9 text-sm w-full"
                    />
                    <VariableAutocomplete
                        value={block.prompt || ""}
                        onChange={(value) => handleFieldChange("prompt", value)}
                        availableVariables={availableVariables}
                        placeholder="Prompt (optional)... Use @ for variables"
                        className="w-full min-h-[80px] text-sm border border-gray-300 rounded-md px-3 py-2"
                        multiline={true}
                    />
                </div>
            )}

            {/* SET_VARIABLE */}
            {block.type === "SET_VARIABLE" && (
                <div className="space-y-2 w-full">
                    <Input
                        value={block.target || ""}
                        onChange={(e) => handleFieldChange("target", e.target.value)}
                        placeholder="Variable name"
                        className="h-9 text-sm w-full"
                    />
                    <VariableAutocomplete
                        value={block.source || ""}
                        onChange={(value) => handleFieldChange("source", value)}
                        availableVariables={availableVariables}
                        placeholder="Value... Use @ for variables"
                        className="w-full min-h-[80px] text-sm border border-gray-300 rounded-md px-3 py-2"
                        multiline={true}
                    />
                </div>
            )}

            {/* UPDATE_VARIABLE */}
            {block.type === "UPDATE_VARIABLE" && (
                <div className="space-y-2 w-full">
                    <Select
                        value={block.target || ""}
                        onValueChange={(value) => handleFieldChange("target", value)}
                    >
                        <SelectTrigger className="h-9 text-sm w-full">
                            <SelectValue placeholder="Select variable" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableVariables.map((variable) => (
                                <SelectItem key={variable} value={variable}>
                                    {variable}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <VariableAutocomplete
                        value={block.source || ""}
                        onChange={(value) => handleFieldChange("source", value)}
                        availableVariables={availableVariables}
                        placeholder="Value to append/set... Use @ for variables"
                        className="w-full min-h-[80px] text-sm border border-gray-300 rounded-md px-3 py-2"
                        multiline={true}
                    />
                    <Select
                        value={block.operation || "set"}
                        onValueChange={(value) => handleFieldChange("operation", value)}
                    >
                        <SelectTrigger className="h-9 text-sm w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="set">Set (Replace)</SelectItem>
                            <SelectItem value="append">Append</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* GOTO_NODE */}
            {block.type === "GOTO_NODE" && (
                <div>
                    <Select
                        value={block.target || ""}
                        onValueChange={(value) => handleFieldChange("target", value)}
                    >
                        <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select node" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableNodes.map((node) => (
                                <SelectItem key={node.id} value={node.id}>
                                    {node.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* END_WORKFLOW */}
            {block.type === "END_WORKFLOW" && (
                <div className="text-xs text-gray-500 italic">
                    This action ends the workflow execution.
                </div>
            )}
        </div>
    );
};

export const SimpleConditionEditor: React.FC<SimpleConditionEditorProps> = ({
    block,
    onChange,
    availableVariables,
    availableNodes = [],
}) => {
    // State for showing action selectors
    const [showThenActionSelector, setShowThenActionSelector] = useState(false);
    const [showElseActionSelector, setShowElseActionSelector] = useState(false);

    // Parse existing rules into simple conditions
    const parseConditions = (): SimpleCondition[] => {
        if (block.rules && block.rules.length > 0) {
            return block.rules.map((rule, index) => {
                // Handle new structured format with variable, operator, value
                return {
                    id: `condition_${index}`,
                    variable: rule.variable || "",
                    operator: rule.operator || "equals",
                    value: rule.value || "",
                };
            });
        }
        return [{ id: `condition_${Date.now()}`, variable: "", operator: "equals", value: "" }];
    };

    const [conditions, setConditions] = useState<SimpleCondition[]>(parseConditions());

    const operators = [
        { value: "equals", label: "equals" },
        { value: "not_equals", label: "not equals" },
        { value: "is_true", label: "is true" },
        { value: "is_false", label: "is false" },
        { value: "contains", label: "contains" },
        { value: "starts_with", label: "starts with" },
        { value: "ends_with", label: "ends with" },
        { value: "greater_than", label: "greater than" },
        { value: "less_than", label: "less than" },
        { value: "greater_than_or_equal", label: "greater than or equal" },
        { value: "less_than_or_equal", label: "less than or equal" },
    ];

    const updateConditions = (newConditions: SimpleCondition[]) => {
        setConditions(newConditions);

        // Convert back to ConditionRule format using structured format
        const rules = newConditions.map(condition => ({
            variable: condition.variable,
            operator: condition.operator,
            value: condition.value,
            then: getCurrentThenActions(),
            else: getCurrentElseActions()
        }));

        onChange({ ...block, rules });
    };

    // Helper functions to get current actions from the right location
    const getCurrentThenActions = (): WorkflowBlock[] => {
        if (block.rules && block.rules.length > 0 && block.rules[0].then) {
            return block.rules[0].then;
        }
        return block.then || [];
    };

    const getCurrentElseActions = (): WorkflowBlock[] => {
        if (block.rules && block.rules.length > 0 && block.rules[0].else) {
            return block.rules[0].else;
        }
        return block.else || [];
    };

    const updateCondition = (id: string, updates: Partial<SimpleCondition>) => {
        const newConditions = conditions.map(c =>
            c.id === id ? { ...c, ...updates } : c
        );
        updateConditions(newConditions);
    };

    const addCondition = () => {
        const newCondition: SimpleCondition = {
            id: `condition_${Date.now()}`,
            variable: "",
            operator: "equals",
            value: ""
        };
        updateConditions([...conditions, newCondition]);
    };

    const removeCondition = (id: string) => {
        const newConditions = conditions.filter(c => c.id !== id);
        updateConditions(newConditions);
    };

    // Action management functions
    const addThenAction = (newAction: WorkflowBlock) => {
        const currentThen = getCurrentThenActions();
        updateActionsInRules([...currentThen, newAction], getCurrentElseActions());
        setShowThenActionSelector(false);
    };

    const addElseAction = (newAction: WorkflowBlock) => {
        const currentElse = getCurrentElseActions();
        updateActionsInRules(getCurrentThenActions(), [...currentElse, newAction]);
        setShowElseActionSelector(false);
    };

    const updateThenAction = (index: number, updatedAction: WorkflowBlock) => {
        const newThen = [...getCurrentThenActions()];
        newThen[index] = updatedAction;
        updateActionsInRules(newThen, getCurrentElseActions());
    };

    const updateElseAction = (index: number, updatedAction: WorkflowBlock) => {
        const newElse = [...getCurrentElseActions()];
        newElse[index] = updatedAction;
        updateActionsInRules(getCurrentThenActions(), newElse);
    };

    const deleteThenAction = (index: number) => {
        const newThen = getCurrentThenActions().filter((_, i) => i !== index);
        updateActionsInRules(newThen, getCurrentElseActions());
    };

    const deleteElseAction = (index: number) => {
        const newElse = getCurrentElseActions().filter((_, i) => i !== index);
        updateActionsInRules(getCurrentThenActions(), newElse);
    };

    // Helper to update actions in the rules structure
    const updateActionsInRules = (thenActions: WorkflowBlock[], elseActions: WorkflowBlock[]) => {
        const updatedRules = (block.rules || []).map((rule, index) => {
            if (index === 0) {
                return {
                    ...rule,
                    then: thenActions,
                    else: elseActions
                };
            }
            return rule;
        });

        // If no rules exist, create one
        if (updatedRules.length === 0) {
            updatedRules.push({
                if: "",
                then: thenActions,
                else: elseActions
            });
        }

        onChange({ ...block, rules: updatedRules });
    };

    return (
        <div className="space-y-4 bg-white p-3 rounded-lg border border-gray-200">
            <div className="text-sm font-medium text-purple-700">
                Conditions (all must be true):
            </div>

            {conditions.map((condition) => (
                <div key={condition.id} className="grid grid-cols-[auto,3fr,auto,2fr,auto] gap-2 items-center group">
                    <span className="text-xs text-gray-600">Where:</span>

                    <Select
                        value={condition.variable}
                        onValueChange={(value) => updateCondition(condition.id, { variable: value })}
                    >
                        <SelectTrigger className="h-8 text-xs min-w-[140px]">
                            <SelectValue placeholder="Select variable" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableVariables.map((variable) => (
                                <SelectItem key={variable} value={variable} title={variable}>
                                    {variable}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                    >
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {operators.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <VariableAutocomplete
                        value={condition.value}
                        onChange={(value) => updateCondition(condition.id, { value })}
                        availableVariables={availableVariables}
                        placeholder="Value... Use @ to reference variables"
                        className="h-8 text-xs border border-gray-300 rounded-md px-3"
                    />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            ))}

            <Button
                variant="ghost"
                size="sm"
                onClick={addCondition}
                className="text-purple-600 hover:text-purple-800 h-8"
            >
                <Plus className="w-3 h-3 mr-1" />
                Add condition
            </Button>

            {/* Then Actions */}
            <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-purple-700">
                        Then do:
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowThenActionSelector(true)}
                        className="text-purple-600 hover:text-purple-800 h-7 text-xs"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add action
                    </Button>
                </div>

                <div className="space-y-2">
                    {getCurrentThenActions().map((action, index) => (
                        <WorkflowBlockComponent
                            key={`then-${index}`}
                            block={action}
                            index={index}
                            nodeId="condition"
                            isSelected={false}
                            onSelect={() => { }}
                            onChange={(updatedAction) => updateThenAction(index, updatedAction)}
                            onDelete={() => deleteThenAction(index)}
                            availableNodes={availableNodes}
                            workflowNodes={[]}
                            availableVariablesOverride={availableVariables}
                        />
                    ))}

                    {/* Show action selector when adding new action */}
                    {showThenActionSelector && (
                        <ActionSelector
                            onSelect={addThenAction}
                            onCancel={() => setShowThenActionSelector(false)}
                            availableVariables={availableVariables}
                            availableNodes={availableNodes}
                        />
                    )}

                    {getCurrentThenActions().length === 0 && !showThenActionSelector && (
                        <div className="text-xs text-purple-600 italic">
                            No actions defined. Click "Add action" to get started.
                        </div>
                    )}
                </div>
            </div>

            {/* Else Actions */}
            <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-purple-700">
                        Else do (optional):
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowElseActionSelector(true)}
                        className="text-purple-600 hover:text-purple-800 h-7 text-xs"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add action
                    </Button>
                </div>

                <div className="space-y-2">
                    {getCurrentElseActions().map((action, index) => (
                        <WorkflowBlockComponent
                            key={`else-${index}`}
                            block={action}
                            index={index}
                            nodeId="condition"
                            isSelected={false}
                            onSelect={() => { }}
                            onChange={(updatedAction) => updateElseAction(index, updatedAction)}
                            onDelete={() => deleteElseAction(index)}
                            availableNodes={availableNodes}
                            workflowNodes={[]}
                            availableVariablesOverride={availableVariables}
                        />
                    ))}

                    {/* Show action selector when adding new action */}
                    {showElseActionSelector && (
                        <ActionSelector
                            onSelect={addElseAction}
                            onCancel={() => setShowElseActionSelector(false)}
                            availableVariables={availableVariables}
                            availableNodes={availableNodes}
                        />
                    )}

                    {getCurrentElseActions().length === 0 && !showElseActionSelector && (
                        <div className="text-xs text-purple-600 italic">
                            No else actions defined.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 