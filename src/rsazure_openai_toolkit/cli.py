import os
import sys
import time
import click
from dotenv import load_dotenv

from rsazure_openai_toolkit import call_azure_openai_handler
from rsazure_openai_toolkit.utils.token_utils import estimate_input_tokens
from rsazure_openai_toolkit.utils.model_config_utils import get_model_config
from rsazure_openai_toolkit.logging.interaction_logger import InteractionLogger
from rsazure_openai_toolkit.session.context import get_context_messages


# Load environment variables from .env in project root
load_dotenv()

@click.command()
@click.argument("question", nargs=-1)
def cli(question):
    """Send a question to Azure OpenAI and print the response with token usage."""
    if not question:
        click.echo("\n⚠️  Please provide a question to ask the model.\n")
        sys.exit(1)

    user_input = " ".join(question)
    validate_env_vars()

    deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME")
    system_prompt = "You are a scientific AI."

    context_data = build_messages(user_input, system_prompt, deployment_name)
    messages = context_data["messages"]
    context = context_data["context"]

    model_config = get_model_config()
    input_tokens = estimate_input_tokens(messages, deployment_name)

    try:
        response, elapsed = send_request(messages, model_config)
        response_text = response.choices[0].message.content

        if context:
            context.add("assistant", response_text)
            context.save()

        print_response_info(response, input_tokens, model_config, elapsed, user_input, system_prompt)
        log_interaction_if_enabled(user_input, system_prompt, response, input_tokens, model_config, elapsed)
    except Exception as e:
        click.echo(f"\n❌ Error processing your question: {e}\n")
        sys.exit(1)


def validate_env_vars():
    required = [
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT",
        "AZURE_OPENAI_API_VERSION",
        "AZURE_DEPLOYMENT_NAME"
    ]
    missing = [var for var in required if not os.getenv(var)]
    if missing:
        click.echo(f"\n❌ Missing required environment variables: {', '.join(missing)}")
        click.echo("💡 Make sure your .env file is in the project root and properly configured.\n")
        sys.exit(1)


def build_messages(user_input: str, system_prompt: str, deployment_name: str) -> dict:
    use_context = os.getenv("RSCHAT_USE_CONTEXT", "0") == "1"
    session_id = os.getenv("RSCHAT_SESSION_ID", "default")
    max_messages = int(os.getenv("RSCHAT_CONTEXT_MAX_MESSAGES", "0") or 0)
    max_tokens = int(os.getenv("RSCHAT_CONTEXT_MAX_TOKENS", "0") or 0)

    context_data = get_context_messages(
        user_input=user_input,
        system_prompt=system_prompt,
        deployment_name=deployment_name,
        use_context=use_context,
        session_id=session_id,
        max_messages=max_messages or None,
        max_tokens=max_tokens or None
    )

    context = context_data["context"]
    messages = context_data["messages"]

    if context:
        num_prev_msgs = len(context.messages) - 1 if context.messages else 0
        click.echo(f"\n📚 Loaded context: {num_prev_msgs} previous message(s)")
        click.echo("➕ Added user input")
        click.echo(f"📦 Total now: {len(context)} message(s)")
        click.echo(f"🔐 System prompt in use: \"{context.system_prompt}\"")

    return {"messages": messages, "context": context}


def send_request(messages: list[dict], model_config: dict):
    start_time = time.time()
    response = call_azure_openai_handler(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        deployment_name=os.getenv("AZURE_DEPLOYMENT_NAME"),
        messages=messages,
        **model_config
    )
    elapsed = round(time.time() - start_time, 2)
    return response, elapsed


def print_response_info(response, input_tokens: int, model_config: dict, elapsed: float, user_input: str, system_prompt: str):
    response_text = response.choices[0].message.content
    usage = response.usage.model_dump() if response.usage else {}
    model_used = response.model

    input_real = usage.get("prompt_tokens", input_tokens)
    output_real = usage.get("completion_tokens", len(response_text.split()))
    total_tokens = usage.get("total_tokens", input_real + output_real)
    seed = model_config.get("seed")

    click.echo(f"\n\nAssistant:\n\n{response_text}")
    click.echo("\n\n----- REQUEST INFO -----")
    click.echo(f"📤 Input tokens: {input_real}")
    click.echo(f"📥 Output tokens: {output_real}")
    click.echo(f"🧾 Total tokens: {total_tokens}")
    click.echo(f"🧠 Model: {model_used}")
    click.echo(f"🎲 Seed: {seed}")
    click.echo(f"⏱️ Time: {elapsed}s\n")


def log_interaction_if_enabled(user_input, system_prompt, response, input_tokens, model_config, elapsed):
    log_mode = os.getenv("RSCHAT_LOG_MODE")
    log_path = os.getenv("RSCHAT_LOG_PATH")
    logger = InteractionLogger(mode=log_mode, path=log_path)

    if not logger.enabled:
        click.echo("📭 Logging is disabled (RSCHAT_LOG_MODE is 'none' or not configured)\n")
        return

    usage = response.usage.model_dump() if response.usage else {}
    response_text = response.choices[0].message.content

    input_real = usage.get("prompt_tokens", input_tokens)
    output_real = usage.get("completion_tokens", len(response_text.split()))
    total = usage.get("total_tokens", input_real + output_real)

    logger.log({
        "question": user_input,
        "response": response_text,
        "system_prompt": system_prompt,
        "input_tokens_estimated": input_tokens,
        "output_tokens_estimated": output_real,
        "input_tokens": input_real,
        "output_tokens": output_real,
        "total_tokens": total,
        "model": response.model,
        "elapsed_time": elapsed,
        "model_config": model_config,
        "raw_response": response.model_dump()
    })
