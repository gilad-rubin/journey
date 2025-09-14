import { Alert, AlertDescription } from "@/components/ui/alert";
import { Workflow } from "@/types/workflow";
import { workflowToMermaid } from "@/utils/workflowToMermaid";
import mermaid from "mermaid";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface WorkflowGraphProps {
  workflow: Workflow;
}

export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({ workflow }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const definition = useMemo(() => {
    try {
      return workflowToMermaid(workflow);
    } catch (e) {
      setError(`Failed to generate graph: ${e}`);
      return "";
    }
  }, [workflow]);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: "default",
      securityLevel: "loose",
      fontFamily: "inherit"
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setIsLoading(true);
    
    if (!containerRef.current || !definition) {
      setIsLoading(false);
      return;
    }

    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    const el = containerRef.current;
    
    // Clear previous content
    el.innerHTML = "";
    
    mermaid
      .render(id, definition)
      .then((res) => {
        if (!mounted) return;
        el.innerHTML = res.svg;
        setIsLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        console.error("Mermaid render error:", e);
        setError(String(e?.message || e));
        setIsLoading(false);
      });
      
    return () => {
      mounted = false;
    };
  }, [definition]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          <div>Failed to render workflow graph:</div>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{error}</pre>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-muted-foreground">Rendering graph...</div>
        </div>
      )}
      <div 
        ref={containerRef} 
        className={`w-full overflow-auto border rounded-md p-4 bg-white min-h-64 ${isLoading ? 'hidden' : ''}`}
      />
      {!isLoading && definition && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer">Show Mermaid Definition</summary>
          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded border overflow-auto">
            {definition}
          </pre>
        </details>
      )}
    </div>
  );
};

export default WorkflowGraph;
