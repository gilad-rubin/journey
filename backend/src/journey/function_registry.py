"""
Generic function registry system for workflow functions with Pydantic support.
"""
import inspect
from typing import Any, Callable, Dict, List, Optional, get_type_hints

from loguru import logger
from pydantic import BaseModel, Field

from .utils import interpolate_variables, parse_function_call


class FunctionArgument(BaseModel):
    """Definition of a function argument with type information."""
    name: str
    type: str
    default: Optional[Any] = None
    required: bool = True
    description: Optional[str] = None


class FunctionDefinition(BaseModel):
    """Definition of a registered function with complete metadata."""
    id: str
    name: str
    description: str
    arguments: List[FunctionArgument]
    return_type: str
    category: str = "general"
    examples: List[str] = Field(default_factory=list)


class FunctionRegistry:
    """Enhanced function registry with Pydantic support for workflow functions."""
    
    def __init__(self):
        self.functions: Dict[str, Callable] = {}
        self.definitions: Dict[str, FunctionDefinition] = {}
    
    def register(self, name: str, func: Callable, description: str = "", category: str = "general", examples: Optional[List[str]] = None):
        """Register a function with complete metadata extraction."""
        self.functions[name] = func
        
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
            
            arg_def = FunctionArgument(
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
        
        # Create function definition
        func_def = FunctionDefinition(
            id=name,
            name=name,
            description=description or func.__doc__ or f"Function {name}",
            arguments=arguments,
            return_type=return_type_str,
            category=category,
            examples=examples or []
        )
        
        self.definitions[name] = func_def
        logger.debug(f"Registered function: {name} with {len(arguments)} arguments")
    
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
    
    def call(self, name: str, *args, **kwargs) -> Any:
        """Call a registered function."""
        if name not in self.functions:
            logger.debug(f"Function '{name}' not found in registry")
            raise ValueError(f"Function '{name}' not found in registry")
        logger.debug(f"Calling function: {name} with args: {args}")
        result = self.functions[name](*args, **kwargs)
        logger.debug(f"Function {name} returned: {result}")
        return result
    
    def has_function(self, name: str) -> bool:
        """Check if a function is registered."""
        return name in self.functions
    
    def get_function_definition(self, name: str) -> Optional[FunctionDefinition]:
        """Get the definition of a registered function."""
        return self.definitions.get(name)
    
    def list_functions(self) -> List[FunctionDefinition]:
        """Get all registered function definitions."""
        return list(self.definitions.values())
    
    def get_functions_by_category(self, category: str) -> List[FunctionDefinition]:
        """Get functions filtered by category."""
        return [func_def for func_def in self.definitions.values() if func_def.category == category]


def execute_function_call(call_string: str, variables: Optional[Dict[str, Any]] = None, registry: Optional['FunctionRegistry'] = None):
    """Execute a function call string using the function registry."""
    if variables is None:
        variables = {}
    if registry is None:
        raise ValueError("Registry must be provided")
    
    logger.debug(f"Executing function call: {call_string}")
    logger.debug(f"Available variables: {variables}")
    
    # First interpolate any variables in the call string
    interpolated_call = interpolate_variables(call_string, variables)
    logger.debug(f"After interpolation: {interpolated_call}")
    
    # Parse the function call
    func_name, args = parse_function_call(interpolated_call)
    if not func_name:
        logger.debug("No function name found")
        return None
    
    # Execute the function if it exists
    if registry.has_function(func_name):
        return registry.call(func_name, *args)
    
    logger.debug(f"Function {func_name} not found in registry")
    return None
