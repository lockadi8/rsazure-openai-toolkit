"""
rsazure_openai_toolkit.env

Environment configuration utilities for CLI, scripting, and internal core components.

Exports:
- load_env(): Loads variables from a .env file
- get_cli_config(): Loads and validates Azure OpenAI credentials and settings
- get_context_config(): Loads session context configuration
- get_logging_config(): Loads local logging configuration
"""

from .config import (
    load_env,
    get_cli_config,
    get_context_config,
    get_logging_config
)

__all__ = [
    "load_env",
    "get_cli_config",
    "get_context_config",
    "get_logging_config"
]
