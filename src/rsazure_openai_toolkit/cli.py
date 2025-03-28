import os
import sys
import click
from dotenv import load_dotenv
from rsazure_openai_toolkit import call_azure_openai_handler

# Load environment variables from .env in project root
load_dotenv()

@click.command()
@click.argument("question", nargs=-1)
def cli(question):
    """Send a question to Azure OpenAI and print the response."""
    if not question:
        click.echo("⚠️  Please provide a question to ask the model.")
        sys.exit(1)

    # Validate required environment variables
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
