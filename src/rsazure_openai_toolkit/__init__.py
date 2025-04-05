"""
rsazure_openai_toolkit

A fast, secure, and auditable toolkit to integrate with Azure OpenAI — with a friendly CLI and dev-first architecture.

Top-level exports available when importing as `import rsazure_openai_toolkit as rschat`:

# Core interaction
- rschat.main(...)
- rschat.generate_response(...)

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

# Results and metadata
- rschat.ChatResult(...)
- rschat.ContextInfo(...)
"""

__version__ = "0.5.2"

from .core import (
    main,
    generate_response
)
from .utils import (
    estimate_input_tokens,
)
from .env_config import (
    load_env,
    get_cli_config,
)
from .model_config.model_config import (
    get_model_config,
    ModelConfig,
)
from .session.context import SessionContext, get_context_messages
from .logging.interaction_logger import InteractionLogger, get_logger
from .results import ChatResult
from .context_info import ContextInfo


__all__ = [
    # Core OpenAI interaction
    "main",
    "generate_response",

    # Config & utils
    "get_model_config",
    "ModelConfig",
    "estimate_input_tokens",
    "load_env",
    "get_cli_config",

    # Context management
    "SessionContext",
    "get_context_messages",

    # Logging
    "InteractionLogger",
    "get_logger",

    # Result and metadata representations
    "ChatResult",
    "ContextInfo",
]
