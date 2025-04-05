import os
import re
import tiktoken
from tiktoken.model import encoding_for_model
from typing import Optional, Dict, Any
from dotenv import load_dotenv


# Pattern to detect modern tokenizer families like "4o", "o1", "o3" in deployment names
MODERN_TOKENIZER_PATTERN = re.compile(r"(?<!\w)(\d?o\d?|o\d)(?!\w)", re.IGNORECASE)


def load_env(verbose: bool = False, override: bool = True) -> bool:
    """
    Load environment variables from a .env file.

    Args:
        verbose (bool): Whether to print debug info about loaded values.
        override (bool): Whether to override existing environment variables.

    Returns:
        bool: True if a .env file was found and successfully loaded.
    """
    return load_dotenv(override=override, verbose=verbose)


def resolve_model_name(deployment_name: str, override: str = None) -> str:
    """
    Resolves the most appropriate model name for tokenizer purposes.

    Priority:
    1. Explicit override
    2. AZURE_OPENAI_MODEL env var
    3. Pattern match for modern family (gpt-4o / o1 / o3 / etc)
    4. Fallback to legacy (gpt-3.5-turbo)
    """
    if override:
        return override

    env_model = os.getenv("AZURE_OPENAI_MODEL")
    if env_model:
        return env_model

    if deployment_name and MODERN_TOKENIZER_PATTERN.search(deployment_name.lower()):
        return "gpt-4o"  # uses o200k_base tokenizer

    return "gpt-3.5-turbo"  # uses cl100k_base tokenizer


def estimate_input_tokens(messages: list[dict], deployment_name: str, model_override: str = None) -> int:
    """
    Estimate token count of a message list using the best-guess model/tokenizer.
    """
    model = resolve_model_name(deployment_name, override=model_override)

    try:
        encoding = encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("o200k_base")  # safe fallback for modern models

    return sum(
        4 + sum(len(encoding.encode(str(value))) for value in message.values())
        for message in messages
    )


def get_model_config(*, overrides: Optional[Dict[str, Any]] = None, seed: Optional[int] = 1) -> Dict[str, Any]:
    """
    Generate a model configuration dictionary for OpenAI chat completions.

    Behavior:
    - If no overrides are provided, returns default parameters: temperature, max_tokens, and (optionally) seed.
    - If overrides are provided, they override all defaults — including seed if explicitly present.
    - If seed is passed and not already in overrides, it is included.
    - If seed is None, it will be excluded entirely (non-deterministic generation).

    Default values:
        - temperature: 0.7
        - max_tokens: 1024
        - seed: 1 (can be disabled with seed=None)

    Supported parameters:
        - temperature (float): Controls randomness (0.0 = deterministic, 1.0 = more creative)
        - max_tokens (int): Maximum number of tokens to generate in the completion
        - seed (int): Makes responses deterministic for identical input (if supported)
        - top_p (float): Controls diversity via nucleus sampling
        - frequency_penalty (float): Penalizes repeated tokens
        - presence_penalty (float): Encourages introducing new topics
        - stop (str | list[str]): Sequence(s) that will halt generation
        - user (str): Optional user identifier for tracking
        - logit_bias (dict): Adjusts probability of specific tokens (token_id -> bias)

    Examples:
        >>> get_model_config()
        {'temperature': 0.7, 'max_tokens': 1024, 'seed': 1}

        >>> get_model_config(overrides={'top_p': 0.9})
        {'temperature': 0.7, 'max_tokens': 1024, 'seed': 1, 'top_p': 0.9}

        >>> get_model_config(overrides={'seed': 99}, seed=123)
        {'temperature': 0.7, 'max_tokens': 1024, 'seed': 99}

        >>> get_model_config(seed=None)
        {'temperature': 0.7, 'max_tokens': 1024}

    Parameters:
        overrides (dict, optional): Custom values to override or extend the default configuration.
        seed (int | None, optional): Optional seed value. Ignored if 'seed' is present in overrides.

    Returns:
        dict: Final model configuration dictionary.
    """
    defaults = {
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    overrides = overrides or {}

    # Only apply seed if user wants it and it's not already explicitly overridden
    if "seed" not in overrides and seed is not None:
        defaults["seed"] = seed

    return {**defaults, **overrides}
