import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from rsazure_openai_toolkit.utils import estimate_input_tokens
from rsazure_openai_toolkit.models import ContextInfo
from rsazure_openai_toolkit.env import get_context_config

class SessionContext:
    def __init__(
        self,
        session_id: str = "default",
        max_messages: Optional[int] = None,
        max_tokens: Optional[int] = None,
        deployment_name: Optional[str] = None,
        system_prompt: Optional[str] = None,
        storage_path: Optional[str] = None,
        strict_system: bool = True
    ):
        self.session_id = session_id
        self.max_messages = None if max_messages == 0 else max_messages
        self.max_tokens = None if max_tokens == 0 else max_tokens
        self.deployment_name = deployment_name

        base_dir = Path(storage_path).expanduser() if storage_path else Path(".rsazure/session").expanduser()
        base_dir.mkdir(parents=True, exist_ok=True)
        self._file_path = base_dir / f"{session_id}.jsonl"
        self._meta_path = base_dir / f"{session_id}.meta.json"
        self._full_path = base_dir / f"{session_id}.full.jsonl"

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
                "created_at": datetime.now(timezone.utc).isoformat(),
                "deployment_name": self.deployment_name,
                "max_messages": self.max_messages,
                "max_tokens": self.max_tokens
            }
            self._meta_path.write_text(json.dumps(meta, indent=2))
            return incoming

        saved = json.loads(self._meta_path.read_text())
        saved_prompt = saved.get("system_prompt", "").strip()
        incoming = (incoming or "").strip()

        # Protege contra sobrescrita desnecessária em modo estrito
        skip_override = strict and incoming == saved_prompt

        if skip_override:
            print("ℹ️ Prompt unchanged. Skipping override and backup.")

        if incoming != saved_prompt:
            print("⚠️  System prompt mismatch detected!")
            print(f"🧠 Saved:    \"{saved_prompt}\"\n🆕 Provided: \"{incoming}\"")

            if strict:
                print("🔒 Enforcing saved prompt (strict mode).")
            elif not skip_override:
                print("✏️  Overriding saved prompt (non-strict mode).")
                self._backup_meta_file()
                saved["system_prompt"] = incoming
                saved["updated_at"] = datetime.now(timezone.utc).isoformat()
                self._meta_path.write_text(json.dumps(saved, indent=2))

        # Verificar consistência de configuração
        mismatch = []
        if saved.get("max_messages") != self.max_messages:
            mismatch.append(f"max_messages: saved={saved.get('max_messages')} current={self.max_messages}")
        if saved.get("max_tokens") != self.max_tokens:
            mismatch.append(f"max_tokens: saved={saved.get('max_tokens')} current={self.max_tokens}")
        if saved.get("deployment_name") != self.deployment_name:
            mismatch.append(f"deployment: saved={saved.get('deployment_name')} current={self.deployment_name}")

        if mismatch:
            print("⚠️ Context config mismatch:")
            for item in mismatch:
                print(f"  ⚙️ {item}")
        
        if mismatch and not strict:
            print("📝 Updating configuration in meta file (non-strict mode).")
            self._backup_meta_file()
            saved["deployment_name"] = self.deployment_name
            saved["max_messages"] = self.max_messages
            saved["max_tokens"] = self.max_tokens
            saved["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._meta_path.write_text(json.dumps(saved, indent=2))

        return saved.get("system_prompt") or incoming

    def save(self):
        with self._file_path.open("w", encoding="utf-8") as f:
            for msg in self.messages:
                f.write(json.dumps(msg, ensure_ascii=False) + "\n")

    def _append_to_full_history(self, msg: dict):
        with self._full_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(msg, ensure_ascii=False) + "\n")

    def add(self, role: str, content: str):
        msg = {"role": role, "content": content}
        self.messages.append(msg)
        self._append_to_full_history(msg)
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
        before = len(self.messages)

        if self.max_messages is not None:
            self.messages = self.messages[-self.max_messages:]

        if self.max_tokens is not None:
            while estimate_input_tokens(messages=self.messages, deployment_name=self.deployment_name) > self.max_tokens and len(self.messages) > 1:
                self.messages.pop(0)

        after = len(self.messages)
        if after < before:
            print(f"🔁 Context trimmed: {before - after} message(s) removed to fit limits")
    
    def _backup_meta_file(self):
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        backup_path = self._meta_path.with_name(f"{self._meta_path.stem}.bak-{timestamp}.json")
        if self._meta_path.exists():
            backup_path.write_text(self._meta_path.read_text(), encoding="utf-8")
            print(f"📂 Backup created: {backup_path}")

    def __len__(self):
        return len(self.messages)

    def __str__(self):
        return f"<SessionContext id='{self.session_id}' messages={len(self.messages)} max_messages={self.max_messages} max_tokens={self.max_tokens}>"

    def to_json(self) -> str:
        return json.dumps(self.messages, indent=2, ensure_ascii=False)


def get_context_messages(
    user_input: str,
    system_prompt: Optional[str] = None,
    deployment_name: Optional[str] = None,
    use_context: Optional[bool] = None,
    session_id: Optional[str] = None,
    max_messages: Optional[int] = None,
    max_tokens: Optional[int] = None
) -> dict:
    """
    Returns a dict with 'messages', 'context' and 'context_info'.
    Automatically loads values from environment config if not provided.
    """
    cfg = get_context_config()

    use_context = use_context if use_context is not None else cfg["use_context"]
    session_id = session_id or cfg["session_id"]
    deployment_name = deployment_name or "gpt-3.5-turbo"
    system_prompt = system_prompt or cfg["system_prompt"] if "system_prompt" in cfg else "You are a helpful assistant."
    max_messages = max_messages if max_messages is not None else cfg["max_messages"]
    max_tokens = max_tokens if max_tokens is not None else cfg["max_tokens"]
    strict = not cfg["override_system"]

    if not use_context:
        return {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            "context": None,
            "context_info": None
        }

    context = SessionContext(
        session_id=session_id,
        max_messages=max_messages,
        max_tokens=max_tokens,
        deployment_name=deployment_name,
        system_prompt=system_prompt,
        storage_path=cfg["context_path"],
        strict_system=strict
    )
    context.add("user", user_input)

    context_info = ContextInfo(
        session_id=session_id,
        num_previous=len(context.messages) - 1 if context.messages else 0,
        total_messages=len(context),
        system_prompt=context.system_prompt
    )

    return {
        "messages": context.get(),
        "context": context,
        "context_info": context_info
    }
