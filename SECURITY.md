# 🔐 Security Policy

This document outlines the security model, access policies, and best practices for the `rsazure-openai-toolkit` project.
___

## 👤 Maintainer Control & Branch Protection

This repository is maintained solely by the project owner.

- Direct pushes to any branch are restricted
- Only the maintainer can merge changes
- All releases are manually reviewed and published

This guarantees that all published code is intentional, verifiable, and secure.
___

## ✅ Security Best Practices

While this project does not handle user credentials or transmit data externally, it is recommended that:

- You never expose API keys in source code
- Environment variables are used to manage secrets
- You follow the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege) when configuring Azure OpenAI

> 💡 If you’re working in a shared or production machine, avoid enabling context or logging unless you fully control access to disk and history files.
___

## 📝 Logging and Local Data

This toolkit supports **opt-in local logging** to assist with debugging and cost tracking. When enabled via environment variables, the following data may be saved locally:

- Prompts and responses
- Token usage
- Response time
- Model configuration (including seed)

Logging is handled via the `InteractionLogger.log()` method, which stores structured metadata locally.  
The `SessionContext` and `ContextInfo` classes are responsible for storing and validating conversation state — always under user control.

### Important:

- Logging is **disabled by default**
- All data is saved **locally on disk**, never transmitted
- You are responsible for protecting local logs — especially in shared environments

> Configure logging via `RSCHAT_LOG_MODE` and `RSCHAT_LOG_PATH` environment variables.
___

### 🔄 Session Context Persistence (since v0.5.0)

This toolkit supports optional **context persistence** via `SessionContext`, which stores your conversation history on disk (when enabled).

- Context files are saved locally as `.jsonl` and `.meta.json`
- Includes message history, system prompt, and model configuration
- All context storage is **opt-in**, triggered via environment variables
- Full history is saved to a separate `.full.jsonl` file, even if context is trimmed
- Metadata changes (e.g., prompt overrides) are automatically backed up with timestamped `.bak` files

> ⚠️ Use with care on shared machines. Avoid using sensitive data in prompts or responses if local storage is enabled.
___

## 🔍 Trusted Orchestration via ConverSession

The `ConverSession` class acts as the central, auditable coordinator of your conversation flows.

- It explicitly loads the `Agent`, prompt, `ModelConfig`, `SessionContext`, and logger
- All components are opt-in and independently testable
- `Agent` enforces reproducibility via SHA-256 hashes of config and `.rsmeta` files
- System prompts are traceable and validated against expected structure

> Learn more in the [ConverSession Documentation](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/conversession.md)
___

## 🔐 Security-minded Architecture

The modular design of this toolkit (since v0.6.0) reinforces its commitment to safe, auditable, and professional AI integration:

- No shared state or global mutability across modules
- Clear separation of concerns (e.g., `env`, `logging`, `prompts`, `session`, `conversession`)
- CLI and utility components validate inputs explicitly and fail gracefully
- Configuration and history are saved locally with full user control
- All public interfaces (`rschat`, `main()`, `get_model_config()`, etc.) are explicit and do not hide behavior
- Logging and context logic are fully decoupled, testable, and can be disabled independently

✅ This toolkit was designed with **security-first principles** — and we encourage audits, forks, and community validation.
___

## 🧱 Threat Model & Attack Surface

This toolkit is a **local-only**, client-side tool:

- No backend services, API gateways, or telemetry endpoints are used
- All data remains on disk and under user control
- The only outbound request is made by the Azure OpenAI SDK to your own configured endpoint

This greatly reduces the attack surface and simplifies threat modeling.
___

## 📣 Reporting a Vulnerability

If you discover a potential security issue in this project, please **report it responsibly**:

- Open a [GitHub Issue](https://github.com/renan-siqueira/rsazure-openai-toolkit/issues), or  
- Email directly: [renan.siqu@gmail.com](mailto:renan.siqu@gmail.com)

You will receive a response as soon as possible. Please **avoid disclosing vulnerabilities publicly** before they are resolved.
___

## 🔒 Security Notes

- This toolkit **does not collect or send any data externally**
- All logic is executed **locally** and transparently — feel free to audit the code
- No telemetry, analytics, or external logging mechanisms are used
___

## 🤝 Responsible Use

This project is open source and shared in the spirit of collaboration.  
Please use it ethically and contribute improvements or fixes whenever possible.

Thank you for helping keep the open source ecosystem safe!
