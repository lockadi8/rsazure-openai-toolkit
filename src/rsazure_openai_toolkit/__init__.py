"""
rsazure_openai_toolkit

Toolkit for fast and flexible integration with Azure OpenAI
"""

from .handler import call_azure_openai_handler
from .integration import generate_response, load_azure_client

__all__ = [
    "call_azure_openai_handler",
    "generate_response",
    "load_azure_client",
]
