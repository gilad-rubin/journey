"""
Tool registry system for domain-specific functions.
Tools are case-specific functions like "is_a_no", "is_potential_core_state", etc.
"""
import inspect
from typing import Any, Callable, Dict, List, Optional, get_type_hints

from loguru import logger
from pydantic import BaseModel, Field

from .utils import interpolate_variables, parse_function_call


class ToolArgument(BaseModel):
    """Definition of a tool argument with type information."""
    name: str
    type: str
    default: Optional[Any] = None
    required: bool = True
    description: Optional[str] = None


class ToolDefinition(BaseModel):
    """Definition of a registered tool with complete metadata."""
    id: str
    name: str
    description: str
    arguments: List[ToolArgument]
    return_type: str
    category: str = "general"
    examples: List[str] = Field(default_factory=list)


class ToolRegistry:
    """Registry for domain-specific tools that process data and make decisions."""
    
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
        self.definitions: Dict[str, ToolDefinition] = {}
    
    def register(self, name: str, func: Callable, description: str = "", category: str = "general", examples: Optional[List[str]] = None):
        """Register a tool with complete metadata extraction."""
        self.tools[name] = func
        
        # Extract function signature and type hints
        sig = inspect.signature(func)
        type_hints = get_type_hints(func)
        
        arguments = []
        for param_name, param in sig.parameters.items():
            param_type = type_hints.get(param_name, type(None))
            
            # Convert Python types to string representations
            type_str = self._get_type_string(param_type)
            
            # Check if parameter has default value
            has_default = param.default != inspect.Parameter.empty
            default_value = param.default if has_default else None
            
            arg_def = ToolArgument(
                name=param_name,
                type=type_str,
                default=default_value,
                required=not has_default,
                description=f"Parameter {param_name} of type {type_str}"
            )
            arguments.append(arg_def)
        
        # Get return type
        return_type = type_hints.get('return', type(None))
        return_type_str = self._get_type_string(return_type)
        
        # Create tool definition
        tool_def = ToolDefinition(
            id=name,
            name=name,
            description=description or func.__doc__ or f"Tool {name}",
            arguments=arguments,
            return_type=return_type_str,
            category=category,
            examples=examples or []
        )
        
        self.definitions[name] = tool_def
        logger.debug(f"Registered tool: {name} with {len(arguments)} arguments")
    
    def _get_type_string(self, type_hint: Any) -> str:
        """Convert Python type hints to string representations."""
        if type_hint is type(None) or type_hint is None:
            return "any"
        elif type_hint == str:
            return "string"
        elif type_hint == int:
            return "number"
        elif type_hint == float:
            return "number"
        elif type_hint == bool:
            return "boolean"
        elif type_hint == list or (hasattr(type_hint, '__origin__') and type_hint.__origin__ == list):
            return "array"
        elif type_hint == dict or (hasattr(type_hint, '__origin__') and type_hint.__origin__ == dict):
            return "object"
        else:
            return str(type_hint).replace('<class \'', '').replace('\'>', '').replace('typing.', '')
    
    def call(self, tool_name: str, *args, **kwargs) -> Any:
        """Call a registered tool.
        Note: parameter renamed to avoid clashing with a tool argument named 'name'.
        """
        if tool_name not in self.tools:
            logger.debug(f"Tool '{tool_name}' not found in registry")
            raise ValueError(f"Tool '{tool_name}' not found in registry")
        logger.debug(f"Calling tool: {tool_name} with args: {args}")
        result = self.tools[tool_name](*args, **kwargs)
        logger.debug(f"Tool {tool_name} returned: {result}")
        return result
    
    def has_tool(self, name: str) -> bool:
        """Check if a tool is registered."""
        return name in self.tools
    
    def get_tool_definition(self, name: str) -> Optional[ToolDefinition]:
        """Get the definition of a registered tool."""
        return self.definitions.get(name)
    
    def list_tools(self) -> List[ToolDefinition]:
        """Get all registered tool definitions."""
        return list(self.definitions.values())
    
    def get_tools_by_category(self, category: str) -> List[ToolDefinition]:
        """Get tools filtered by category."""
        return [tool_def for tool_def in self.definitions.values() if tool_def.category == category]


def execute_tool_call(call_string: str, variables: Optional[Dict[str, Any]] = None, registry: Optional['ToolRegistry'] = None):
    """Execute a tool call string using the tool registry."""
    if variables is None:
        variables = {}
    if registry is None:
        raise ValueError("Registry must be provided")
    
    logger.debug(f"Executing tool call: {call_string}")
    logger.debug(f"Available variables: {variables}")
    
    # First interpolate any variables in the call string
    interpolated_call = interpolate_variables(call_string, variables)
    logger.debug(f"After interpolation: {interpolated_call}")
    
    # Parse the tool call
    tool_name, args = parse_function_call(interpolated_call)
    if not tool_name:
        logger.debug("No tool name found")
        return None
    
    # Execute the tool if it exists
    if registry.has_tool(tool_name):
        return registry.call(tool_name, *args)
    
    logger.debug(f"Tool {tool_name} not found in registry")
    return None


# Legacy compatibility - keep old names for backward compatibility
FunctionRegistry = ToolRegistry
FunctionDefinition = ToolDefinition
FunctionArgument = ToolArgument
execute_function_call = execute_tool_call
