# 🧠 ConverSession — The Core Orchestrator

`ConverSession` is the central coordination class in `rsazure-openai-toolkit`. It orchestrates interaction between modular components — such as prompts, agents, model config, session context, and logging.

It does **not** encapsulate logic or enforce dependencies — it simply coordinates execution in a secure, auditable way.

> Think of `ConverSession` as a **chessboard** or an **orchestra conductor**:  
> It doesn't define the pieces — it knows how they work together.

---

## 🎯 Purpose

- ✅ Provide a simple yet powerful entry point for users and scripts
- ✅ Centralize interaction between prompts, model config, logging, and context
- ✅ Ensure transparency and traceability for all executions
- ✅ Be extensible — works with or without optional features like logging/context

---

## 🧱 Components Used

| Component | Role |
|----------|------|
| `Agent` | Loads `config.yaml` and default `.rsmeta` prompt |
| `PromptManager` | Loads and renders prompts from disk |
| `PromptData` | Stores prompt metadata and body |
| `ModelConfig` | Defines generation parameters (temperature, tokens, etc.) |
| `SessionContext` (optional) | Manages persistent message history |
| `InteractionLogger` (optional) | Stores structured logs locally |

---

## ⚙️ Constructor Parameters

```python
ConverSession(
    agent: str,
    prompt: Optional[str] = None,
    prompt_vars: Optional[dict[str, str]] = None,
    session_id: Optional[str] = None,
    enable_context: bool = True,
    enable_logging: bool = True,
    overrides: Optional[dict] = None,
    prompt_path: Optional[str] = None,
)
```

- `agent`: Agent folder name (e.g. `"juridico"`)
- `prompt`: Optional prompt file (`.rsmeta`) to load
- `prompt_vars`: Variables to inject into the prompt (e.g. `{ "caso": "..." }`)
- `session_id`: Optional ID for context persistence
- `enable_context`: Enables `SessionContext`
- `enable_logging`: Enables local logging via `InteractionLogger`
- `overrides`: Overrides for model parameters (`temperature`, `max_tokens`, etc.)
- `prompt_path`: Root folder for agents/prompts (optional if in `.env`)

---

## 🔄 Internal Behavior

1. Loads the `Agent` and its config
2. Loads the specified or default `.rsmeta` prompt
3. Injects `prompt_vars` into the prompt body
4. Uses `system_prompt` from `.rsmeta` or fallback from `config.yaml`
5. Initializes optional `SessionContext` and `Logger`
6. Calls Azure OpenAI with constructed message sequence
7. Updates context and logs the result (if enabled)

---

## 🔐 Auditability & Safety

- ✅ `Agent` includes `config_hash()` and `prompt_hash()` for reproducibility
- ✅ `SessionContext` uses `.meta.json` to validate prompt/config usage
- ✅ `InteractionLogger` stores full metadata (prompt, model, tokens, time, etc.)
- ✅ All paths are explicit — no implicit directory assumptions

---

## ✅ Minimal Example

```python
from rsazure_openai_toolkit.conversession import ConverSession

session = ConverSession(
    agent="legal",                                                          # The agent name, likely representing a legal agent
    prompt="opinion",                                                       # The prompt to load (likely the legal opinion prompt)
    prompt_vars={"case": "Client requested an analysis of article 5..."},   # Variables to be injected into the prompt
    session_id="session-001",                                               # Unique session identifier
    enable_context=True,                                                    # Enables session context
    enable_logging=True                                                     # Enables logging of the session interactions
)

response = session.send()
print(response)
```

---

## ✨ Philosophy

> **ConverSession is the heart of the toolkit — without locking you in.**  
> It simplifies execution, enables traceability, and connects powerful components  
> — while respecting your control and architecture.

---

📚 See also:

- [Prompt Architecture](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/config.md)
- [Session Context](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/session_context.md)
- [Logging](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/logging.md)
- [CLI Usage](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/cli.md)
