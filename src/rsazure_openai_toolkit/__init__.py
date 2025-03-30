"""
rsazure_openai_toolkit

A fast, secure, and auditable toolkit to integrate with Azure OpenAI — with a friendly CLI and dev-first architecture.
"""

__version__ = "0.5.1"

from .handler import call_azure_openai_handler
from .integration import generate_response, load_azure_client

__all__ = [
    "call_azure_openai_handler",
    "generate_response",
    "load_azure_client",
]
