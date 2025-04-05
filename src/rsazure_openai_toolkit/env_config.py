"""
rsazure_openai_toolkit.env_config

Environment configuration utilities for loading and validating Azure OpenAI settings.

This module provides:
- A function to load .env files (`load_env`)
- A function to retrieve and validate environment variables required by the CLI (`get_cli_config`)

These utilities ensure consistency across CLI usage, scripting, and automation workflows.

Exports:
- load_env(): Loads environment variables from a .env file
- get_cli_config(): Loads and validates essential Azure OpenAI environment settings

Example:
    >>> load_env()
    >>> config = get_cli_config()
    >>> print(config["deployment_name"])
"""


import os
import sys
from typing import Optional
from dotenv import load_dotenv
import click


def load_env(*, verbose: bool = False, override: bool = True) -> bool:
    """
    Load environment variables from a .env file.

    Args:
        verbose (bool): Whether to print debug info about loaded values.
        override (bool): Whether to override existing environment variables.

    Returns:
        bool: True if a .env file was found and successfully loaded.
    """
    return load_dotenv(override=override, verbose=verbose)


def get_cli_config(*, overrides: Optional[dict] = None) -> dict:
    """
    Load required Azure OpenAI environment variables and validate their presence.

    Supports optional overrides to facilitate testing and dynamic configuration.

    Required environment variables:
        - AZURE_OPENAI_API_KEY
        - AZURE_OPENAI_ENDPOINT
        - AZURE_OPENAI_API_VERSION
        - AZURE_DEPLOYMENT_NAME

    Optional:
        - RSCHAT_SYSTEM_PROMPT (default: "You are a happy assistant.")

    Args:
        overrides (dict, optional): Custom values to override environment lookup.

    Returns:
        dict: Loaded and validated configuration values.
    """
    required = {
        "AZURE_OPENAI_API_KEY": "api_key",
        "AZURE_OPENAI_ENDPOINT": "endpoint",
        "AZURE_OPENAI_API_VERSION": "version",
        "AZURE_DEPLOYMENT_NAME": "deployment_name"
    }

    config = {}
    missing = []
    for env_var, key in required.items():
        value = os.getenv(env_var)
        if not value:
            missing.append(env_var)
        else:
            config[key] = value

    if missing:
        click.echo(f"\n❌ Missing required environment variables: {', '.join(missing)}")
        click.echo("💡 Make sure your .env file is configured correctly.\n")
        sys.exit(1)

    config["system_prompt"] = os.getenv("RSCHAT_SYSTEM_PROMPT", "You are a happy assistant.")

    if overrides:
        config.update(overrides)

    return config
