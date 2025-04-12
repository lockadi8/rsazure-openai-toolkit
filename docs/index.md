# 🧰 rsazure-openai-toolkit

A fast, secure, and auditable toolkit to integrate with Azure OpenAI — with a friendly CLI and dev-first architecture.

Whether you're prototyping locally or running production workloads, this toolkit helps you do it **faster, safer, and with full control**.

---

## ❓ Why This Project?

Most OpenAI toolkits are either too simplistic for real-world use, or too complex and vendor-locked. This project was born out of a need for something in between:

- 🔍 Transparent and auditable — no magic, no vendor lock-in
- ⚙️ Flexible — usable in scripts, pipelines, or production environments
- 🧩 Modular — easy to extend, test, and maintain
- 🧠 Smart — includes retry logic, environment handling, and reusable model config
- 🧪 Lightweight — only essential dependencies, no bloat

> Built by an engineer with real-world experience in AI, cloud, and systems — to solve real developer problems.

---

## 🚀 Key Features

This toolkit is designed with **reliability**, **transparency**, and **auditability** in mind:

- ✅ **Modular architecture** — structured by domain (`cli/`, `core/`, `session/`, `logging/`, etc.)
- ✅ **CLI-first design** — `rschat` and `rschat-tools` ready for scripting or pipelines
- ✅ **Session persistence** — via `SessionContext` with `.jsonl` history and `.meta.json` validation
- ✅ **Prompt system** — versioned `.rsmeta` prompts with safe variable injection
- ✅ **Deterministic output** — through `ModelConfig` and reproducible seeds
- ✅ **Smart token tracking** — with tokenizer-aware estimation and usage introspection
- ✅ **Structured logging** — via `InteractionLogger` (supports `jsonl` and `csv`)
- ✅ **No telemetry** — all execution is local, safe, and private
- ✅ **Testable & clean** — ideal for teams and CI/CD integrations
- ✅ **Production-ready** — can be embedded into automated or mission-critical workflows

---

## 🧠 Design Principles

These principles guide every architectural decision:

- **Security first**: No telemetry, no hidden dependencies, fully auditable
- **Explicit over implicit**: All config is visible, traceable, and overrideable
- **Simplicity over complexity**: Defaults that work, extensibility when needed
- **Developer & team friendly**: Clear structure, reproducible flows, onboarding-ready
- **Minimal but complete**: Only what you need to work well with Azure OpenAI
- **Modular and isolated**: Every part has a clear purpose and boundary

---

## 🔐 Security

Security is a core pillar — not an afterthought.

- ✅ All code is fully open and transparent
- ✅ No data ever leaves your machine — logs and context are local-only
- ✅ Metadata and prompt history are safely backed up
- ✅ Direct pushes and unreviewed merges are blocked
- ✅ Releases are manually reviewed and tagged

📫 If you find a vulnerability, please report it privately to  
[renan.siqu@gmail.com](mailto:renan.siqu@gmail.com)

🔒 See the [SECURITY.md](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/SECURITY.md) for details.

---

## 📦 What's Included

| Component | Description |
|-----------|-------------|
| `rschat` | Main CLI interface for interacting with OpenAI models |
| `rschat-tools` | Developer CLI for generating samples and managing agents |
| `ConverSession` | High-level orchestration class for running prompt-based conversations |
| `Agent` | Loads and validates model config and `.rsmeta` prompt definitions |
| `SessionContext` | Manages persistent context across messages |
| `ModelConfig` | Handles model temperature, max tokens, and reproducibility |
| `InteractionLogger` | Structured, local-only logging system |
| `.j2` Templates | Sample Python scripts with CLI + `.env` integration |

---

> Ready to start? See the [Quick Start](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/quick_start.md).
