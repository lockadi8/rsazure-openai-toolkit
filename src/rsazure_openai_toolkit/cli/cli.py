# src/rsazure_openai_toolkit/cli/cli.py

"""
Main CLI entry point for rsazure_openai_toolkit (rschat).

Provides an interactive command-line interface to query Azure OpenAI endpoints.
Supports context handling, result logging, and environment-based config.

Usage:
    $ rschat "How does GPT-4o compare to GPT-4?"

Environment variables:
    - AZURE_OPENAI_API_KEY
    - AZURE_OPENAI_ENDPOINT
    - AZURE_OPENAI_API_VERSION
    - AZURE_DEPLOYMENT_NAME
    - RSCHAT_SYSTEM_PROMPT
    - RSCHAT_USE_CONTEXT
    - RSCHAT_SESSION_ID
    - RSCHAT_CONTEXT_MAX_MESSAGES
    - RSCHAT_CONTEXT_MAX_TOKENS
    - RSCHAT_LOG_MODE
    - RSCHAT_LOG_PATH
"""

import os
import sys
import time
import click
import rsazure_openai_toolkit as rschat


class ChatCLI:
    def __init__(self, question: tuple[str]):
        self.question = question
        self.user_input = " ".join(question)
        self.config = rschat.get_cli_config()
        self.context_data = {}
        self.messages = []
        self.context = None
        self.context_info = None
        self.model_config = {}
        self.input_tokens = 0
        self.response = None
        self.elapsed = 0.0
        self.result = None

    def run(self):
        """Run the CLI flow."""
        if not self.question:
            click.echo("\n⚠️  Please provide a question to ask the model.\n")
            sys.exit(1)

        rschat.load_env()
        self._prepare_context()
        self._estimate_tokens()
        self._send_request()
        self._save_context()
        self._build_result()
        self._print_result()
        self._log_result()

    def _prepare_context(self):
        self.context_data = rschat.get_context_messages(user_input=self.user_input)
        self.messages = self.context_data["messages"]
        self.context = self.context_data["context"]
        self.context_info = self.context_data.get("context_info")

    def _estimate_tokens(self):
        self.model_config = rschat.ModelConfig().as_dict()
        self.input_tokens = rschat.estimate_input_tokens(
            messages=self.messages,
            deployment_name=self.config["deployment_name"]
        )

    def _send_request(self):
        try:
            start = time.time()
            self.response = rschat.main(
                api_key=self.config["api_key"],
                azure_endpoint=self.config["endpoint"],
                api_version=self.config["version"],
                deployment_name=self.config["deployment_name"],
                messages=self.messages,
                **self.model_config
            )
            self.elapsed = round(time.time() - start, 2)
        except Exception as e:
            click.echo(f"\n❌ Error processing your question: {e}\n")
            sys.exit(1)

    def _save_context(self):
        if self.context and self.response:
            response_text = self.response.choices[0].message.content
            self.context.add("assistant", response_text)
            self.context.save()

    def _build_result(self):
        usage = self.response.usage.model_dump() if self.response.usage else {}
        response_text = self.response.choices[0].message.content

        input_real = usage.get("prompt_tokens", self.input_tokens)
        output_real = usage.get("completion_tokens", len(response_text.split()))
        total = usage.get("total_tokens", input_real + output_real)

        self.result = rschat.ChatResult(
            question=self.user_input,
            response_text=response_text,
            system_prompt=self.config["system_prompt"],
            model=self.response.model,
            seed=self.model_config.get("seed"),
            input_tokens=input_real,
            output_tokens=output_real,
            total_tokens=total,
            elapsed_time=self.elapsed,
            model_config=self.model_config,
            raw_response=self.response.model_dump()
        )

    def _print_result(self):
        if self.context_info:
            click.echo("\n----- CONTEXT INFO -----")
            click.echo(self.context_info.summary())
        elif os.getenv("RSCHAT_USE_CONTEXT", "0") == "1":
            click.echo("\n📭 No previous context loaded.")

        self.result.print()

    def _log_result(self):
        logger = rschat.get_logger()
        if not logger.enabled:
            click.echo("📭 Logging is disabled (RSCHAT_LOG_MODE is 'none' or not configured)\n")
            return
        logger.log(self.result.to_log_dict())


@click.command()
@click.argument("question", nargs=-1)
def cli(question):
    """Command-line entry point for Azure OpenAI interaction."""
    ChatCLI(question).run()
