# src/rsazure_openai_toolkit/cli/tools.py

"""
rschat-tools: Developer tools for Azure OpenAI integration.

Provides a CLI utility to generate example usage templates and projects
to help users get started quickly with the toolkit.
"""

from dataclasses import dataclass
from typing import List, Optional
import click
from rsazure_openai_toolkit.samples.generator import generate_sample


@dataclass(frozen=True)
class SampleOption:
    key: str
    name: str

    def display(self) -> str:
        return f"[{self.key}] {self.name.replace('-', ' ').title()}"


class ToolsCLI:
    def __init__(self):
        self.options: List[SampleOption] = [
            SampleOption("1", "basic-usage"),
            SampleOption("2", "advanced-usage"),
            SampleOption("3", "env-usage"),
            SampleOption("4", "env-advanced-usage"),
        ]

    def run(self):
        """Launch the interactive CLI tool for generating sample projects."""
        while True:
            self._print_menu()
            choice = click.prompt("\nEnter the number of the sample", type=str)
            click.echo()

            if choice == "0":
                click.echo("\n👋 Exiting.\n")
                break

            if choice == "all":
                self._generate_all_samples()
                continue

            selected = self._get_option_by_key(choice)
            if not selected:
                click.echo("❌ Invalid option.")
                continue

            generate_sample(selected.name)
            click.echo(f"✅ Sample '{selected.name}' created successfully.")

    def _print_menu(self):
        click.echo("\nSelect a sample to generate:")
        click.echo("\n[0] Exit")
        for opt in self.options:
            click.echo(opt.display())
        click.echo("\n[all] Generate All")

    def _get_option_by_key(self, key: str) -> Optional[SampleOption]:
        return next((opt for opt in self.options if opt.key == key), None)

    def _generate_all_samples(self):
        for opt in self.options:
            generate_sample(opt.name)
            click.echo(f"✅ Sample '{opt.name}' created.")


@click.group()
def main():
    """rschat-tools: Developer tools for Azure OpenAI integration."""
    pass


@main.command()
def samples():
    """Generate sample projects demonstrating toolkit usage."""
    ToolsCLI().run()
