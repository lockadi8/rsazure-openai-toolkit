from pathlib import Path
from rsazure_openai_toolkit.prompts.model import PromptData, PromptMetadata
from rsazure_openai_toolkit.prompts.agent import Agent


class BuiltInAgent(Agent):
    def __init__(self):
        self.name = "builtin"
        self.base_path = str(Path(".rsazure/prompts").resolve())
        self.system_prompt = "You are a helpful assistant."
        self.default_prompt = "default"
        self.model = "gpt-4o"
        self.temperature = 0.7
        self.max_tokens = 1024
        self.seed = 1

    def get_prompt(self, prompt_name: str = None) -> PromptData:
        metadata = PromptMetadata(
            name="default",
            version="1.0",
            description="Built-in fallback prompt",
            tags=["default", "builtin"],
            vars=["input"],
            system_prompt=self.system_prompt
        )
        return PromptData(metadata=metadata, body="{{input}}")

    def config_hash(self) -> str:
        return "builtin"

    def prompt_hash(self, prompt_name: str = None) -> str:
        return "builtin"
