from pathlib import Path
from jinja2 import Environment, FileSystemLoader


TEMPLATE_DIR = Path(__file__).parent / "templates"

env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))

def render_template(template_name: str, output_path: Path, use_stream: bool = False):
    template = env.get_template(template_name)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if use_stream:
        with output_path.open("w", encoding="utf-8") as f:
            template.stream().dump(f)
    else:
        output_path.write_text(template.render(), encoding="utf-8")


def generate_sample(option: str):
    output_dir = Path.cwd() / ".samples" / option

    if option == "basic-usage":
        render_template("basic_usage.py.j2", output_dir / "main.py")

    elif option == "advanced-usage":
        render_template("advanced_usage.py.j2", output_dir / "chat_loop.py")

    elif option == "env-usage":
        render_template("env_usage.py.j2", output_dir / "main.py", use_stream=True)
        render_template("env.example.j2", output_dir / ".env", use_stream=True)

    elif option == "env-advanced-usage":
        render_template("env_advanced_usage.py.j2", output_dir / "chat_loop.py", use_stream=True)
        render_template("env.example.j2", output_dir / ".env", use_stream=True)

    else:
        raise ValueError(f"Unsupported sample option: {option}")
