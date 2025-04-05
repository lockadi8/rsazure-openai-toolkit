"""
rsazure_openai_toolkit.model_config

Model configuration interface for OpenAI chat completions.

Exports:
- get_model_config(): Returns a default or customized config dictionary.
- ModelConfig: Class-based alternative to manage configuration.
"""

from .model_config import get_model_config, ModelConfig


__all__ = [
    "get_model_config",
    "ModelConfig",
]
