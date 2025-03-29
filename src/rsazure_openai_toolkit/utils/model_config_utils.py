from typing import Optional, Dict, Any


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
