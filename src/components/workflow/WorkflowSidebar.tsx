import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useState } from "react";

interface Workflow {
    name: string;
    path: string;
}

interface WorkflowSidebarProps {
    workflows: Workflow[];
    onSelectWorkflow: (path: string) => void;
    onCreateWorkflow?: (name: string, description: string) => Promise<void>;
    selectedWorkflowPath: string | null;
}

export const WorkflowSidebar = ({ workflows, onSelectWorkflow, onCreateWorkflow, selectedWorkflowPath }: WorkflowSidebarProps) => {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newWorkflowName, setNewWorkflowName] = useState("");
    const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateWorkflow = async () => {
        if (!newWorkflowName.trim() || !onCreateWorkflow) return;

        setIsCreating(true);
        try {
            await onCreateWorkflow(newWorkflowName, newWorkflowDescription);
            setShowCreateDialog(false);
            setNewWorkflowName("");
            setNewWorkflowDescription("");
        } catch (error) {
            console.error("Failed to create workflow:", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="h-full bg-white border-r border-gray-200 p-2 space-y-2">
            <div className="p-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold tracking-tight">
                        Workflows
                    </h2>
                    {onCreateWorkflow && (
                        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Workflow</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="workflow-name">Workflow Name</Label>
                                        <Input
                                            id="workflow-name"
                                            placeholder="Enter workflow name"
                                            value={newWorkflowName}
                                            onChange={(e) => setNewWorkflowName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="workflow-description">Description (optional)</Label>
                                        <Textarea
                                            id="workflow-description"
                                            placeholder="Enter workflow description"
                                            value={newWorkflowDescription}
                                            onChange={(e) => setNewWorkflowDescription(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowCreateDialog(false)}
                                            disabled={isCreating}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleCreateWorkflow}
                                            disabled={!newWorkflowName.trim() || isCreating}
                                        >
                                            {isCreating ? "Creating..." : "Create"}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
            <div className="space-y-1">
                {Array.isArray(workflows) && workflows.map((workflow) => (
                    <Button
                        key={workflow.path}
                        variant={selectedWorkflowPath === workflow.path ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => onSelectWorkflow(workflow.path)}
                    >
                        {workflow.name}
                    </Button>
                ))}
            </div>
        </div>
    );
}; 