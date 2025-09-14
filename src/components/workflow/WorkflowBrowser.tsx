import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiService, WorkflowListItem } from "@/lib/api";
import { AlertCircle, FileText, Loader2, Plus, Search, Upload } from "lucide-react";
import React, { useEffect, useState } from "react";

interface WorkflowBrowserProps {
    onSelectWorkflow?: (workflowPath: string) => void;
    onCreateNew?: () => void;
    selectedWorkflowPath?: string;
}

export const WorkflowBrowser: React.FC<WorkflowBrowserProps> = ({
    onSelectWorkflow,
    onCreateNew,
    selectedWorkflowPath,
}) => {
    const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            setLoading(true);
            setError(null);
            const workflowList = await apiService.listWorkflows();
            setWorkflows(workflowList);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load workflows");
        } finally {
            setLoading(false);
        }
    };

    const filteredWorkflows = workflows.filter((workflow) => {
        return (
            workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            workflow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            workflow.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const getStatusColor = (nodeCount: number): string => {
        if (nodeCount === 0) return "bg-red-100 text-red-800";
        if (nodeCount < 5) return "bg-yellow-100 text-yellow-800";
        return "bg-green-100 text-green-800";
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Available Workflows
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="ml-2">Loading workflows...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Available Workflows
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button onClick={loadWorkflows} className="mt-4">
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Available Workflows
                    <Badge variant="secondary">{workflows.length} workflows</Badge>
                </CardTitle>

                {/* Search and Controls */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search workflows..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={onCreateNew}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Workflow
                        </Button>
                        <Button
                            onClick={loadWorkflows}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                        {filteredWorkflows.map((workflow) => (
                            <Card
                                key={workflow.path}
                                className={`cursor-pointer transition-colors ${selectedWorkflowPath === workflow.path ? "ring-2 ring-primary" : "hover:bg-muted/50"
                                    }`}
                                onClick={() => onSelectWorkflow?.(workflow.path)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold">{workflow.name}</h4>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                className={getStatusColor(workflow.node_count)}
                                                variant="secondary"
                                            >
                                                {workflow.node_count} nodes
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{workflow.description}</p>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-4">
                                            <span className="font-medium">ID: {workflow.id}</span>
                                            <span className="text-muted-foreground">
                                                {workflow.variable_count} variables
                                            </span>
                                        </div>
                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                            {workflow.path}
                                        </code>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {filteredWorkflows.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">
                                    {searchTerm ? "No workflows found matching your search." : "No workflows available."}
                                </p>
                                {!searchTerm && (
                                    <Button
                                        onClick={onCreateNew}
                                        variant="outline"
                                        className="mt-4"
                                    >
                                        Create your first workflow
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}; 