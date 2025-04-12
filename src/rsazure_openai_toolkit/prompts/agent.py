from pathlib import Path
import hashlib
import yaml

from rsazure_openai_toolkit.prompts.manager import PromptManager
from rsazure_openai_toolkit.prompts.model import PromptData


class Agent:
    def __init__(self, agent_name: str, base_path: Path):
        """
        Represents an execution agent (model + prompt + parameters).
        Requires an explicit base_path to avoid dependence on conventions.

        Args:
            agent_name (str): Name of the agent's folder
            base_path (Path): Base path where agents are located (e.g., Path("prompts/"))
        """
        if not base_path.is_dir():
            raise ValueError(f"Invalid prompt base path: {base_path}")

        self.name = agent_name
        self.base_path = base_path
        self.agent_path = self.base_path / agent_name

        self.config = self._load_config()
        self.default_prompt = self.config.get("default_prompt", "default")
        self.system_prompt = self.config.get("system_prompt", "")
        self.model = self.config.get("model", "gpt-4")
        self.temperature = self.config.get("temperature", 0.7)
        self.max_tokens = self.config.get("max_tokens", 1024)
        self.seed = self.config.get("seed", 1)

        self.prompt_manager = PromptManager(base_path=self.base_path)

    def _load_config(self) -> dict:
        path = self.agent_path / "config.yaml"
        if not path.exists():
            raise FileNotFoundError(f"Missing config.yaml for agent '{self.name}'")
        return yaml.safe_load(path.read_text(encoding="utf-8"))

    def get_prompt(self, prompt_name: str) -> PromptData:
        """
        Returns a loaded PromptData via PromptManager, based on the prompt name.
        Uses the current agent's name as a folder prefix.
        """
        return self.prompt_manager.load_prompt(self.name, prompt_name)

    def compute_hash(self, file_path: Path) -> str:
        """
        Computes a SHA-256 hash for auditing purposes.
        """
        if not file_path.exists():
            return ""
        content = file_path.read_bytes()
        return hashlib.sha256(content).hexdigest()

    def prompt_hash(self, prompt_name: str = None) -> str:
        prompt_file = self.agent_path / f"{(prompt_name or self.default_prompt)}.rsmeta"
        return self.compute_hash(prompt_file)

    def config_hash(self) -> str:
        return self.compute_hash(self.agent_path / "config.yaml")

    def to_dict(self) -> dict:
        return {
            "agent": self.name,
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "seed": self.seed,
            "default_prompt": self.default_prompt,
            "system_prompt": self.system_prompt,
            "config_hash": self.config_hash(),
            "prompt_hash": self.prompt_hash(),
        }

    def summary(self) -> str:
        return (
            f"🤖 Agent: {self.name}\n"
            f"🧠 Model: {self.model}\n"
            f"🔥 Temperature: {self.temperature}\n"
            f"📏 Max tokens: {self.max_tokens}\n"
            f"🎲 Seed: {self.seed}\n"
            f"📎 Prompt: {self.default_prompt}\n"
            f"🧾 Config hash: {self.config_hash()[:8]}...\n"
            f"🧾 Prompt hash: {self.prompt_hash()[:8]}...\n"
            f"💬 System prompt: \"{self.system_prompt.strip()[:80]}...\""
        )

    def describe(self) -> str:
        return yaml.dump(self.to_dict(), sort_keys=False, allow_unicode=True)
