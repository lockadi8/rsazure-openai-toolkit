from dataclasses import dataclass
from typing import Optional, Any


@dataclass
class ChatResult:
    question: str
    response_text: str
    system_prompt: str
    model: str
    seed: Optional[int]
    input_tokens: int
    output_tokens: int
    total_tokens: int
    elapsed_time: float
    model_config: dict
    raw_response: Any

    def print(self):
        from click import echo
        echo(f"\n\nAssistant:\n\n{self.response_text}")
        echo("\n\n----- REQUEST INFO -----")
        echo(f"📤 Input tokens: {self.input_tokens}")
        echo(f"📥 Output tokens: {self.output_tokens}")
        echo(f"📟 Total tokens: {self.total_tokens}")
        echo(f"🧠 Model: {self.model}")
        echo(f"🎲 Seed: {self.seed}")
        echo(f"⏱️ Time: {self.elapsed_time}s\n")

    def to_log_dict(self) -> dict:
        return {
            "question": self.question,
            "response": self.response_text,
            "system_prompt": self.system_prompt,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "elapsed_time": self.elapsed_time,
            "model": self.model,
            "seed": self.seed,
            "model_config": self.model_config,
            "raw_response": self.raw_response,
        }
