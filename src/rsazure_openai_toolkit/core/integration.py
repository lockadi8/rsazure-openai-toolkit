import logging
from typing import Optional, Union, Mapping, Any
import httpx
from httpx import Timeout
from openai import AzureOpenAI
from openai.types.chat import ChatCompletion
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


def load_azure_client(
    *,
    api_key: Optional[str] = None,
    api_version: Optional[str],
    azure_ad_token: Optional[str] = None,
    azure_ad_token_provider: Optional[Any] = None,
    azure_deployment: Optional[str] = None,
    azure_endpoint: Optional[str] = None,
    base_url: Optional[str] = None,
    default_headers: Optional[Mapping[str, str]] = None,
    default_query: Optional[Mapping[str, object]] = None,
    http_client: Optional[httpx.Client] = None,
    max_retries: int = 2,
    organization: Optional[str] = None,
    project: Optional[str] = None,
    timeout: Optional[Union[float, Timeout]] = None,
    websocket_base_url: Optional[Union[str, httpx.URL]] = None,
    _strict_response_validation: bool = False
) -> AzureOpenAI:
    """
    Creates an AzureOpenAI client with full support for all authentication and configuration options.
    Either `azure_endpoint` or `base_url` must be provided.
    """
    return AzureOpenAI(
        api_key=api_key,
        api_version=api_version,
        azure_ad_token=azure_ad_token,
        azure_ad_token_provider=azure_ad_token_provider,
        azure_deployment=azure_deployment,
        azure_endpoint=azure_endpoint,
        base_url=base_url,
        default_headers=default_headers,
        default_query=default_query,
        http_client=http_client,
        max_retries=max_retries,
        organization=organization,
        project=project,
        timeout=timeout,
        websocket_base_url=websocket_base_url,
        _strict_response_validation=_strict_response_validation,
    )


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def generate_response(
    *,
    client: AzureOpenAI,
    deployment_name: str,
    frequency_penalty: Optional[float] = None,
    function_call: Optional[Union[str, dict]] = None,
    logit_bias: Optional[dict] = None,
    max_tokens: int = 1024,
    messages: list[dict],
    presence_penalty: Optional[float] = None,
    response_format: Optional[str] = None,
    seed: Optional[int] = None,
    stop: Optional[Union[str, list[str]]] = None,
    stream: Optional[bool] = None,
    temperature: float = 0.7,
    tool_choice: Optional[Union[str, dict]] = None,
    tools: Optional[list[dict]] = None,
    top_p: Optional[float] = None,
    user: Optional[str] = None
) -> ChatCompletion:
    """
    Sends a chat completion request to Azure OpenAI using the provided client and parameters.
    """
    if not messages:
        raise ValueError("The 'messages' parameter must be a non-empty list of messages.")

    try:
        return client.chat.completions.create(
            model=deployment_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            frequency_penalty=frequency_penalty,
            presence_penalty=presence_penalty,
            stop=stop,
            stream=stream,
            seed=seed,
            user=user,
            logit_bias=logit_bias,
            tools=tools,
            tool_choice=tool_choice,
            response_format=response_format,
            function_call=function_call,
        )
    except Exception as e:
        logger.error(f"[AzureOpenAI] Chat completion failed: {e}", exc_info=True)
        raise


def main(
    *,
    api_key: Optional[str] = None,
    api_version: str,
    azure_ad_token: Optional[str] = None,
    azure_ad_token_provider: Optional[Any] = None,
    azure_deployment: Optional[str] = None,
    azure_endpoint: Optional[str] = None,
    base_url: Optional[str] = None,
    default_headers: Optional[Mapping[str, str]] = None,
    default_query: Optional[Mapping[str, object]] = None,
    deployment_name: str = "",
    frequency_penalty: Optional[float] = None,
    function_call: Optional[Union[str, dict]] = None,
    http_client: Optional[httpx.Client] = None,
    logit_bias: Optional[dict] = None,
    max_retries: int = 2,
    max_tokens: int = 1024,
    messages: list[dict] = [],
    organization: Optional[str] = None,
    presence_penalty: Optional[float] = None,
    project: Optional[str] = None,
    response_format: Optional[str] = None,
    seed: Optional[int] = None,
    stop: Optional[Union[str, list[str]]] = None,
    stream: Optional[bool] = None,
    temperature: float = 0.7,
    timeout: Optional[Union[float, Timeout]] = None,
    tool_choice: Optional[Union[str, dict]] = None,
    tools: Optional[list[dict]] = None,
    top_p: Optional[float] = None,
    user: Optional[str] = None,
    websocket_base_url: Optional[Union[str, httpx.URL]] = None,
    _strict_response_validation: bool = False
) -> ChatCompletion:
    """
    Full internal entrypoint to create an Azure client and perform a chat completion with all available options.
    Intended for internal use only.
    """
    client = load_azure_client(
        api_key=api_key,
        api_version=api_version,
        azure_ad_token=azure_ad_token,
        azure_ad_token_provider=azure_ad_token_provider,
        azure_deployment=azure_deployment,
        azure_endpoint=azure_endpoint,
        base_url=base_url,
        default_headers=default_headers,
        default_query=default_query,
        http_client=http_client,
        max_retries=max_retries,
        organization=organization,
        project=project,
        timeout=timeout,
        websocket_base_url=websocket_base_url,
        _strict_response_validation=_strict_response_validation
    )

    return generate_response(
        client=client,
        deployment_name=deployment_name,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
        frequency_penalty=frequency_penalty,
        presence_penalty=presence_penalty,
        stop=stop,
        stream=stream,
        seed=seed,
        user=user,
        logit_bias=logit_bias,
        tools=tools,
        tool_choice=tool_choice,
        response_format=response_format,
        function_call=function_call
    )
