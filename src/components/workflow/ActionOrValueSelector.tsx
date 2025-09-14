import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService, ToolDefinition } from "@/lib/api";
import { ChevronDown, Type, Variable, Zap } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { VariableAutocomplete } from "./VariableAutocomplete";

interface ActionOrValueSelectorProps {
  value: string;
  onChange: (value: string) => void;
  availableVariables: string[];
  placeholder?: string;
  className?: string;
  onToolArgChange?: (argName: string, argValue: any) => void;
  toolArgs?: Record<string, any>;
}

type ValueType = "static" | "variable" | "tool";

// Component for individual argument inputs that support both static and dynamic values
const ArgumentInput: React.FC<{
  arg: any;
  value: any;
  availableVariables: string[];
  onChange: (value: any) => void;
}> = ({ arg, value, availableVariables, onChange }) => {
  const isVariable = value?.toString().startsWith("{") && value?.toString().endsWith("}");

  const handleVariableChange = (variableName: string) => {
    onChange(variableName ? `{${variableName}}` : "");
  };

  const handleStaticChange = (staticValue: string) => {
    onChange(staticValue);
  };

  // For boolean types, we still want the original dropdown
  if (arg.type === "boolean") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value === "true")}
        className="h-9 text-sm border border-slate-300 rounded px-3 w-full"
      >
        <option value="">Select...</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    );
  }

  // For all other types, provide variable/static choice
  return (
    <div className="grid grid-cols-[3fr,auto,2fr] gap-2 items-center w-full">
      <select
        value={isVariable ? value.slice(1, -1) : ""}
        onChange={(e) => handleVariableChange(e.target.value)}
        className="h-9 text-sm border border-slate-300 rounded px-3 w-full min-w-[220px]"
        title={isVariable ? value.slice(1, -1) : ""}
      >
        <option value="">Select variable...</option>
        {availableVariables.map((variable) => (
          <option key={variable} value={variable} title={variable}>
            {variable}
          </option>
        ))}
      </select>
      <span className="text-sm text-slate-600">or</span>
      <Input
        value={!isVariable ? value || "" : ""}
        onChange={(e) => handleStaticChange(e.target.value)}
        placeholder={`Static ${arg.type}...`}
        className="h-9 text-sm w-full border border-slate-300 rounded px-3"
        type={arg.type === "number" ? "number" : "text"}
      />
    </div>
  );
};

