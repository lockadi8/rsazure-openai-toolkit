import logging
from openai import AzureOpenAI
from openai.types.chat import ChatCompletion
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


def load_azure_client(*, api_key: str, azure_endpoint: str, api_version: str) -> AzureOpenAI:
    return AzureOpenAI(
        api_key=api_key,
        azure_endpoint=azure_endpoint,
        api_version=api_version
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def generate_response(
    *,
    messages: list,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    deployment_name: str,
    api_key: str,
    azure_endpoint: str,
    api_version: str,
    **optional_args
) -> dict:
    if not messages:
        raise ValueError("Missing required parameter: 'messages' is required.")

    client = load_azure_client(
        api_key=api_key,
        azure_endpoint=azure_endpoint,
        api_version=api_version
    )

    try:
        response: ChatCompletion = client.chat.completions.create(
            model=deployment_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **optional_args
        )
        return response
    except Exception as e:
        logger.error(f"Error calling Azure OpenAI: {e}")
        raise
