"""
Utility functions for function call parsing and variable interpolation.
"""
import ast
import re
from typing import Any, Dict, List, Optional, Tuple

from loguru import logger


def parse_function_call(call_string: str) -> Tuple[Optional[str], List]:
    """Parse a function call string and return function name and arguments."""
    logger.debug(f"Parsing function call: {call_string}")
    # Match pattern: function_name(arg1, arg2, ...)
    match = re.match(r'(\w+)\((.*)\)$', call_string.strip())
    if not match:
        logger.debug("No function call pattern matched")
        return None, []
    
    func_name = match.group(1)
    args_str = match.group(2).strip()
    
    if not args_str:
        logger.debug(f"Function {func_name} with no arguments")
        return func_name, []
    
    # Try to parse arguments
    try:
        # Wrap in list to make it valid Python syntax
        args = ast.literal_eval(f'[{args_str}]')
        logger.debug(f"Parsed function {func_name} with args: {args}")
        return func_name, args
    except Exception:
        # If literal_eval fails, treat as single string argument
        logger.debug(f"Failed to parse args, treating as single string: {args_str}")
        return func_name, [args_str]


def interpolate_variables(text: str, variables: Dict[str, Any]) -> str:
    """Replace {Variable Name} placeholders with actual values."""
    if not isinstance(text, str):
        return text
    
    logger.debug(f"Interpolating: '{text}' with variables: {variables}")
    
    matches = re.findall(r'\{([\w\s]+)\}', text)
    for var_name in matches:
        if var_name in variables and variables[var_name] is not None:
            replacement = str(variables[var_name])
            text = text.replace(f'{{{var_name}}}', replacement)
            logger.debug(f"Replaced {{{var_name}}} with '{replacement}'")
    
    logger.debug(f"Final interpolated text: '{text}'")
    return text
