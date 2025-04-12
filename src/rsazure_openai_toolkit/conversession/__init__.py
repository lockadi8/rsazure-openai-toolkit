"""
rsazure_openai_toolkit.conversession

This module provides the central orchestration class `ConverSession`, which acts
as the main interface for running agent-based conversations with Azure OpenAI.

Exports:
- ConverSession: high-level orchestrator for agents, prompts, context, and logging
"""

from .conversession import ConverSession


__all__ = ["ConverSession"]
