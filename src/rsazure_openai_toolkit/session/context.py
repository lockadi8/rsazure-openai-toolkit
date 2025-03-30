# src/rsazure_openai_toolkit/session/context.py

import json
from typing import Optional
from rsazure_openai_toolkit.utils.token_utils import estimate_input_tokens


class SessionContext:
    """
    Lightweight context manager for building messages[] used in Azure OpenAI calls.
    Automatically trims old messages based on message or token limits.
    """

    def __init__(
        self,
        session_id: str = "default",
        max_messages: Optional[int] = None,
        max_tokens: Optional[int] = None,
        deployment_name: Optional[str] = "gpt-4o"
    ):
        self.session_id = session_id
        self.max_messages = max_messages
        self.max_tokens = max_tokens
        self.deployment_name = deployment_name
        self.messages: list[dict] = []

    def add(self, role: str, content: str):
        """Add a new message to the context."""
        self.messages.append({"role": role, "content": content})
        self._trim()

    def get(self, system_prompt: Optional[str] = None) -> list[dict]:
        """Return the full context message list, optionally with a system prompt prepended."""
        if system_prompt:
            return [{"role": "system", "content": system_prompt}] + self.messages
        return list(self.messages)

    def reset(self):
        """Clear the current context."""
        self.messages.clear()
    
    def remove(self, index: Optional[int] = None):
        """
        Remove a message from the context.
        
        - If no index is given, removes the last message.
        - If index is given, removes the message at that index.
        """
        if not self.messages:
            return

        if index is None:
            self.messages.pop()
        else:
            if index < 0 or index >= len(self.messages):
                raise IndexError(f"Invalid index: {index}. Valid range: 0 to {len(self.messages) - 1}")
            self.messages.pop(index)

    def _trim(self):
        """Enforce message or token limits by trimming old entries."""
        if self.max_messages is not None:
            self.messages = self.messages[-self.max_messages:]

        if self.max_tokens is not None:
            while estimate_input_tokens(self.messages, self.deployment_name) > self.max_tokens and len(self.messages) > 1:
                self.messages.pop(0)

    def __len__(self):
        return len(self.messages)

    def __str__(self):
        return f"<SessionContext id='{self.session_id}' messages={len(self.messages)} max_messages={self.max_messages} max_tokens={self.max_tokens}>"


    def to_json(self) -> str:
        """Export current messages as JSON (optional for debug/export)."""
        return json.dumps(self.messages, indent=2, ensure_ascii=False)


def get_context_messages(
    user_input: str,
    system_prompt: Optional[str],
    deployment_name: str,
    use_context: bool = False,
    session_id: str = "default",
    max_messages: Optional[int] = None,
    max_tokens: Optional[int] = None
) -> list[dict]:
    """
    Build the message list to be sent to the model, optionally using SessionContext.

    Parameters:
        user_input (str): User's input/question.
        system_prompt (str | None): Optional system prompt to guide the assistant.
        deployment_name (str): Azure deployment name (used for tokenizer logic).
        use_context (bool): Whether to use SessionContext or not.
        session_id (str): Optional session identifier (default: "default").
        max_messages (int | None): Limit number of messages in context.
        max_tokens (int | None): Limit total token budget for context.

    Returns:
        list[dict]: Final message list (system + user + optional history).
    """
    if not use_context:
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ]

    context = SessionContext(
        session_id=session_id,
        max_messages=max_messages,
        max_tokens=max_tokens,
        deployment_name=deployment_name
    )
    context.add("user", user_input)
    return context.get(system_prompt)
