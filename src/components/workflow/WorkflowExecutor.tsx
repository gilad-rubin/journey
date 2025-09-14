import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiService } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Workflow,
  WorkflowNode
} from "@/types/workflow";
import {
  AlertCircle,
  Clock,
  Type as InputIcon,
  MessageSquare,
  Pause,
  Play,
  Send,
  Square
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface WorkflowExecutorProps {
  workflow: Workflow;
  workflowPath: string;
  onClose: () => void;
}

interface ExecutionLogEntry {
  timestamp: Date;
  type: "info" | "warning" | "error" | "user_input" | "content";
  message: string;
  nodeId?: string;
  blockIndex?: number;
}

interface SessionState {
  current_node_id?: string;
  current_block_index?: number;
  variables?: Record<string, any>;
}

export const WorkflowExecutor: React.FC<WorkflowExecutorProps> = ({
  workflow,
  workflowPath,
  onClose,
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Execution state managed by backend
  const [sessionState, setSessionState] = useState<SessionState>({
    current_node_id: null,
    current_block_index: 0,
    variables: {}
  });
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [awaitingVariable, setAwaitingVariable] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLogEntry = (
    type: ExecutionLogEntry["type"],
    message: string,
    nodeId?: string,
    blockIndex?: number,
  ) => {
    setExecutionLog((prev) => [
      ...prev,
      { timestamp: new Date(), type, message, nodeId, blockIndex },
    ]);
  };

  const scrollToBottom = useCallback(() => {
    // Defer to ensure DOM/layout updates are flushed
    const doScroll = () => {
      if (!scrollAreaRef.current) return;
      const viewport = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      ) as HTMLElement | null;
      const el = viewport ?? scrollAreaRef.current;
      el.scrollTop = el.scrollHeight;
    };
    // Try a couple of frames for reliability across transitions
    requestAnimationFrame(() => {
      doScroll();
      setTimeout(doScroll, 50);
      setTimeout(doScroll, 150);
    });
  }, []);

  // Auto-scroll to bottom when new log entries are added
  useEffect(() => {
    scrollToBottom();
  }, [executionLog, scrollToBottom]);

  // Also scroll when waiting for input changes
  useEffect(() => {
    if (waitingForInput) {
      // Focus the input automatically when expecting user input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // Always scroll to bottom when the input area appears/moves
    scrollToBottom();
  }, [waitingForInput, scrollToBottom]);

  // Trigger execution when isRunning changes to true
  useEffect(() => {
    if (isRunning && !waitingForInput) {
      console.log('[WorkflowExecutor] isRunning changed to true, starting execution...');
      executeStep();
    }
  }, [isRunning, waitingForInput]);

  const executeStep = async (nextState?: SessionState) => {
    // Prefer the most recent state returned from the backend (nextState) to avoid stale closures
    const effectiveState = nextState ?? sessionState;
    console.log('[WorkflowExecutor] executeStep called with isRunning:', isRunning, 'waitingForInput:', waitingForInput);
    if (!isRunning || waitingForInput) return;

    try {
      console.log('[WorkflowExecutor] About to call backend with workflowPath:', workflowPath, 'sessionState:', effectiveState);

      const response = await apiService.executeWorkflowStep(workflowPath, effectiveState);

      // Update session state from backend
      setSessionState(response.session_state);

      // Process actions returned by backend
      let hasUserInput = false;
      let workflowEnded = false;

      for (const action of response.actions) {
        switch (action.type) {
          case "PRESENT_CONTENT":
            if (action.payload) {
              addLogEntry("content", action.payload, response.session_state.current_node_id, response.session_state.current_block_index);
            }
            break;

          case "AWAIT_USER_INPUT":
            setWaitingForInput(true);
            setAwaitingVariable(action.target || null);
            hasUserInput = true;
            addLogEntry("info", `Waiting for user input${action.target ? ` for variable: ${action.target}` : ""}`,
              response.session_state.current_node_id, response.session_state.current_block_index);
            break;

          case "SET_VARIABLE":
            if (action.target && action.source) {
              addLogEntry("info", `Set variable ${action.target} = ${action.source}`,
                response.session_state.current_node_id, response.session_state.current_block_index);
            }
            break;

          case "UPDATE_VARIABLE":
            if (action.target) {
              addLogEntry("info", `Updated variable ${action.target}`,
                response.session_state.current_node_id, response.session_state.current_block_index);
            }
            break;

          case "GOTO_NODE":
            if (action.target) {
              addLogEntry("info", `Moving to node: ${action.target}`,
                response.session_state.current_node_id, response.session_state.current_block_index);
            }
            break;

          case "END_WORKFLOW":
            setIsComplete(true);
            setIsRunning(false);
            setWaitingForInput(false);
            workflowEnded = true;
            addLogEntry("info", "Workflow completed successfully!",
              response.session_state.current_node_id, response.session_state.current_block_index);
            break;

          default:
            addLogEntry("info", `Executed action: ${action.type}`,
              response.session_state.current_node_id, response.session_state.current_block_index);
        }
      }

      // Auto-continue using the freshest session state returned from backend.
      // This prevents loops caused by stale state in closures.
      if (!hasUserInput && !workflowEnded && isRunning) {
        setTimeout(() => executeStep(response.session_state), 50);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      addLogEntry("error", `Execution error: ${errorMessage}`);
      setIsRunning(false);
      setWaitingForInput(false);
    }
  };

  const handleUserInput = async () => {
    if (!waitingForInput) return;

    // Store user input in variables only if there's a target variable
    let updatedSessionState = sessionState;
    if (awaitingVariable) {
      updatedSessionState = {
        ...sessionState,
        variables: {
          ...sessionState.variables,
          [awaitingVariable]: userInput
        }
      };
      setSessionState(updatedSessionState);
    }

    addLogEntry("user_input", `User: ${userInput}`);

    // Clear input state
    setUserInput("");
    setWaitingForInput(false);
    setAwaitingVariable(null);

    // Execution will be triggered by useEffect when waitingForInput changes to false
  };

  const startExecution = () => {
    console.log('[WorkflowExecutor] Starting execution with workflowPath:', workflowPath);
    setIsRunning(true);
    setIsComplete(false);
    setError(null);
    setExecutionLog([]);
    setSessionState({
      current_node_id: null,
      current_block_index: 0,
      variables: {}
    });

    // Keep initial log minimal to avoid noisy backend messages in UI
    addLogEntry("info", "Starting workflow execution...");
    // Execution will be triggered by useEffect when isRunning changes to true
  };

  const pauseExecution = () => {
    setIsRunning(false);
    addLogEntry("info", "Execution paused");
  };

  const stopExecution = () => {
    setIsRunning(false);
    setWaitingForInput(false);
    setAwaitingVariable(null);
    setUserInput("");
    addLogEntry("info", "Execution stopped");
  };

  const resetExecution = () => {
    setSessionState({
      current_node_id: null,
      current_block_index: 0,
      variables: {}
    });
    setExecutionLog([]);
    setIsRunning(false);
    setWaitingForInput(false);
    setAwaitingVariable(null);
    setUserInput("");
    setIsComplete(false);
    setError(null);
  };

  const getCurrentNode = (): WorkflowNode | null => {
    if (!sessionState.current_node_id) return null;
    return workflow.nodes.find((node) => node.id === sessionState.current_node_id) || null;
  };

  const formatLogEntryIcon = (type: ExecutionLogEntry["type"]) => {
    switch (type) {
      case "info":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "user_input":
        return <InputIcon className="h-4 w-4 text-green-500" />;
      case "content":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Workflow Executor</h2>
          <p className="text-sm text-muted-foreground">
            {workflow.name} • Backend Orchestrator Mode
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Control Panel */}
      <div className="flex items-center gap-2 p-4 border-b bg-muted/50">
        <Button
          onClick={startExecution}
          disabled={isRunning}
          variant={isRunning ? "secondary" : "default"}
          size="sm"
        >
          <Play className="h-4 w-4 mr-2" />
          Start
        </Button>
        <Button
          onClick={pauseExecution}
          disabled={!isRunning || waitingForInput}
          variant="outline"
          size="sm"
        >
          <Pause className="h-4 w-4 mr-2" />
          Pause
        </Button>
        <Button
          onClick={stopExecution}
          disabled={!isRunning && !waitingForInput}
          variant="outline"
          size="sm"
        >
          <Square className="h-4 w-4 mr-2" />
          Stop
        </Button>
        <Button
          onClick={resetExecution}
          variant="outline"
          size="sm"
        >
          Reset
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? "default" : isComplete ? "secondary" : "outline"}>
            {isRunning ? "Running" : isComplete ? "Complete" : "Ready"}
          </Badge>
          {waitingForInput && (
            <Badge variant="outline" className="text-orange-600">
              Waiting for Input
            </Badge>
          )}
          {error && (
            <Badge variant="destructive">
              Error
            </Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* Execution Log */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-base">Execution Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea ref={scrollAreaRef} className="h-[68vh]">
              <div className="p-4 space-y-2">
                {executionLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No execution logs yet. Click "Start" to begin workflow execution.
                  </p>
                ) : (
                  executionLog.map((entry, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded text-sm",
                        entry.type === "content" && "bg-purple-50 border-l-4 border-purple-200",
                        entry.type === "user_input" && "bg-green-50 border-l-4 border-green-200",
                        entry.type === "error" && "bg-red-50 border-l-4 border-red-200",
                        entry.type === "warning" && "bg-yellow-50 border-l-4 border-yellow-200",
                        entry.type === "info" && "bg-blue-50 border-l-4 border-blue-200"
                      )}
                    >
                      {formatLogEntryIcon(entry.type)}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{entry.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {entry.timestamp.toLocaleTimeString()}
                          {entry.nodeId && ` • Node: ${entry.nodeId}`}
                          {entry.blockIndex !== undefined && ` • Block: ${entry.blockIndex}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session State & Input */}
        <div className="w-80 space-y-4">
          {/* Current State */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session State</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Current Node</p>
                <p className="text-sm text-muted-foreground">
                  {sessionState.current_node_id || "None"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Block Index</p>
                <p className="text-sm text-muted-foreground">
                  {sessionState.current_block_index || 0}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Variables ({Object.keys(sessionState.variables || {}).length})</p>
                {Object.keys(sessionState.variables || {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No variables set</p>
                ) : (
                  <ScrollArea className="h-32 mt-2">
                    <div className="space-y-1">
                      {Object.entries(sessionState.variables || {}).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-mono font-medium">{key}:</span>
                          <span className="ml-2 text-muted-foreground">
                            {typeof value === 'string' && value.length > 50
                              ? `${value.substring(0, 50)}...`
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Input */}
          {waitingForInput && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Input Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {awaitingVariable && (
                  <p className="text-sm text-muted-foreground">
                    Variable: <span className="font-mono">{awaitingVariable}</span>
                  </p>
                )}
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleUserInput();
                      }
                    }}
                    placeholder="Enter your response..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUserInput}
                    disabled={awaitingVariable !== null && !userInput.trim()}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