export const ActionOrValueSelector: React.FC<ActionOrValueSelectorProps> = ({
  value,
  onChange,
  availableVariables,
  placeholder = "Enter value...",
  className = "",
  onToolArgChange,
  toolArgs = {},
}) => {
  // Determine valueType from value prop using useMemo to avoid recalculation
  const valueType = useMemo<ValueType>(() => {
    if (value?.startsWith("{") && value?.endsWith("}")) {
      return "variable";
    } else if (value?.startsWith("tool:")) {
      return "tool";
    } else {
      return "static";
    }
  }, [value]);

  const [showDropdown, setShowDropdown] = useState(false);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  // Load tools from backend only once
  useEffect(() => {
    let mounted = true;
    const loadTools = async () => {
      setLoading(true);
      try {
        const toolCatalog = await apiService.getToolCatalog();
        if (mounted) {
          setTools(toolCatalog.tools);
        }
      } catch (error) {
        console.error('[ActionOrValueSelector] Failed to load tools:', error);
        if (mounted) {
          setTools([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTools();

    return () => {
      mounted = false;
    };
  }, []);

  const handleTypeChange = (newType: ValueType) => {
    console.log('[ActionOrValueSelector] TYPE CHANGE:', newType);
    setShowDropdown(false);

    // Clear value when changing type
    if (newType === "variable" && availableVariables.length > 0) {
      onChange(`{${availableVariables[0]}}`);
    } else if (newType === "tool") {
      console.log('[ActionOrValueSelector] TOOL TYPE SELECTED - setting initial value to "tool:"');
      onChange("tool:");
    } else {
      onChange("");
    }
  };

  const handleValueChange = (newValue: string) => {
    if (valueType === "variable") {
      onChange(`{${newValue}}`);
    } else if (valueType === "tool") {
      const toolValue = `tool:${newValue}`;
      console.log('[ActionOrValueSelector] TOOL SELECTED:', newValue, '-> setting value to:', toolValue);
      onChange(toolValue);
    } else {
      onChange(newValue);
    }
  };

  const handleToolArgChange = (argName: string, argValue: any) => {
    if (onToolArgChange) {
      onToolArgChange(argName, argValue);
    }
  };

  const getCurrentValue = () => {
    if (valueType === "variable") {
      return value?.replace(/[{}]/g, "") || "";
    } else if (valueType === "tool") {
      return value?.replace("tool:", "") || "";
    }
    return value || "";
  };

  const getCurrentTool = () => {
    if (valueType === "tool") {
      const toolId = getCurrentValue();
      const tool = tools.find(tool => tool.id === toolId);
      if (toolId && !tool && tools.length > 0) {
        console.log('[ActionOrValueSelector] TOOL NOT FOUND - looking for:', toolId, 'in:', tools.map(t => t.id));
      }
      return tool;
    }
    return null;
  };

  const typeConfig = {
    static: { icon: Type, label: "Static Value", color: "bg-gray-500" },
    variable: { icon: Variable, label: "Variable", color: "bg-purple-500" },
    tool: { icon: Zap, label: "Tool", color: "bg-slate-600" },
  };

  const config = typeConfig[valueType];
  const Icon = config.icon;
  const currentTool = getCurrentTool();

  return (
    <div className={`space-y-2 w-full ${className}`}>
      <div className="flex gap-2 w-full">
        <div className="relative flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDropdown(!showDropdown)}
            className="h-9 gap-1"
          >
            <div className={`p-0.5 rounded text-white ${config.color}`}>
              <Icon className="w-3 h-3" />
            </div>
            <span className="text-xs">{config.label}</span>
            <ChevronDown className="w-3 h-3" />
          </Button>

          {showDropdown && (
            <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
              {Object.entries(typeConfig).map(([type, conf]) => {
                const TypeIcon = conf.icon;
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type as ValueType)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <div className={`p-0.5 rounded text-white ${conf.color}`}>
                      <TypeIcon className="w-3 h-3" />
                    </div>
                    {conf.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {valueType === "variable" ? (
            <select
              value={getCurrentValue()}
              onChange={(e) => handleValueChange(e.target.value)}
              className="h-9 text-sm border border-gray-300 rounded-md px-3 w-full min-w-[220px]"
              title={getCurrentValue()}
            >
              <option value="">Select variable...</option>
              {availableVariables.map((variable) => (
                <option key={variable} value={variable} title={variable}>
                  {variable}
                </option>
              ))}
            </select>
          ) : valueType === "tool" ? (
            <select
              value={getCurrentValue()}
              onChange={(e) => {
                console.log('[ActionOrValueSelector] TOOL SELECT CHANGE:', e.target.value);
                handleValueChange(e.target.value);
              }}
              className="h-9 text-sm border border-gray-300 rounded-md px-3 w-full"
              disabled={loading}
            >
              <option value="">{loading ? "Loading tools..." : "Select tool..."}</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </select>
          ) : (
            <VariableAutocomplete
              value={getCurrentValue()}
              onChange={(value) => handleValueChange(value)}
              availableVariables={availableVariables}
              placeholder={placeholder}
              className="h-9 text-sm w-full border border-gray-300 rounded-md px-3"
            />
          )}
        </div>

        {valueType !== "static" && (
          <Badge variant="outline" className="text-xs h-9 flex items-center flex-shrink-0">
            {valueType === "variable"
              ? `{${getCurrentValue()}}`
              : `tool:${getCurrentValue()}`}
            {currentTool && (
              <span className="ml-1 text-slate-600">
                → {currentTool.return_type}
              </span>
            )}
          </Badge>
        )}
      </div>

      {/* Tool Arguments Form */}
      {valueType === "tool" && currentTool && currentTool.arguments.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-slate-800 mb-2">
            Tool Arguments:
          </div>
          {currentTool.arguments.map((arg) => (
            <div key={arg.name} className="space-y-1">
              <Label className="text-xs text-slate-700">
                {arg.name}
                {arg.required && <span className="text-red-500">*</span>}
                <span className="ml-1 text-slate-500">({arg.type})</span>
              </Label>
              <ArgumentInput
                arg={arg}
                value={toolArgs[arg.name]}
                availableVariables={availableVariables}
                onChange={(value) => handleToolArgChange(arg.name, value)}
              />
              {arg.description && (
                <div className="text-xs text-slate-600">{arg.description}</div>
              )}
            </div>
          ))}

          {/* Tool Description */}
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="text-xs text-slate-700">
              <strong>Returns:</strong> {currentTool.return_type}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {currentTool.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};