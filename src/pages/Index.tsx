import { WorkflowEditor } from "@/components/workflow/WorkflowEditor";
import { WorkflowSidebar } from "@/components/workflow/WorkflowSidebar";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useEffect, useRef } from "react";

const Index = () => {
  const workflowHook = useWorkflow();
  const { actions, availableWorkflows, currentWorkflowPath } = workflowHook;
  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    actions.loadWorkflows();
  }, []);

  // Auto-select the first workflow when workflows are loaded
  useEffect(() => {
    if (
      availableWorkflows.length > 0 &&
      !currentWorkflowPath &&
      !hasAutoSelectedRef.current
    ) {
      hasAutoSelectedRef.current = true;
      const firstWorkflow = availableWorkflows[0];
      actions.loadWorkflow(firstWorkflow.path);
    }
  }, [availableWorkflows, currentWorkflowPath, actions]);

  const handleSelectWorkflow = (path: string) => {
    actions.loadWorkflow(path);
  };

  const handleCreateWorkflow = async (name: string, description: string) => {
    await actions.createWorkflow(name, description);
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="w-64 border-r border-gray-200">
        <WorkflowSidebar
          workflows={availableWorkflows}
          selectedWorkflowPath={currentWorkflowPath}
          onSelectWorkflow={handleSelectWorkflow}
          onCreateWorkflow={handleCreateWorkflow}
        />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-[40%] min-w-[600px]">
          <WorkflowEditor workflowHook={workflowHook} />
        </div>
      </div>
    </div>
  );
};

export default Index;
