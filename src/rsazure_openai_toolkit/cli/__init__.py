"""
CLI utilities for running and extending rschat functionality.

Modules:
- cli: Main CLI entrypoint used in the command-line interface.
- tools: Developer-oriented tools such as sample generation.
"""

from .cli import cli
from .tools import main as tools_main


__all__ = [
    "cli",
    "tools_main"
]
