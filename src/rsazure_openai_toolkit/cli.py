import os
import sys
import time
import click
from dotenv import load_dotenv
from rsazure_openai_toolkit import call_azure_openai_handler
from rsazure_openai_toolkit.utils.token_utils import estimate_input_tokens
from rsazure_openai_toolkit.utils.model_config_utils import get_model_config
from rsazure_openai_toolkit.logging.interaction_logger import InteractionLogger

# Load environment variables from .env in project root
load_dotenv()


@click.command()
@click.argument("question", nargs=-1)
def cli(question):
    """Send a question to Azure OpenAI and print the response with token usage."""
    if not question:
        click.echo("⚠️  Please provide a question to ask the model.")
        sys.exit(1)

    # Validate environment variables
    required_vars = [
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT",
        "AZURE_OPENAI_API_VERSION",
        "AZURE_DEPLOYMENT_NAME"
    ]
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        click.echo(f"❌ Missing required environment variables: {', '.join(missing)}")
        click.echo("💡 Make sure your .env file is in the project root and properly configured.")
        sys.exit(1)

    user_input = " ".join(question)
    deployment_name = os.getenv("AZURE_DEPLOYMENT_NAME")

    system_prompt = "You are a helpful assistant."
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input}
    ]

    # Local token estimation (used as fallback for logs)
    input_tokens = estimate_input_tokens(messages, deployment_name)
    model_config = get_model_config()

    start_time = time.time()
    try:
        response = call_azure_openai_handler(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            deployment_name=deployment_name,
            messages=messages,
            **model_config
        )
        elapsed = round(time.time() - start_time, 2)

        # Extract relevant info from OpenAI API response
        response_text = response.choices[0].message.content
        usage = response.usage.model_dump() if response.usage else {}
        model_used = response.model

        # Real token counts (fallbacks used only for logging)
        input_tokens_real = usage.get("prompt_tokens", input_tokens)
        output_tokens_real = usage.get("completion_tokens", len(response_text.split()))
        total_tokens = usage.get("total_tokens", input_tokens_real + output_tokens_real)

        # Determine seed used (if any)
        seed_used = model_config.get("seed")

        # Terminal output
        click.echo(f"\nAssistant:\n\t{response_text}")
        click.echo("\n----- REQUEST INFO -----")
        click.echo(f"📤 Input tokens: {input_tokens_real}")
        click.echo(f"📥 Output tokens: {output_tokens_real}")
        click.echo(f"🧾 Total tokens: {total_tokens}")
        click.echo(f"🧠 Model: {model_used}")
        click.echo(f"🎲 Seed: {seed_used}")
        click.echo(f"⏱️ Time: {elapsed}s\n")

        # Optional logging (only if explicitly configured)
        log_mode = os.getenv("RSCHAT_LOG_MODE")
        log_path = os.getenv("RSCHAT_LOG_PATH")
        logger = InteractionLogger(mode=log_mode, path=log_path)

        if logger.enabled:
            logger.log({
                "question": user_input,
                "response": response_text,
                "system_prompt": system_prompt,
                "input_tokens_estimated": input_tokens,
                "output_tokens_estimated": output_tokens_real,
                "input_tokens": input_tokens_real,
                "output_tokens": output_tokens_real,
                "total_tokens": total_tokens,
                "model": model_used,
                "elapsed_time": elapsed,
                "model_config": model_config,
                "raw_response": response.model_dump()
            })
        else:
            click.echo("📭 Logging is disabled (RSCHAT_LOG_MODE is 'none' or not configured)\n")
    except Exception as e:
        click.echo(f"❌ Error processing your question: {e}")
        sys.exit(1)
