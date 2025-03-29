import os
import re
import tiktoken
from tiktoken.model import encoding_for_model


# Pattern to detect modern tokenizer families like "4o", "o1", "o3" in deployment names
MODERN_TOKENIZER_PATTERN = re.compile(r"(?<!\w)(\d?o\d?|o\d)(?!\w)", re.IGNORECASE)

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
