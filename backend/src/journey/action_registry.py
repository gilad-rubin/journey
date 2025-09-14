"""
Action registry system for workflow control operations.
Actions are the basic building blocks of workflows like SET_VARIABLE, PRESENT_CONTENT, etc.
"""
import inspect
from typing import Any, Callable, Dict, List, Optional, get_type_hints

from loguru import logger
from pydantic import BaseModel, Field

from .utils import interpolate_variables


class ActionArgument(BaseModel):
    """Definition of an action argument with type information."""
    name: str
    type: str
    default: Optional[Any] = None
    required: bool = True
    description: Optional[str] = None


class ActionDefinition(BaseModel):
    """Definition of a registered action with complete metadata."""
    id: str
    name: str
    description: str
    arguments: List[ActionArgument]
    return_type: str
    category: str = "workflow"
    examples: List[str] = Field(default_factory=list)


class ActionRegistry:
    """Registry for workflow control actions like SET_VARIABLE, PRESENT_CONTENT, etc."""
    
    def __init__(self):
        self.actions: Dict[str, Callable] = {}
        self.definitions: Dict[str, ActionDefinition] = {}
        self._register_builtin_actions()
    
    def register(self, name: str, action: Callable, description: str = "", category: str = "workflow", examples: Optional[List[str]] = None):
        """Register an action with complete metadata extraction."""
        self.actions[name] = action
        
        # Extract function signature and type hints
        sig = inspect.signature(action)
        type_hints = get_type_hints(action)
        
        arguments = []
        for param_name, param in sig.parameters.items():
            param_type = type_hints.get(param_name, type(None))
            
            # Convert Python types to string representations
            type_str = self._get_type_string(param_type)
            
            # Check if parameter has default value
            has_default = param.default != inspect.Parameter.empty
            default_value = param.default if has_default else None
            
            arg_def = ActionArgument(
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
        
        # Create action definition
        action_def = ActionDefinition(
            id=name,
            name=name,
            description=description or action.__doc__ or f"Action {name}",
            arguments=arguments,
            return_type=return_type_str,
            category=category,
            examples=examples or []
        )
        
        self.definitions[name] = action_def
        logger.debug(f"Registered action: {name} with {len(arguments)} arguments")
    
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
    
    def execute(self, action_name: str, context: Dict[str, Any], **kwargs) -> Any:
        """Execute a registered action with context."""
        if action_name not in self.actions:
            logger.debug(f"Action '{action_name}' not found in registry")
            raise ValueError(f"Action '{action_name}' not found in registry")
        
        logger.debug(f"Executing action: {action_name} with context: {context} and kwargs: {kwargs}")
        result = self.actions[action_name](context, **kwargs)
        logger.debug(f"Action {action_name} returned: {result}")
        return result
    
    def has_action(self, name: str) -> bool:
        """Check if an action is registered."""
        return name in self.actions
    
    def get_action_definition(self, name: str) -> Optional[ActionDefinition]:
        """Get the definition of a registered action."""
        return self.definitions.get(name)
    
    def list_actions(self) -> List[ActionDefinition]:
        """Get all registered action definitions."""
        return list(self.definitions.values())
    
    def get_actions_by_category(self, category: str) -> List[ActionDefinition]:
        """Get actions filtered by category."""
        return [action_def for action_def in self.definitions.values() if action_def.category == category]
    
    def _register_builtin_actions(self):
        """Register the built-in workflow control actions."""
        
        def present_content(context: Dict[str, Any], payload: str) -> str:
            """Present content to the user with variable interpolation."""
            interpolated_payload = interpolate_variables(payload, context.get('variables', {}))
            logger.debug(f"Presenting content: {interpolated_payload}")
            return interpolated_payload
        
        def await_user_input(context: Dict[str, Any], target: str = "") -> str:
            """Signal that user input is needed and should be stored in target variable."""
            logger.debug(f"Awaiting user input for variable: {target}")
            return f"AWAIT_INPUT:{target}"
        
        def set_variable(context: Dict[str, Any], target: str, value: str) -> Any:
            """Set a variable to a specific value with interpolation."""
            interpolated_value = interpolate_variables(value, context.get('variables', {}))
            logger.debug(f"Setting variable {target} to: {interpolated_value}")
            context.setdefault('variables', {})[target] = interpolated_value
            return interpolated_value
        
        def update_variable(context: Dict[str, Any], target: str, value: str, operation: str = "append") -> Any:
            """Update a variable with append or set operation."""
            interpolated_value = interpolate_variables(value, context.get('variables', {}))
            variables = context.setdefault('variables', {})
            
            if operation == "append":
                if target not in variables:
                    variables[target] = []
                if isinstance(variables[target], list):
                    variables[target].append(interpolated_value)
                else:
                    variables[target] = [variables[target], interpolated_value]
            else:  # set operation
                variables[target] = interpolated_value
            
            logger.debug(f"Updated variable {target} with operation {operation}: {variables[target]}")
            return variables[target]
        
        def goto_node(context: Dict[str, Any], target: str) -> str:
            """Signal navigation to another node."""
            logger.debug(f"Navigating to node: {target}")
            return f"GOTO_NODE:{target}"
        
        def end_workflow(context: Dict[str, Any]) -> str:
            """Signal end of workflow."""
            logger.debug("Ending workflow")
            return "END_WORKFLOW"
        
        # Register built-in actions
        self.register('present_content', present_content, 
                     "Present content to the user with variable interpolation", 
                     "ui", ["present_content('Hello {User Name}!')"])
        
        self.register('await_user_input', await_user_input,
                     "Wait for user input and store in specified variable",
                     "ui", ["await_user_input('User Response')"])
        
        self.register('set_variable', set_variable,
                     "Set a variable to a specific value",
                     "blackboard", ["set_variable('Name', 'John')"])
        
        self.register('update_variable', update_variable,
                     "Update a variable with append or set operation",
                     "blackboard", ["update_variable('Items', 'new_item', 'append')"])
        
        self.register('goto_node', goto_node,
                     "Navigate to another workflow node",
                     "navigation", ["goto_node('next_step')"])
        
        self.register('end_workflow', end_workflow,
                     "End the workflow execution",
                     "navigation", ["end_workflow()"])
