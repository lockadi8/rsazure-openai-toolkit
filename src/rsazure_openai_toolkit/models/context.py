from dataclasses import dataclass


@dataclass
class ContextInfo:
    session_id: str
    num_previous: int
    total_messages: int
    system_prompt: str

    def summary(self) -> str:
        return (
            f"📚 Loaded context: {self.num_previous} previous message(s)\n"
            f"➕ Added user input\n"
            f"📦 Total now: {self.total_messages} message(s)\n"
            f"🔐 System prompt in use: \"{self.system_prompt}\""
        )
