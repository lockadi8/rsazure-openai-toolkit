"""
rsazure_openai_toolkit.env_config

Environment configuration utilities for CLI and scripting use cases.

Exports:
- load_env(): Loads variables from a .env file.
- get_cli_config(): Loads and validates Azure OpenAI configuration.
"""

from .config import load_env, get_cli_config


__all__ = [
    "load_env",
    "get_cli_config",
]
