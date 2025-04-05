"""
Data models for contextual and result-related information.

Includes:
- ContextInfo: Provides a summary of the loaded session context.
- ChatResult: Wraps the result of a chat completion with metadata and utilities.
"""

from .context import ContextInfo
from .results import ChatResult


__all__ = [
    "ContextInfo",
    "ChatResult"
]
