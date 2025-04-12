from dataclasses import dataclass
from typing import List, Optional


@dataclass
class PromptMetadata:
    name: str
    version: str
    description: str
    tags: List[str]
    vars: List[str]
    system_prompt: Optional[str] = None


@dataclass
class PromptData:
    metadata: PromptMetadata
    body: str

    def render(self, prompt_vars: dict[str, str]) -> str:
        """
        Renders the body of the prompt by replacing the declared variables.
        """
        for key in self.metadata.vars:
            if key not in prompt_vars:
                raise ValueError(f"Missing required variable: {key}")
        result = self.body
        for key, value in prompt_vars.items():
            result = result.replace(f"{{{{{key}}}}}", value)
        return result
