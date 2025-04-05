import logging
from openai import AzureOpenAI
from openai.types.chat import ChatCompletion
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


def load_azure_client(*, api_key: str, azure_endpoint: str, api_version: str) -> AzureOpenAI:
    """
    Creates an AzureOpenAI client using the provided credentials.

    Args:
        api_key (str): Azure OpenAI API key
        azure_endpoint (str): Resource endpoint (e.g., https://your-resource.openai.azure.com)
        api_version (str): Azure OpenAI API version (e.g., 2023-12-01-preview)

    Returns:
        AzureOpenAI: Configured client for chat completion requests
    """
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
) -> ChatCompletion:
    """
    Sends a chat completion request to Azure OpenAI with retry logic.

    Args:
        messages (list): Chat history (list of {role, content} dicts)
        temperature (float): Randomness of output
        max_tokens (int): Maximum number of tokens to generate
        deployment_name (str): Azure deployment ID for the model
        api_key, azure_endpoint, api_version: Required Azure credentials
        **optional_args: Additional OpenAI chat parameters (e.g., seed, top_p, stop)

    Returns:
        ChatCompletion: Full response from the OpenAI SDK
    """
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
        logger.error(f"[AzureOpenAI] Request failed: {e}", exc_info=True)
        raise


def main(**kwargs) -> ChatCompletion:
    """
    Main entrypoint for rsazure-openai-toolkit.

    Validates input, builds the client, and sends the request to Azure OpenAI.

    Required kwargs:
        - api_key (str)
        - azure_endpoint (str)
        - api_version (str)
        - deployment_name (str)
        - messages (list of {role, content} dicts)

    Optional kwargs:
        - Any OpenAI chat parameters (e.g., seed, top_p, stop, presence_penalty)

    Returns:
        ChatCompletion: Full OpenAI response object
    """
    required_keys = {"messages", "api_key", "azure_endpoint", "api_version", "deployment_name"}
    missing_keys = required_keys - kwargs.keys()
    if missing_keys:
        raise ValueError(f"Missing required parameters: {', '.join(missing_keys)}")

    if not isinstance(kwargs["messages"], list) or not all(isinstance(m, dict) for m in kwargs["messages"]):
        raise TypeError("'messages' must be a list of dictionaries")

    return generate_response(**kwargs)
