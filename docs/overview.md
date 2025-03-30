## ❓ Why This Project?

There are many tools for interacting with OpenAI — but most are either too simplistic for real-world use, or too complex and tightly coupled to specific platforms.

This project was born out of the need for something in between:

- 🔍 Transparent and auditable — no magic, no vendor lock-in
- ⚙️ Flexible — can be used in scripts, production systems, or CI/CD pipelines
- 🧩 Modular — easy to extend or integrate with other workflows
- 🧠 Smart — includes retry logic, environment handling, and a developer-friendly CLI
- 🧪 Lightweight — zero dependencies beyond what’s needed, no bloat

Whether you're prototyping locally or running critical flows in production, this toolkit helps you do it **faster, safer, and with full control**.

> Built by an engineer with real-world experience in AI, cloud, and software systems — to solve real developer problems.
___

## 🧠 Design Principles

These principles define how this toolkit is designed, maintained, and expected to be used — prioritizing security, clarity, and real-world applicability:

- **Security first**: No telemetry, no hidden dependencies, and full code transparency — always auditable and verifiable.
- **Simplicity over complexity**: A minimal, no-friction interface that works out-of-the-box without overwhelming configuration.
- **Production-readiness**: Built with reliability in mind — includes retry logic, CLI validation, and clear error handling.
- **Explicit over implicit**: All configurations are visible and controlled; no surprises behind the scenes.
- **Extendable by design**: Modular and adaptable for integration into larger systems and workflows.
- **Developer & team friendly**: Works great for individuals, but also for teams needing reproducibility and onboarding ease.

> These principles are not just technical choices — they're part of a commitment to making this toolkit secure, stable, and genuinely useful in professional environments.
___

## 🔐 Security

Security is a core pillar of this project — not an afterthought.

- ✅ All code is fully open, auditable, and free from telemetry or tracking
- ✅ No data is ever sent externally — all logic executes locally and transparently
- ✅ Direct pushes and unreviewed merges are blocked by default via GitHub branch protection
- ✅ Releases are manually reviewed and published by the maintainer

If you discover any security vulnerabilities or have concerns:

- 📧 Please report privately to [renan.siqu@gmail.com](mailto:renan.siqu@gmail.com)
- 🔍 See the full [SECURITY policy on GitHub](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/SECURITY.md).


> This project follows responsible disclosure practices. Thank you for helping keep the ecosystem secure.
