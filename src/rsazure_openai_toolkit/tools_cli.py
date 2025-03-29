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
        "4": "env-advanced-usage",
        "all": "all"
    }

    while True:
        click.echo("\nSelect a sample to generate:")
        click.echo("[0] Exit")
        for key, name in options.items():
            if key != "all":
                click.echo(f"[{key}] {name.replace('-', ' ').title()}")
        click.echo("[all] Generate All")

        choice = click.prompt("Enter the number of the sample", type=str)

        if choice == "0":
            click.echo("👋 Exiting.")
            break

        if choice == "all":
            for opt_key, opt_value in options.items():
                if opt_value != "all":
                    generate_sample(opt_value)
                    click.echo(f"✅ Sample '{opt_value}' created.")
            continue

        if choice not in options or options[choice] == "all":
            click.echo("❌ Invalid option.")
            continue

        generate_sample(options[choice])
        click.echo(f"✅ Sample '{options[choice]}' created successfully.")
