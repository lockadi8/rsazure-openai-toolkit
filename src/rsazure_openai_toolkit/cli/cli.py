"""
Main CLI entry point for rsazure_openai_toolkit (rschat).

Provides a simple interface to query Azure OpenAI via ConverSession.

Usage:
    $ rschat "How does GPT-4o compare to GPT-4?"
"""

import sys
import click
import rsazure_openai_toolkit as rschat

rschat.load_env()


@click.command()
@click.argument("question", nargs=-1)
def cli(question):
    """Command-line entry point for Azure OpenAI interaction using ConverSession."""
    if not question:
        click.echo("\n⚠️  Please provide a question to ask the model.\n")
        sys.exit(1)

    user_input = " ".join(question)
    cli_cfg = rschat.get_cli_config()
    ctx_cfg = rschat.get_context_config()
    log_cfg = rschat.get_logging_config()

    # Instancia uma sessão de conversa baseada em um agente
    session = rschat.ConverSession(
        agent="default",
        prompt=None,
        prompt_vars={"input": user_input},
        session_id=ctx_cfg["session_id"],
        enable_context=ctx_cfg["use_context"],
        enable_logging=log_cfg["mode"] != "none",
        prompt_path=cli_cfg["prompt_path"]
    )

    try:
        response = session.send()
    except Exception as e:
        click.echo(f"\n❌ Error processing your question: {e}\n")
        sys.exit(1)

    # Exibe informações do contexto, se houver
    if session.context:
        click.echo("\n----- CONTEXT INFO -----")
        click.echo(str(session.context))

    elif ctx_cfg["use_context"]:
        click.echo("\n📭 No previous context loaded.")

    # Imprime a resposta da LLM
    click.echo(f"\nAssistant:\n\n{response}")
