import os
import sys
import time
import click
import rsazure_openai_toolkit as rschat


@click.command()
@click.argument("question", nargs=-1)
def cli(question):
    """Send a question to Azure OpenAI and print the response with token usage."""
    if not question:
        click.echo("\n⚠️  Please provide a question to ask the model.\n")
        sys.exit(1)

    rschat.load_env()
    user_input = " ".join(question)
    execute_cli_flow(user_input)


def execute_cli_flow(user_input: str):
    config = get_cli_config()
    context_data = rschat.get_context_messages(user_input=user_input)
    messages, context = context_data["messages"], context_data["context"]
    context_info = context_data.get("context_info")

    model_config_obj = rschat.ModelConfig()
    model_config = model_config_obj.as_dict()

    input_tokens = rschat.estimate_input_tokens(
        messages=messages,
        deployment_name=config["deployment_name"]
    )

    try:
        start = time.time()
        response = rschat.main(
            api_key=config["api_key"],
            azure_endpoint=config["endpoint"],
            api_version=config["version"],
            deployment_name=config["deployment_name"],
            messages=messages,
            **model_config
        )
        elapsed = round(time.time() - start, 2)

        response_text = response.choices[0].message.content
        if context:
            context.add("assistant", response_text)
            context.save()

        result = build_result(
            user_input=user_input,
            response=response,
            model_config=model_config,
            input_tokens=input_tokens,
            elapsed=elapsed,
            system_prompt=config["system_prompt"]
        )

        if context_info:
            click.echo("\n----- CONTEXT INFO -----")
            click.echo(context_info.summary())
        elif os.getenv("RSCHAT_USE_CONTEXT", "0") == "1":
            click.echo("\n📭 No previous context loaded.")

        result.print()
        log_result_if_enabled(result)

    except Exception as e:
        click.echo(f"\n❌ Error processing your question: {e}\n")
        sys.exit(1)


def get_cli_config(*, overrides: dict = None) -> dict:
    required = {
        "AZURE_OPENAI_API_KEY": "api_key",
        "AZURE_OPENAI_ENDPOINT": "endpoint",
        "AZURE_OPENAI_API_VERSION": "version",
        "AZURE_DEPLOYMENT_NAME": "deployment_name"
    }

    config = {}
    missing = []
    for env_var, key in required.items():
        value = os.getenv(env_var)
        if not value:
            missing.append(env_var)
        else:
            config[key] = value

    if missing:
        click.echo(f"\n❌ Missing required environment variables: {', '.join(missing)}")
        click.echo("💡 Make sure your .env file is configured correctly.\n")
        sys.exit(1)

    config["system_prompt"] = os.getenv("RSCHAT_SYSTEM_PROMPT", "You are a happy assistant.")

    if overrides:
        config.update(overrides)

    return config


def build_result(
    user_input: str,
    response,
    model_config: dict,
    input_tokens: int,
    elapsed: float,
    system_prompt: str
) -> rschat.ChatResult:
    usage = response.usage.model_dump() if response.usage else {}
    response_text = response.choices[0].message.content

    input_real = usage.get("prompt_tokens", input_tokens)
    output_real = usage.get("completion_tokens", len(response_text.split()))
    total = usage.get("total_tokens", input_real + output_real)

    return rschat.ChatResult(
        question=user_input,
        response_text=response_text,
        system_prompt=system_prompt,
        model=response.model,
        seed=model_config.get("seed"),
        input_tokens=input_real,
        output_tokens=output_real,
        total_tokens=total,
        elapsed_time=elapsed,
        model_config=model_config,
        raw_response=response.model_dump()
    )


def log_result_if_enabled(result: rschat.ChatResult):
    logger = rschat.get_logger()

    if not logger.enabled:
        click.echo("📭 Logging is disabled (RSCHAT_LOG_MODE is 'none' or not configured)\n")
        return

    logger.log(result.to_log_dict())
