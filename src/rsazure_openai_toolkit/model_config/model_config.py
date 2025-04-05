from typing import Optional, Any, Dict


class ModelConfig:
    """
    Represents a model configuration for Azure OpenAI chat completions.

    Supports default values, custom overrides, and optional seed for reproducibility.
    """

    def __init__(self, *, seed: Optional[int] = 1, **overrides: Any):
        self.temperature: float = overrides.get("temperature", 0.7)
        self.max_tokens: int = overrides.get("max_tokens", 1024)
        self.seed: Optional[int] = overrides.get("seed", seed)

        self.top_p: Optional[float] = overrides.get("top_p")
        self.presence_penalty: Optional[float] = overrides.get("presence_penalty")
        self.frequency_penalty: Optional[float] = overrides.get("frequency_penalty")
        self.stop: Optional[str | list[str]] = overrides.get("stop")
        self.user: Optional[str] = overrides.get("user")
        self.logit_bias: Optional[dict] = overrides.get("logit_bias")

    def as_dict(self) -> Dict[str, Any]:
        config = {
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        if self.seed is not None:
            config["seed"] = self.seed

        for key in [
            "top_p", "presence_penalty", "frequency_penalty",
            "stop", "user", "logit_bias"
        ]:
            value = getattr(self, key)
            if value is not None:
                config[key] = value

        return config


def get_model_config(*, overrides: Optional[Dict[str, Any]] = None, seed: Optional[int] = 1) -> Dict[str, Any]:
    """
    Generate a model configuration dictionary for OpenAI chat completions.

    Behavior:
    - Returns default config if no custom values are provided.
    - Merges user-provided custom values over the defaults.
    - Adds 'seed' if provided (and not already in overrides).
    - Omits 'seed' if explicitly set to None.

    Default values:
        - temperature: 0.7
        - max_tokens: 1024
        - seed: 1

    Supported parameters:
        - temperature, max_tokens, seed, top_p, frequency_penalty,
          presence_penalty, stop, user, logit_bias

    To disable deterministic behavior, pass seed=None or overrides={"seed": None}.

    Examples:
        >>> get_model_config()
        {'temperature': 0.7, 'max_tokens': 1024, 'seed': 1}

        >>> get_model_config(overrides={'top_p': 0.9})
        {'temperature': 0.7, 'max_tokens': 1024, 'seed': 1, 'top_p': 0.9}

        >>> get_model_config(overrides={'seed': 99}, seed=123)
        {'temperature': 0.7, 'max_tokens': 1024, 'seed': 99}

        >>> get_model_config(seed=None)
        {'temperature': 0.7, 'max_tokens': 1024}

    Args:
        overrides (dict, optional): Values to override the default config.
        seed (int | None, optional): Optional seed for reproducibility (if supported).

    Returns:
        dict: Finalized model configuration.
    """
    return ModelConfig(seed=seed, **(overrides or {})).as_dict()
