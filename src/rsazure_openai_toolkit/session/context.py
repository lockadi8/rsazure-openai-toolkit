import os
import json
from pathlib import Path
from datetime import datetime
from typing import Optional
from rsazure_openai_toolkit.utils.token_utils import estimate_input_tokens


class SessionContext:
    def __init__(
        self,
        session_id: str = "default",
        max_messages: Optional[int] = None,
        max_tokens: Optional[int] = None,
        deployment_name: Optional[str] = "gpt-4o",
        system_prompt: Optional[str] = None,
        storage_path: Optional[str] = None,
        strict_system: bool = True
    ):
        self.session_id = session_id
        self.max_messages = max_messages
        self.max_tokens = max_tokens
        self.deployment_name = deployment_name

        base_dir = Path(storage_path or os.getenv("RSCHAT_CONTEXT_PATH", "~/.rschat_history")).expanduser()
        base_dir.mkdir(parents=True, exist_ok=True)
        self._file_path = base_dir / f"{session_id}.jsonl"
        self._meta_path = base_dir / f"{session_id}.meta.json"

        self.messages: list[dict] = self._load_messages()
        self.system_prompt = self._handle_system_prompt(system_prompt, strict_system)

    def _load_messages(self):
        if not self._file_path.exists():
            return []
        with self._file_path.open("r", encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]

    def _handle_system_prompt(self, incoming: Optional[str], strict: bool) -> Optional[str]:
        if not self._meta_path.exists():
            meta = {
                "system_prompt": incoming or "",
                "created_at": datetime.utcnow().isoformat()
            }
            self._meta_path.write_text(json.dumps(meta, indent=2))
            return incoming

        saved = json.loads(self._meta_path.read_text())
        saved_prompt = saved.get("system_prompt", "").strip()
        incoming = (incoming or "").strip()

        if incoming != saved_prompt:
            print("⚠️  System prompt mismatch detected!")
            print(f"🧠 Saved:    \"{saved_prompt}\"\n🆕 Provided: \"{incoming}\"")

            if strict:
                print("🔒 Enforcing saved prompt (strict mode).")
                return saved_prompt
            else:
                print("✏️  Overriding saved prompt (non-strict mode).")
                self._meta_path.write_text(json.dumps({
                    "system_prompt": incoming,
                    "updated_at": datetime.utcnow().isoformat()
                }, indent=2))
                return incoming

        return saved_prompt or incoming

    def save(self):
        with self._file_path.open("w", encoding="utf-8") as f:
            for msg in self.messages:
                f.write(json.dumps(msg, ensure_ascii=False) + "\n")

    def add(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})
        self._trim()

    def get(self, system_prompt: Optional[str] = None) -> list[dict]:
        prompt = system_prompt or self.system_prompt
        return [{"role": "system", "content": prompt}] + self.messages if prompt else list(self.messages)

    def reset(self):
        self.messages.clear()
        if self._file_path.exists():
            self._file_path.unlink()

    def remove(self, index: Optional[int] = None):
        if not self.messages:
            return
        if index is None:
            self.messages.pop()
        elif 0 <= index < len(self.messages):
            self.messages.pop(index)
        else:
            raise IndexError(f"Invalid index: {index}. Valid range: 0 to {len(self.messages) - 1}")

    def _trim(self):
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
        return json.dumps(self.messages, indent=2, ensure_ascii=False)


def get_context_messages(
    user_input: str,
    system_prompt: Optional[str],
    deployment_name: str,
    use_context: bool = False,
    session_id: str = "default",
    max_messages: Optional[int] = None,
    max_tokens: Optional[int] = None
) -> dict:
    """
    Returns a dict with 'messages' and 'context'.
    """
    if not use_context:
        return {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            "context": None
        }

    strict = os.getenv("RSCHAT_OVERRIDE_SYSTEM", "0") != "1"

    context = SessionContext(
        session_id=session_id,
        max_messages=max_messages,
        max_tokens=max_tokens,
        deployment_name=deployment_name,
        system_prompt=system_prompt,
        strict_system=strict
    )
    context.add("user", user_input)

    return {"messages": context.get(), "context": context}
