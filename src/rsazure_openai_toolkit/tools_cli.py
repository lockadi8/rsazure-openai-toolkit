import click
from rsazure_openai_toolkit.samples.generator import generate_sample

@click.group()
def main():
    """rschat-tools: Developer tools for Azure OpenAI integration"""
    pass

@main.command()
def samples():
    """Generate sample projects demonstrating toolkit usage."""
    options = {
        "1": "basic-usage",
        "2": "advanced-usage",
        "3": "env-usage",
        "4": "env-advanced-usage"
    }

    click.echo("Select a sample to generate:")
    for key, name in options.items():
        click.echo(f"[{key}] {name.replace('-', ' ').title()}")

    choice = click.prompt("Enter the number of the sample", type=str)

    if choice not in options:
        click.echo("❌ Invalid option.")
        return

    generate_sample(options[choice])
    click.echo(f"✅ Sample '{options[choice]}' created successfully.")
