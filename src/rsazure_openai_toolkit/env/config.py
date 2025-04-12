"""
rsazure_openai_toolkit.env_config

Environment configuration utilities for loading and validating Azure OpenAI settings.

Exports:
- load_env(): Loads environment variables from a .env file
- get_cli_config(): Core OpenAI credentials and system settings
- get_context_config(): Context/session configuration
- get_logging_config(): Logging mode and path
"""

import os
import sys
from typing import Optional
from pathlib import Path
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
        - RSCHAT_SYSTEM_PROMPT (default: "You are a helpful assistant.")
        - RSCHAT_PROMPT_PATH (default: ".rsazure/prompts/")

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

    config["system_prompt"] = os.getenv("RSCHAT_SYSTEM_PROMPT", "You are a helpful assistant.")
    config["prompt_path"] = os.getenv("RSCHAT_PROMPT_PATH", ".rsazure/prompts/")

    return {**config, **(overrides or {})}


def get_context_config() -> dict:
    """
    Load optional environment variables related to session context configuration.

    Optional environment variables:
        - RSCHAT_USE_CONTEXT (default: "0")
        - RSCHAT_SESSION_ID (default: "default")
        - RSCHAT_CONTEXT_MAX_MESSAGES (default: "0")
        - RSCHAT_CONTEXT_MAX_TOKENS (default: "0")
        - RSCHAT_CONTEXT_PATH (default: "./.session")
        - RSCHAT_OVERRIDE_SYSTEM (default: "0")

    Returns:
        dict: Dictionary with parsed context configuration.
    """
    return {
        "use_context": os.getenv("RSCHAT_USE_CONTEXT", "0") == "1",
        "session_id": os.getenv("RSCHAT_SESSION_ID", "default"),
        "max_messages": int(os.getenv("RSCHAT_CONTEXT_MAX_MESSAGES", "0") or 0) or None,
        "max_tokens": int(os.getenv("RSCHAT_CONTEXT_MAX_TOKENS", "0") or 0) or None,
        "context_path": Path(os.getenv("RSCHAT_CONTEXT_PATH", "./.session")).expanduser(),
        "override_system": os.getenv("RSCHAT_OVERRIDE_SYSTEM", "0") == "1"
    }


def get_logging_config() -> dict:
    """
    Load optional environment variables related to logging configuration.

    Optional environment variables:
        - RSCHAT_LOG_MODE (default: "none") — accepted: none, jsonl, csv
        - RSCHAT_LOG_PATH (default: "~/.rsazure/chat_logs.jsonl")

    Returns:
        dict: Dictionary with logging configuration.
    """
    return {
        "mode": os.getenv("RSCHAT_LOG_MODE", "none").lower(),
        "path": os.getenv("RSCHAT_LOG_PATH", "~/.rsazure/chat_logs.jsonl")
    }
