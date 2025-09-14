"""
Workflow orchestrator for managing declarative YAML-based workflows.
"""
from typing import Any, Dict, List, Optional

import yaml
from loguru import logger

from .utils import interpolate_variables


class Orchestrator:
    """
    Manages the workflow's state and navigation logic.
    It reads a declarative YAML file and determines the sequence of actions
    for the client to execute.
    """
    def __init__(self, workflow_definition_path: str, action_registry=None, tool_registry=None):
        """
        Initializes the orchestrator by loading the workflow definition.
        """
        with open(workflow_definition_path, 'r', encoding='utf-8') as f:
            self.workflow = yaml.safe_load(f)
        self.nodes = {node['id']: node for node in self.workflow['nodes']}
        # Create an ordered list of node IDs for sequential navigation
        self.node_order = [node['id'] for node in self.workflow['nodes']]
        
        # Store registries for action execution and tool calls
        self.action_registry = action_registry
        self.tool_registry = tool_registry
        
        logger.debug(f"Loaded workflow with nodes: {list(self.nodes.keys())}")
        logger.debug(f"Node order: {self.node_order}")
        if action_registry:
            logger.debug(f"Action registry loaded with {len(action_registry.list_actions())} actions")
        if tool_registry:
            logger.debug(f"Tool registry loaded with {len(tool_registry.list_tools())} tools")

    def get_variable(self, session_state: Dict[str, Any], var_name: str, default: Any = None) -> Any:
        """Get a variable value from the session state."""
        variables = session_state.get('variables', {})
        return variables.get(var_name, default)

    def set_variable(self, session_state: Dict[str, Any], var_name: str, value: Any) -> None:
        """Set a variable value in the session state."""
        if 'variables' not in session_state:
            session_state['variables'] = {}
        
        logger.debug(f"Setting variable '{var_name}' to '{value}'")
        session_state['variables'][var_name] = value

    def set_variable_from_source(self, session_state: Dict[str, Any], var_name: str, source: str) -> None:
        """
        Set a variable value from a source, which can be either a direct value or a tool call.
        """
        from .tool_registry import execute_tool_call
        
        logger.debug(f"SET_VARIABLE: {var_name} = {source}")
        
        # Try to execute as tool call first
        if self.tool_registry:
            result = execute_tool_call(source, session_state.get('variables', {}), self.tool_registry)
            if result is not None:
                self.set_variable(session_state, var_name, result)
                logger.debug(f"Variable '{var_name}' set to function result: {result}")
                return
        
        # Fallback to direct assignment
        self.set_variable(session_state, var_name, source)
        logger.debug(f"Variable '{var_name}' set to direct value: {source}")

    def update_variable(self, session_state: Dict[str, Any], target_var: str, source_var: str, operation: str) -> None:
        """Update a variable using the specified operation."""
        logger.debug(f"UPDATE_VARIABLE: {operation} '{source_var}' to '{target_var}'")
        
        if 'variables' not in session_state:
            session_state['variables'] = {}
        
        if operation == 'append':
            if target_var not in session_state['variables']:
                session_state['variables'][target_var] = []
            session_state['variables'][target_var].append(source_var)
            logger.debug(f"Appended '{source_var}' to '{target_var}': {session_state['variables'][target_var]}")
        else:
            logger.debug(f"Unknown operation: {operation}")

    def analyze_and_set_variable(self, session_state: Dict[str, Any], input_val: str, output_var: str, criteria: Optional[str] = None) -> None:
        """Analyze input and set a boolean variable based on the analysis."""
        logger.debug(f"ANALYZE_RESPONSE: analyzing '{input_val}' with criteria '{criteria}'")

        # Use tool registry for analysis
        result = False
        if criteria and self.tool_registry and self.tool_registry.has_tool(criteria):
            result = self.tool_registry.call(criteria, input_val)
        
        self.set_variable(session_state, output_var, result)
        logger.debug(f"Analysis result: '{output_var}' = {result}")

    def _evaluate_condition(self, condition_str: str, variables: Dict[str, Any]) -> bool:
        """
        Evaluates a simple condition string from the YAML file.
        Example: "{Is New Outcome Provided} == true"
        """
        logger.debug(f"Evaluating condition: '{condition_str}' with variables: {variables}")
        
        # Interpolate variables first
        interpolated_condition = interpolate_variables(condition_str, variables)
        logger.debug(f"After interpolation: '{interpolated_condition}'")
        
        # Replace JS-style booleans with Python booleans for eval
        interpolated_condition = (
            interpolated_condition.replace('== true', '== True')
            .replace('== false', '== False')
            .replace(' true', ' True')
            .replace(' false', ' False')
        )
        logger.debug(f"After boolean replacement: '{interpolated_condition}'")
        
        try:
            # Note: Using eval() is a security risk in production with untrusted input.
            # This is safe here as we control the YAML content.
            result = eval(interpolated_condition)
            logger.debug(f"Condition evaluation result: {result}")
            return result
        except Exception as e:
            logger.debug(f"Error evaluating condition: {e}")
            return False

    def _interpolate_with_types(self, value: Any, variables: Dict[str, Any]) -> Any:
        """
        Interpolate variables while preserving data types.
        If value is a string with variable placeholders, replace them.
        If the entire string is a single variable placeholder, return the original data type.
        """
        if not isinstance(value, str):
            return value
            
        # Check if the entire string is a single variable placeholder like "{I Chain}"
        import re
        single_var_match = re.match(r'^\{([\w\s]+)\}$', value.strip())
        if single_var_match:
            var_name = single_var_match.group(1)
            if var_name in variables:
                logger.debug(f"Returning original data type for variable '{var_name}': {type(variables[var_name])}")
                return variables[var_name]
        
        # For mixed strings or strings with multiple variables, use regular interpolation
        return interpolate_variables(value, variables)

    def _interpolate_args_deep(self, value: Any, variables: Dict[str, Any]) -> Any:
        """Recursively interpolate variables inside dicts/lists while preserving types for strings."""
        if isinstance(value, dict):
            return {k: self._interpolate_args_deep(v, variables) for k, v in value.items()}
        if isinstance(value, list):
            return [self._interpolate_args_deep(v, variables) for v in value]
        return self._interpolate_with_types(value, variables)

    def _evaluate_structured_condition(self, rule: Dict[str, Any], variables: Dict[str, Any]) -> bool:
        """
        Evaluates a structured condition from the rule.
        Example rule: {"variable": "Is Potential Core State", "operator": "is_true"}
        """
        variable = rule.get('variable', '')
        operator = rule.get('operator', 'equals')
        value = rule.get('value', '')
        
        logger.debug(f"Evaluating structured condition: variable='{variable}', operator='{operator}', value='{value}'")
        
        # Get the variable value
        variable_value = variables.get(variable, '')
        logger.debug(f"Variable '{variable}' has value: '{variable_value}'")
        
        # Evaluate based on operator
        try:
            if operator == 'equals' or operator == '==':
                result = str(variable_value).lower() == str(value).lower()
            elif operator == 'not_equals' or operator == '!=':
                result = str(variable_value).lower() != str(value).lower()
            elif operator == 'is_true':
                result = variable_value is True or str(variable_value).lower() == 'true'
            elif operator == 'is_false':
                result = variable_value is False or str(variable_value).lower() == 'false'
            elif operator == 'contains':
                result = str(value).lower() in str(variable_value).lower()
            elif operator == 'starts_with':
                result = str(variable_value).lower().startswith(str(value).lower())
            elif operator == 'ends_with':
                result = str(variable_value).lower().endswith(str(value).lower())
            elif operator == 'greater_than':
                try:
                    result = float(variable_value) > float(value)
                except (ValueError, TypeError):
                    result = False
            elif operator == 'less_than':
                try:
                    result = float(variable_value) < float(value)
                except (ValueError, TypeError):
                    result = False
            elif operator == 'greater_than_or_equal':
                try:
                    result = float(variable_value) >= float(value)
                except (ValueError, TypeError):
                    result = False
            elif operator == 'less_than_or_equal':
                try:
                    result = float(variable_value) <= float(value)
                except (ValueError, TypeError):
                    result = False
            else:
                logger.debug(f"Unknown operator: {operator}")
                result = False
            
            logger.debug(f"Structured condition evaluation result: {result}")
            return result
        except Exception as e:
            logger.debug(f"Error evaluating structured condition: {e}")
            return False

    def get_next_step(self, session_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        The main public method, simulating the `/getNextActions` API endpoint.
        """
        current_node_id = session_state.get('current_node_id')
        current_block_index = session_state.get('current_block_index', 0)
        variables = session_state.get('variables', {})
        logger.debug("\n=== GET_NEXT_STEP ===")
        logger.debug(f"Current node: {current_node_id}")
        logger.debug(f"Current block index: {current_block_index}")
        logger.debug(f"Variables: {variables}")

        if not current_node_id:
            logger.debug("No current node, starting with first node")
            session_state['current_node_id'] = self.node_order[0]
            session_state['current_block_index'] = 0
            return self.get_next_step(session_state)

        node = self.nodes.get(current_node_id)
        if not node:
            logger.debug(f"Node '{current_node_id}' not found!")
            return [{'type': 'END_WORKFLOW'}]
            
        logger.debug(f"Node '{current_node_id}' has {len(node['blocks'])} blocks")
        
        if current_block_index >= len(node['blocks']):
            logger.debug(f"Block index {current_block_index} >= {len(node['blocks'])}, moving to next node")
            try:
                current_node_index = self.node_order.index(current_node_id)
                if current_node_index + 1 < len(self.node_order):
                    next_node_id = self.node_order[current_node_index + 1]
                    logger.debug(f"Moving to next node: {next_node_id}")
                    session_state['current_node_id'] = next_node_id
                    session_state['current_block_index'] = 0
                    return self.get_next_step(session_state)
                else:
                    logger.debug("No more nodes, ending workflow")
                    return [{'type': 'END_WORKFLOW'}]
            except ValueError:
                logger.debug(f"Current node '{current_node_id}' not found in node order")
                return [{'type': 'END_WORKFLOW'}]

        block = node['blocks'][current_block_index]
        logger.debug(f"Processing block {current_block_index}: {block}")
        actions_to_perform = []

        if block['type'] == 'CONDITION':
            logger.debug("Processing CONDITION block")
            for i, rule in enumerate(block['rules']):
                logger.debug(f"Evaluating rule {i}: {rule}")
                condition_result = self._evaluate_structured_condition(rule, variables)
                if condition_result:
                    logger.debug(f"Rule {i} condition is True, executing 'then' actions")
                    actions_to_perform.extend(rule.get('then', []))
                    break
            else:
                final_rule = block['rules'][-1]
                if 'else' in final_rule:
                    logger.debug("No conditions matched, executing 'else' actions")
                    actions_to_perform.extend(final_rule.get('else', []))
                else:
                    logger.debug("No conditions matched and no 'else' clause")
            
            # --- FIX: If no actions, skip to next block ---
            if not actions_to_perform:
                logger.debug("No actions to perform, moving to next block")
                session_state['current_block_index'] += 1
                return self.get_next_step(session_state)
        else:
            logger.debug(f"Processing regular block of type: {block['type']}")
            actions_to_perform.append(block)
        
        logger.debug(f"Actions to perform: {actions_to_perform}")
        
        # Separate GOTO actions from regular actions
        goto_action = next((a for a in actions_to_perform if a.get('type') == 'GOTO_NODE'), None)
        non_goto_actions = [a for a in actions_to_perform if a.get('type') != 'GOTO_NODE']
        
        # Interpolate variables in non-GOTO actions (but skip 'action' field for SET_VARIABLE)
        final_actions = []
        for action in non_goto_actions:
            interpolated_action = action.copy()
            for key, value in interpolated_action.items():
                # Don't interpolate the 'action' field for SET_VARIABLE actions - it should remain as function name
                if action.get('type') == 'SET_VARIABLE' and key == 'action':
                    continue
                # Don't interpolate 'actionArgs' here - will be handled later with type preservation
                if action.get('type') == 'SET_VARIABLE' and key == 'actionArgs':
                    continue
                interpolated_action[key] = interpolate_variables(value, variables)
            final_actions.append(interpolated_action)
        
        # Update session state for the NEXT call
        if goto_action:
            logger.debug(f"Found GOTO_NODE action to: {goto_action['target']}")
            session_state['current_node_id'] = goto_action['target']
            session_state['current_block_index'] = 0
            
            # Return non-GOTO actions first; the client will call get_next_step again after processing them
            logger.debug(f"Returning {len(final_actions)} non-GOTO actions before navigation")
        else:
            logger.debug("No GOTO_NODE action, incrementing block index")
            session_state['current_block_index'] += 1

        logger.debug(f"Final actions to return: {final_actions}")
        logger.debug(f"Updated session state - node: {session_state['current_node_id']}, block: {session_state['current_block_index']}")
        
        # Process actions internally and return only client-facing actions
        client_actions = self._process_actions_internally(final_actions, session_state)
        logger.debug(f"Client actions after internal processing: {client_actions}")
        return client_actions

    def process_user_response(self, session_state: Dict[str, Any], action_id: str, response: Any) -> None:
        """
        Process a user response and update the session state accordingly.
        This is called by the client after user interaction.
        """
        pending_action = session_state.get('pending_action')
        if pending_action and pending_action.get('id') == action_id:
            target_var = pending_action.get('target')
            if target_var:
                self.set_variable(session_state, target_var, response)
                logger.debug(f"User response processed: '{target_var}' = '{response}'")
            else:
                logger.debug(f"User response received but no target variable specified: '{response}'")
            # Clear the pending action and advance workflow
            session_state.pop('pending_action', None)
            session_state['current_block_index'] += 1
        else:
            logger.debug(f"No matching pending action for id: {action_id}")

    def _process_actions_internally(self, actions: List[Dict[str, Any]], session_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process actions internally, handling variable management and returning only client-facing actions.
        """
        client_actions = []
        
        for action in actions:
            action_type = action.get('type')
            logger.debug(f"Processing action internally: {action}")
            
            if action_type == 'SET_VARIABLE':
                target_var = action['target']
                
                # Handle both old format (source) and new format (action + actionArgs)
                if 'source' in action:
                    source = action['source']
                    self.set_variable_from_source(session_state, target_var, source)
                elif 'action' in action:
                    # New format: execute tool/function call
                    action_name = action['action']
                    action_args = action.get('actionArgs', {})
                    
                    # Interpolate variables in action arguments (deep) while preserving data types for strings
                    interpolated_args = self._interpolate_args_deep(action_args, session_state.get('variables', {}))
                    
                    if self.tool_registry and self.tool_registry.has_tool(action_name):
                        try:
                            result = self.tool_registry.call(action_name, **interpolated_args)
                            self.set_variable(session_state, target_var, result)
                            logger.debug(f"Variable '{target_var}' set to function result: {result}")
                        except Exception as e:
                            logger.debug(f"Error calling tool '{action_name}': {e}")
                            self.set_variable(session_state, target_var, None)
                    else:
                        logger.debug(f"Tool '{action_name}' not found in registry or no tool registry available")
                else:
                    logger.debug(f"SET_VARIABLE action missing both 'source' and 'action' fields: {action}")
                
            elif action_type == 'UPDATE_VARIABLE':
                target_var = action['target']
                source_var = action['source']
                operation = action['operation']
                self.update_variable(session_state, target_var, source_var, operation)
                
            elif action_type == 'ANALYZE_RESPONSE':
                input_val = action['input']
                output_var = action['output_bool']
                criteria = action.get('criteria')
                self.analyze_and_set_variable(session_state, input_val, output_var, criteria)
                
            elif action_type in ['PRESENT_CONTENT', 'AWAIT_USER_INPUT']:
                # These actions need client interaction, so we pass them through
                if action_type == 'AWAIT_USER_INPUT':
                    # Add a unique ID for tracking the pending action
                    import uuid
                    action_id = str(uuid.uuid4())
                    action['id'] = action_id
                    # Store the pending action for later processing
                    session_state['pending_action'] = action.copy()
                client_actions.append(action)
                
            elif action_type == 'END_WORKFLOW':
                client_actions.append(action)
                
            else:
                logger.debug(f"Unknown action type: {action_type}")
                # Pass unknown actions to client as fallback
                client_actions.append(action)
        
        return client_actions
