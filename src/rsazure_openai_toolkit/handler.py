from .integration import generate_response


def call_azure_openai_handler(**kwargs) -> str:
    required_keys = {"messages", "api_key", "azure_endpoint", "api_version", "deployment_name"}

    missing_keys = required_keys - kwargs.keys()
    if missing_keys:
        raise ValueError(f"Missing required parameters: {', '.join(missing_keys)}")

    return generate_response(**kwargs)
