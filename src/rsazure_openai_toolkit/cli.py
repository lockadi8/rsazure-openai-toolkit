import os
import sys
import click
from dotenv import load_dotenv
from rsazure_openai_toolkit import call_azure_openai_handler

load_dotenv()


@click.command()
@click.argument("question", nargs=-1)
def cli(question):
    """Send a question to Azure OpenAI and print the response."""
    if not question:
        click.echo("⚠️  Please provide a question to ask the model.")
        sys.exit(1)

    user_input = " ".join(question)

    try:
        response = call_azure_openai_handler(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            deployment_name=os.getenv("AZURE_DEPLOYMENT_NAME"),
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_input}
            ]
        )
        click.echo(response)
    except Exception as e:
        click.echo(f"❌ Error processing your question: {e}")
        sys.exit(1)
