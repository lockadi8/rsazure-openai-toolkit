# Session Context

The `SessionContext` provides intelligent and flexible conversation memory management for interactions with Azure OpenAI. It enables persistent history, context trimming, system prompt consistency, and optional overrides — all while maintaining ease of use.

---

## Features

- ✅ Persistent conversation context across CLI calls
- ✅ Configurable message or token limits
- ✅ Full history stored separately from trimmed context
- ✅ System prompt consistency enforcement
- ✅ Optional override of metadata with backups
- ✅ Transparent integration with CLI or programmatic use

---

## Files Created

Each session creates files in the path defined by `RSCHAT_CONTEXT_PATH` (default: `~/.rschat_history`):

- `session_id.jsonl`: active context (with limits)
- `session_id.full.jsonl`: full conversation history (no trimming)
- `session_id.meta.json`: metadata with prompt and config
- `session_id.meta.bak-<timestamp>.json`: backups of previous metadata

---

## CLI Usage

To enable context features via CLI:

```bash
RSCHAT_USE_CONTEXT=1 \
RSCHAT_SESSION_ID=my_session \
RSCHAT_CONTEXT_MAX_MESSAGES=10 \
RSCHAT_CONTEXT_MAX_TOKENS=1500 \
rschat "What is the capital of France?"
```

Optional variables:

- `RSCHAT_OVERRIDE_SYSTEM=1` – allows overwriting saved system prompt and config
- `RSCHAT_CONTEXT_PATH=/custom/path` – sets where session files are stored

---

## Behavior

### System Prompt Consistency

- The system prompt used in a session is saved to `meta.json`
- If you run a new command with a different prompt:
  - In strict mode (default), the saved prompt is enforced
  - If `RSCHAT_OVERRIDE_SYSTEM=1` is set, the new prompt is saved and a backup is created

### Config Mismatch

- If your current config (tokens, messages, deployment) differs from the saved metadata:
  - A warning is displayed
  - If `RSCHAT_OVERRIDE_SYSTEM=1`, config is updated and backup is created

### Trimming

When limits are exceeded, the context is trimmed automatically:

```text
🔁 Context trimmed: 2 message(s) removed to fit limits
```

This does not affect the `.full.jsonl` file — your entire conversation is always preserved there.

---

## CLI Example Output

```text
📚 Loaded context: 4 previous message(s)
➕ Added user input
📦 Total now: 5 message(s)
🔐 System prompt in use: "You are a helpful assistant."
```

```text
⚠️  System prompt mismatch detected!
🧠 Saved:    "You are a legal assistant."
🆕 Provided: "You are a happy assistant."
🔒 Enforcing saved prompt (strict mode).
```

```text
⚠️ Context config mismatch:
  ⚙️ max_messages: saved=5 current=10
📝 Updating configuration in meta file (non-strict mode).
📂 Backup created: session.meta.bak-20250330T184501.json
```

---

## Programmatic Use

```python
from rsazure_openai_toolkit.session.context import SessionContext

ctx = SessionContext(session_id="my_sess", max_messages=5)
ctx.add("user", "Hello")
ctx.add("assistant", "Hi there!")
ctx.save()

print(ctx.get())
```

---

## Environment Variables

| Variable                     | Description                                          |
|------------------------------|------------------------------------------------------|
| `RSCHAT_USE_CONTEXT`         | Enable context session (set to "1" to activate)      |
| `RSCHAT_SESSION_ID`          | Unique ID for the session                            |
| `RSCHAT_CONTEXT_MAX_MESSAGES`| Max messages to retain in active context             |
| `RSCHAT_CONTEXT_MAX_TOKENS`  | Max tokens allowed in active context                 |
| `RSCHAT_OVERRIDE_SYSTEM`     | Allow system prompt/config override with backup      |
| `RSCHAT_CONTEXT_PATH`        | Custom directory for session files                   |
