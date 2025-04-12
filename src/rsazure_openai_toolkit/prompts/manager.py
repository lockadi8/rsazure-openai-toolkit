from pathlib import Path
import yaml
from rsazure_openai_toolkit.prompts.model import PromptMetadata, PromptData


class PromptManager:
    def __init__(self, base_path: Path = Path("prompts/")):
        self.base_path = base_path

    def load_prompt(self, agent: str, name: str) -> PromptData:
        """
        Loads and validates a .rsmeta prompt within the agent's folder.
        """
        file_path = self.base_path / agent / f"{name}.rsmeta"
        if not file_path.exists():
            raise FileNotFoundError(f"Prompt not found: {file_path}")

        with file_path.open("r", encoding="utf-8") as f:
            content = f.read()

        # Split content by delimiters --- (expects 2 parts: YAML + body)
        parts = content.strip().split("---", 2)
        if len(parts) < 3:
            raise ValueError(f"Invalid .rsmeta format in {file_path}")

        frontmatter = yaml.safe_load(parts[1].strip())
        metadata = PromptMetadata(**frontmatter)
        body = parts[2].strip()

        return PromptData(metadata=metadata, body=body)
