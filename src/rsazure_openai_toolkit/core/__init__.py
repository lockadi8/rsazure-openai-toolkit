"""
rsazure_openai_toolkit.core

Core functionality for interacting with Azure OpenAI.

Exports:
- main(): High-level request handler.
- generate_response(): Low-level retry-enabled OpenAI call.
"""

from .integration import main


__all__ = [
    "main",
]
