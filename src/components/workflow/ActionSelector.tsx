import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionDefinition, apiService, ToolDefinition } from "@/lib/api";
import { BlockType, WorkflowBlock, WorkflowNode } from "@/types/workflow";
import { Code, GitBranch, Type as InputIcon, MessageSquare, Navigation, Search, Settings, Square, Trash2, Zap } from "lucide-react";
import React, { useEffect, useState } from "react";

// Built-in block type definitions
const builtInBlockTypes = {
    PRESENT_CONTENT: {
        icon: MessageSquare,
        label: "Present Content",
        color: "bg-blue-500",
        description: "Display content to the user",
        category: "UI"
    },
    AWAIT_USER_INPUT: {
        icon: InputIcon,
        label: "Await User Input",
        color: "bg-green-500",
        description: "Wait for user input",
        category: "UI"
    },
    SET_VARIABLE: {
        icon: Settings,
        label: "Set Variable",
        color: "bg-purple-500",
        description: "Set a variable value",
        category: "Variables"
    },
    UPDATE_VARIABLE: {
        icon: Settings,
        label: "Update Variable",
        color: "bg-purple-600",
        description: "Update an existing variable",
        category: "Variables"
    },
    GET_VARIABLE: {
        icon: Settings,
        label: "Get Variable",
        color: "bg-purple-400",
        description: "Get a variable value",
        category: "Variables"
    },
    CONDITION: {
        icon: GitBranch,
        label: "Condition",
        color: "bg-slate-500",
        description: "Conditional logic",
        category: "Logic"
    },
    GOTO_NODE: {
        icon: Navigation,
        label: "Go To Node",
        color: "bg-indigo-500",
        description: "Navigate to another node",
        category: "Navigation"
    },
    END_WORKFLOW: {
        icon: Square,
        label: "End Workflow",
        color: "bg-red-500",
        description: "End the workflow",
        category: "Navigation"
    },
};

interface ActionSelectorProps {
    onSelect: (block: WorkflowBlock) => void;
    onCancel: () => void;
    availableVariables: string[];
    availableNodes: WorkflowNode[];
}

