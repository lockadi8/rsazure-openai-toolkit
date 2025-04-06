"""
rsazure_openai_toolkit.session

Session context manager for chat history and system prompt consistency.

Exports:
- SessionContext: Class to manage and persist conversation history.
- get_context_messages(): Builds the message list for each interaction.
"""

from .session import SessionContext, get_context_messages


__all__ = [
    "SessionContext",
    "get_context_messages",
]
