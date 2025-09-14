import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseWorkflowReturn } from "@/hooks/useWorkflow";
import { cn } from "@/lib/utils";
import { WorkflowNode as WorkflowNodeType } from "@/types/workflow";
import {
  exportWorkflowToYaml,
  parseYamlWorkflow,
} from "@/utils/yaml";
import {
  Download,
  Edit3,
  FileText,
  Play,
  Plus,
  Save,
  Settings,
  Upload,
  Workflow,
  X
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { WorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowNode } from "./WorkflowNode";

interface WorkflowEditorProps {
  workflowHook: UseWorkflowReturn;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflowHook }) => {
  const { state, actions, isLoading, error, currentWorkflowPath } = workflowHook;
  const [yamlInput, setYamlInput] = useState("");
  const [showYamlImport, setShowYamlImport] = useState(false);
  const [showExecutor, setShowExecutor] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("browser");
  const [isEditingWorkflowName, setIsEditingWorkflowName] = useState(false);
  const [editingWorkflowNameValue, setEditingWorkflowNameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available workflows on mount
  useEffect(() => {
    actions.loadWorkflows().catch(console.error);
  }, []);

  const handleSelectWorkflow = async (workflowPath: string) => {
    try {
      setLocalError(null);
      await actions.loadWorkflow(workflowPath);
      setActiveTab("editor");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to load workflow");
    }
  };

  const handleSaveWorkflow = async () => {
    if (!currentWorkflowPath) {
      setLocalError("No workflow path specified");
      return;
    }

    try {
      setLocalError(null);
      await actions.saveWorkflow(currentWorkflowPath);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to save workflow");
    }
  };

  const handleImportYaml = () => {
    try {
      setLocalError(null);
      const workflow = parseYamlWorkflow(yamlInput);
      actions.setWorkflow(workflow);
      setShowYamlImport(false);
      setYamlInput("");
      setActiveTab("editor");
    } catch (err) {
      setLocalError("Failed to parse YAML. Please check the format.");
    }
  };

  const handleExportYaml = () => {
    if (!state.workflow) return;

    const yaml = exportWorkflowToYaml(state.workflow);
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.workflow.id || "workflow"}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setYamlInput(content);
      setShowYamlImport(true);
    };
    reader.readAsText(file);
  };

  const handleCreateSample = async () => {
    try {
      const response = await fetch('/src/data/sample-workflow.yaml');
      const yamlContent = await response.text();
      const sampleWorkflow = parseYamlWorkflow(yamlContent);
      actions.setWorkflow(sampleWorkflow);
    } catch (error) {
      console.error('Failed to load sample workflow:', error);
    }
  };

  const handleAddNode = () => {
    const newNode: WorkflowNodeType = {
      id: `node-${Date.now()}`,
      title: "New Node",
      blocks: [],
    };
    actions.addNode(newNode);
  };

  const handleInsertNode = (afterIndex: number) => {
    const newNode: WorkflowNodeType = {
      id: `node-${Date.now()}`,
      title: "New Node",
      blocks: [],
    };

    if (!state.workflow) return;

    const updatedNodes = [...state.workflow.nodes];
    updatedNodes.splice(afterIndex + 1, 0, newNode);

    actions.setWorkflow({
      ...state.workflow,
      nodes: updatedNodes,
    });
  };

  const handleWorkflowPropertyChange = (field: string, value: string) => {
    if (!state.workflow) return;

    const updatedWorkflow = { ...state.workflow, [field]: value };
    actions.setWorkflow(updatedWorkflow);
  };

  const handleWorkflowNameEditStart = () => {
    if (!state.workflow) return;
    setEditingWorkflowNameValue(state.workflow.name);
    setIsEditingWorkflowName(true);
  };

  const handleWorkflowNameChange = (newName: string) => {
    setEditingWorkflowNameValue(newName);
  };

  const handleWorkflowNameSave = () => {
    if (!state.workflow) return;
    handleWorkflowPropertyChange("name", editingWorkflowNameValue);
    setIsEditingWorkflowName(false);
  };

  const handleWorkflowNameCancel = () => {
    if (!state.workflow) return;
    setEditingWorkflowNameValue(state.workflow.name);
    setIsEditingWorkflowName(false);
  };

  if (!state.workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Workflow className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Select a workflow</h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose a workflow from the sidebar to view and edit it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="mb-4 lg:mb-0">
          <div className="text-3xl font-bold text-foreground flex items-center gap-3 group">
            <div className="p-2 bg-primary rounded-lg text-primary-foreground">
              <Workflow className="w-6 h-6" />
            </div>
            {isEditingWorkflowName ? (
              <Input
                value={editingWorkflowNameValue}
                onChange={(e) => handleWorkflowNameChange(e.target.value)}
                onBlur={handleWorkflowNameSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleWorkflowNameSave();
                  } else if (e.key === "Escape") {
                    handleWorkflowNameCancel();
                  }
                }}
                className="text-3xl font-bold border-none p-0 focus:ring-0 bg-transparent"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">
                  {state.workflow.name}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                  onClick={handleWorkflowNameEditStart}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {state.workflow.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowYamlImport(true)}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Paste YAML
          </Button>
          <Button
            variant="outline"
            onClick={handleExportYaml}
            disabled={!state.workflow}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateSample}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Sample
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveWorkflow}
            disabled={isLoading || !currentWorkflowPath}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowProperties(!showProperties)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Properties
          </Button>
          <Button
            onClick={() => setShowExecutor(true)}
            disabled={!state.workflow}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Run
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {localError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      {state.workflow ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className={cn(
            "lg:col-span-4 transition-all duration-300 ease-in-out",
            showProperties && "lg:col-span-3"
          )}>
            <Card>
              <CardHeader>
                <CardTitle>Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.workflow.nodes.map((node, index) => (
                    <React.Fragment key={node.id}>
                      <WorkflowNode
                        node={node}
                        onChange={(updatedNode) => actions.updateNode(node.id, updatedNode)}
                        onDelete={() => actions.deleteNode(node.id)}
                        isSelected={state.selectedNodeId === node.id}
                        onSelect={() => actions.selectNode(node.id)}
                        onAddBlock={(blockType) => {
                          // This will be handled by the node component
                        }}
                        onSelectBlock={(blockIndex) => {
                          actions.selectNode(node.id);
                          actions.selectBlock(node.id, blockIndex);
                        }}
                        isEditing={true}
                        selectedBlockIndex={state.selectedNodeId === node.id ? state.selectedBlockIndex : null}
                        availableNodes={state.workflow.nodes}
                        workflowNodes={state.workflow.nodes}
                      />
                    </React.Fragment>
                  ))}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={handleAddNode}
                      className="mt-4 gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Node
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            className={cn(
              "lg:col-span-1 transition-all duration-300 ease-in-out",
              !showProperties && "hidden"
            )}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Properties</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowProperties(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workflow-name">Name</Label>
                    <Input
                      id="workflow-name"
                      value={state.workflow.name}
                      onChange={(e) => handleWorkflowPropertyChange("name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="workflow-desc">Description</Label>
                    <Textarea
                      id="workflow-desc"
                      value={state.workflow.description}
                      onChange={(e) => handleWorkflowPropertyChange("description", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Variables</Label>
                    {state.workflow.variables.map((variable, index) => (
                      <div key={index} className="flex items-center gap-2 mt-1">
                        <Input value={variable} readOnly />
                        <Badge variant="secondary">{typeof variable}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Workflow className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">No Workflow Loaded</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Import an existing workflow from YAML/JSON, paste YAML content, or
            create a sample workflow to get started.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Workflow
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowYamlImport(true)}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Paste YAML
            </Button>
            <Button
              variant="outline"
              onClick={handleCreateSample}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Sample
            </Button>
          </div>
        </div>
      )}

      {/* YAML Import Modal */}
      {showYamlImport && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Import YAML Workflow
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowYamlImport(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="yaml-input">YAML Content</Label>
                <Textarea
                  id="yaml-input"
                  value={yamlInput}
                  onChange={(e) => setYamlInput(e.target.value)}
                  placeholder="Paste your workflow YAML here..."
                  className="mt-1 font-mono text-sm h-64"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleImportYaml}
                  disabled={!yamlInput.trim()}
                >
                  Import Workflow
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowYamlImport(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showExecutor && (
        <Dialog open={showExecutor} onOpenChange={(open) => setShowExecutor(open)}>
          <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Workflow Executor</DialogTitle>
            </DialogHeader>
            <div className="h-full overflow-auto">
              <WorkflowExecutor
                workflow={state.workflow}
                workflowPath={currentWorkflowPath}
                onClose={() => setShowExecutor(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
