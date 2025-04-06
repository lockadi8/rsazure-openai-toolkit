## 🚀 Key Features

This toolkit was designed with reliability, transparency, and real-world usage in mind:

- ✅ Modular architecture — fully structured by domain (`core/`, `cli/`, `env/`, `session/`, `logging/`, etc.), with clean separation of concerns and low coupling
- ✅ CLI-first design — `rschat` and `rschat-tools` are powered by `ChatCLI` and `ToolsCLI` classes for clean, extensible logic
- ✅ Intelligent retry mechanism — robust error handling with exponential backoff (via `tenacity`)
- ✅ Session context persistence — configurable memory window with full history storage (`.full.jsonl`) and safe prompt/config validation (`.meta.json` with backups)
- ✅ Reproducible outputs — deterministic generation via `seed`, powered by `ModelConfig`
- ✅ Config utilities — includes `get_model_config()`, `ModelConfig`, and tokenizer-aware input token estimation
- ✅ Transparent logging — opt-in interaction logging via `InteractionLogger`, supporting both `jsonl` and `csv` formats
- ✅ Smart token tracking — full visibility into input, output, and total tokens (with estimation fallback)
- ✅ Designed for testability — object-oriented CLI, consistent outputs, and reusable components across scripts and pipelines
- ✅ Secure by design — no telemetry, no external data sent, no hidden state or magic behaviors
- ✅ Production-ready — suitable for professional, CI/CD-integrated, and auditable environments