export const ActionSelector: React.FC<ActionSelectorProps> = ({
    onSelect,
    onCancel,
    availableVariables,
    availableNodes
}) => {
    const [actions, setActions] = useState<ActionDefinition[]>([]);
    const [tools, setTools] = useState<ToolDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    useEffect(() => {
        const loadActionsAndTools = async () => {
            try {
                setLoading(true);

                // Load actions using apiService
                try {
                    const actionsData = await apiService.getActionCatalog();
                    setActions(actionsData.actions || []);
                } catch (error) {
                    console.error('Failed to load actions:', error);
                }

                // Load tools using apiService
                try {
                    const toolsData = await apiService.getToolCatalog();
                    setTools(toolsData.tools || []);
                } catch (error) {
                    console.error('Failed to load tools:', error);
                }
            } catch (error) {
                console.error('Failed to load actions and tools:', error);
            } finally {
                setLoading(false);
            }
        };

        loadActionsAndTools();
    }, []);

    // Get built-in block types as an array with filtering
    const builtInBlocks = Object.entries(builtInBlockTypes).map(([type, config]) => ({
        type: type as BlockType,
        ...config
    }));

    const filteredBuiltInBlocks = builtInBlocks.filter(block => {
        const matchesSearch = block.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            block.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || block.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const allCategories = [...new Set([
        ...actions.map(a => a.category),
        ...tools.map(t => t.category),
        ...builtInBlocks.map(b => b.category)
    ])];

    const filteredActions = actions.filter(action => {
        const matchesSearch = action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            action.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || action.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const filteredTools = tools.filter(tool => {
        const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const createActionBlock = (action: ActionDefinition): WorkflowBlock => {
        // Map action to corresponding block type
        switch (action.id) {
            case 'present_content':
                return { type: 'PRESENT_CONTENT' as BlockType, payload: '' };
            case 'await_user_input':
                return { type: 'AWAIT_USER_INPUT' as BlockType, target: '', prompt: '' };
            case 'set_variable':
                return { type: 'SET_VARIABLE' as BlockType, target: '', source: '' };
            case 'update_variable':
                return { type: 'UPDATE_VARIABLE' as BlockType, target: '', source: '', operation: 'set' };
            case 'goto_node':
                return { type: 'GOTO_NODE' as BlockType, target: '' };
            case 'end_workflow':
                return { type: 'END_WORKFLOW' as BlockType };
            default:
                return { type: 'PRESENT_CONTENT' as BlockType, payload: '' };
        }
    };

    const createToolBlock = (tool: ToolDefinition): WorkflowBlock => {
        // Tools are typically used with SET_VARIABLE blocks that call the tool
        return {
            type: 'SET_VARIABLE' as BlockType,
            target: '',
            source: `{${tool.name}}`,
            action: tool.name,
            actionArgs: {}
        };
    };

    const createBuiltInBlock = (blockType: BlockType): WorkflowBlock => {
        switch (blockType) {
            case 'PRESENT_CONTENT':
                return { type: 'PRESENT_CONTENT', payload: '' };
            case 'AWAIT_USER_INPUT':
                return { type: 'AWAIT_USER_INPUT', target: '', prompt: '' };
            case 'SET_VARIABLE':
                return { type: 'SET_VARIABLE', target: '', source: '' };
            case 'UPDATE_VARIABLE':
                return { type: 'UPDATE_VARIABLE', target: '', source: '', operation: 'set' };
            case 'GET_VARIABLE':
                return { type: 'GET_VARIABLE', source: '' };
            case 'CONDITION':
                return { type: 'CONDITION', rules: [] };
            case 'GOTO_NODE':
                return { type: 'GOTO_NODE', target: '' };
            case 'END_WORKFLOW':
                return { type: 'END_WORKFLOW' };
            default:
                return { type: 'PRESENT_CONTENT', payload: '' };
        }
    };

    const ActionCard: React.FC<{ action: ActionDefinition }> = ({ action }) => (
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onSelect(createActionBlock(action))}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        {action.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                        {action.category}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-2">{action.description}</p>
                {action.arguments.length > 0 && (
                    <div className="text-xs text-gray-500">
                        Args: {action.arguments.map(arg => arg.name).join(', ')}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const ToolCard: React.FC<{ tool: ToolDefinition }> = ({ tool }) => (
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onSelect(createToolBlock(tool))}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Code className="w-4 h-4 text-green-500" />
                        {tool.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                        {tool.category}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <p className="text-xs text-gray-600 mb-2">{tool.description}</p>
                {tool.arguments.length > 0 && (
                    <div className="text-xs text-gray-500">
                        Args: {tool.arguments.map(arg => arg.name).join(', ')}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const BuiltInBlockCard: React.FC<{ block: typeof builtInBlocks[0] }> = ({ block }) => {
        const Icon = block.icon;
        return (
            <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onSelect(createBuiltInBlock(block.type))}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <div className={`p-1 rounded text-white ${block.color}`}>
                                <Icon className="w-3 h-3" />
                            </div>
                            {block.label}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                            {block.category}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <p className="text-xs text-gray-600">{block.description}</p>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <div className="p-4 text-center">
                <div className="text-sm text-gray-500">Loading actions and tools...</div>
            </div>
        );
    }

    return (
        <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Add Block</h3>
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Search and Filter */}
            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search blocks, actions and tools..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {allCategories.map(category => (
                            <SelectItem key={category} value={category}>
                                {category}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tabs for Blocks, Actions and Tools */}
            <Tabs defaultValue="blocks" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="blocks" className="text-xs">
                        Blocks ({filteredBuiltInBlocks.length})
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="text-xs">
                        Actions ({filteredActions.length})
                    </TabsTrigger>
                    <TabsTrigger value="tools" className="text-xs">
                        Tools ({filteredTools.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="blocks" className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredBuiltInBlocks.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                            No blocks found
                        </div>
                    ) : (
                        filteredBuiltInBlocks.map(block => (
                            <BuiltInBlockCard key={block.type} block={block} />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredActions.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                            No actions found
                        </div>
                    ) : (
                        filteredActions.map(action => (
                            <ActionCard key={action.id} action={action} />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="tools" className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredTools.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                            No tools found
                        </div>
                    ) : (
                        filteredTools.map(tool => (
                            <ToolCard key={tool.id} tool={tool} />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}; 