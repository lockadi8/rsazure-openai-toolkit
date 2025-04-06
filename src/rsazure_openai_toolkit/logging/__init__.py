"""
rsazure_openai_toolkit.logging

Tools for logging user interactions with Azure OpenAI.

Exports:
- InteractionLogger: Append logs to CSV/JSONL.
- get_logger(): Returns logger instance based on env vars.
"""

from .interaction_logger import InteractionLogger, get_logger


__all__ = [
    "InteractionLogger",
    "get_logger",
]
