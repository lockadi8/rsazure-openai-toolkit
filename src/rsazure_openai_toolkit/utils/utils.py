"""
rsazure_openai_toolkit.utils

Utility functions to support interaction with Azure OpenAI models, including:
- Token estimation
- Model name resolution for tokenizer compatibility
"""

import os
import re
from typing import Optional

import tiktoken


# Pattern to detect modern tokenizer families like "4o", "o1", "o3" in deployment names
MODERN_TOKENIZER_PATTERN = re.compile(r"(?<!\w)(\d?o\d?|o\d)(?!\w)", re.IGNORECASE)


def resolve_model_name(*, deployment_name: str, override: Optional[str] = None) -> str:
    """
    Resolve the best matching model name for tokenizer purposes, based on priority:

    1. Explicit override
    2. Environment variable: AZURE_OPENAI_MODEL
    3. Pattern match for modern family names (e.g., "4o", "o1", "o3")
    4. Default fallback to "gpt-3.5-turbo"

    Args:
        deployment_name (str): Name of the Azure OpenAI deployment.
        override (str, optional): Explicit model override (e.g., "gpt-4").

    Returns:
        str: The resolved OpenAI model name (used for tokenizer).
    """
    if override:
        return override

    env_model = os.getenv("AZURE_OPENAI_MODEL")
    if env_model:
        return env_model

    if deployment_name and MODERN_TOKENIZER_PATTERN.search(deployment_name.lower()):
        return "gpt-4o"  # uses o200k_base tokenizer

    return "gpt-3.5-turbo"  # uses cl100k_base tokenizer


def estimate_input_tokens(*, messages: list[dict], deployment_name: str, model_override: Optional[str] = None) -> int:
    """
    Estimate the number of input tokens in a list of messages using the appropriate tokenizer.

    Args:
        messages (list[dict]): List of chat messages (role/content).
        deployment_name (str): Azure deployment name to infer tokenizer.
        model_override (str, optional): Explicit model name to override deployment inference.

    Returns:
        int: Estimated number of input tokens.
    """
    model = resolve_model_name(deployment_name=deployment_name, override=model_override)

    try:
        encoding = tiktoken.model.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("o200k_base")  # Safe fallback for modern models

    return sum(
        4 + sum(len(encoding.encode(str(value))) for value in message.values())
        for message in messages
    )
