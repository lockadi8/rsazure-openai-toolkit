"""
rsazure_openai_toolkit

A fast, secure, and auditable toolkit to integrate with Azure OpenAI — with a friendly CLI and dev-first architecture.

Top-level exports available when importing as `import rsazure_openai_toolkit as rschat`:

# Configuration & utility
- rschat.get_model_config(...)
- rschat.ModelConfig(...)
- rschat.estimate_input_tokens(...)
- rschat.load_env()
- rschat.get_cli_config()

# Session context
- rschat.SessionContext(...)
- rschat.get_context_messages(...)

# Logging
- rschat.InteractionLogger(...)
- rschat.get_logger(...)

# CLI Entrypoints
- rschat.cli(...)
- rschat.tools_main(...)

# Conversational interface
- rschat.ConverSession(...)

# Results and metadata
- rschat.ChatResult(...)
- rschat.ContextInfo(...)
- rschat.PromptData(...)
- rschat.PromptMetadata(...)
"""

__version__ = "0.7.0"
__description__ = "A fast, modular, secure, and auditable toolkit to integrate with Azure OpenAI — with a friendly CLI and dev-first architecture."
__author__ = "Renan Siqueira Antonio"
__license__ = "MIT"
__status__ = "Beta"
__url__ = "https://github.com/renan-siqueira/rsazure-openai-toolkit"
__docs__ = "https://github.com/renan-siqueira/rsazure-openai-toolkit/tree/main/docs"
__security_policy_url__ = "https://github.com/renan-siqueira/rsazure-openai-toolkit/security/policy"

# Utility
from .utils import estimate_input_tokens

# Environment
from .env import load_env, get_cli_config, get_context_config, get_logging_config

# Prompts (model config, prompt structure)
from .prompts import (
    get_model_config,
    ModelConfig,
    PromptData,
    PromptMetadata
)

# Session management
from .session import SessionContext, get_context_messages

# Logging
from .logging import InteractionLogger, get_logger

# Conversational engine
from .conversession import ConverSession

# CLI entrypoints
from .cli import cli, tools_main

# Result models
from .models import ChatResult, ContextInfo


__all__ = [
    # Config & utils
    "get_model_config",
    "ModelConfig",
    "estimate_input_tokens",
    "load_env",
    "get_cli_config",
    "get_context_config",
    "get_logging_config",

    # Prompt metadata
    "PromptData",
    "PromptMetadata",

    # Context management
    "SessionContext",
    "get_context_messages",

    # Logging
    "InteractionLogger",
    "get_logger",

    # CLI entrypoints
    "cli",
    "tools_main",

    # Conversational entrypoint
    "ConverSession",

    # Result and metadata representations
    "ChatResult",
    "ContextInfo",
]
