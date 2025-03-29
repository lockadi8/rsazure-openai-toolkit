from pathlib import Path
from jinja2 import Environment, FileSystemLoader


TEMPLATE_DIR = Path(__file__).parent / "templates"


def generate_sample(option: str):
    output_dir = Path.cwd() / "samples" / option
    output_dir.mkdir(parents=True, exist_ok=True)

    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))

    if option == "basic-usage":
        template = env.get_template("basic_usage.py.j2")
        (output_dir / "main.py").write_text(template.render())

    elif option == "advanced-usage":
        template = env.get_template("advanced_usage.py.j2")
        (output_dir / "chat_loop.py").write_text(template.render())

    elif option == "env-usage":
        env.get_template("env_usage.py.j2").stream().dump(output_dir / "main.py")
        env.get_template("env.example.j2").stream().dump(output_dir / ".env")

    elif option == "env-advanced-usage":
        env.get_template("env_advanced_usage.py.j2").stream().dump(output_dir / "chat_loop.py")
        env.get_template("env.example.j2").stream().dump(output_dir / ".env")

    else:
        raise ValueError(f"Unsupported sample option: {option}")
