<p align="left">
  <!-- 📦 PyPI -->
  <a href="https://pypi.org/project/rsazure-openai-toolkit/">
    <img src="https://img.shields.io/pypi/v/rsazure-openai-toolkit" alt="PyPI Version" />
  </a>
  <a href="https://pypi.org/project/rsazure-openai-toolkit/">
    <img src="https://img.shields.io/pypi/dm/rsazure-openai-toolkit" alt="PyPI Downloads" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/tags">
    <img src="https://img.shields.io/github/v/tag/renan-siqueira/rsazure-openai-toolkit" alt="GitHub Tag" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/renan-siqueira/rsazure-openai-toolkit" alt="License" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit">
    <img src="https://img.shields.io/github/repo-size/renan-siqueira/rsazure-openai-toolkit" alt="Repo Size" />
  </a>
  <img src="https://img.shields.io/badge/python-3.11-blue" alt="Python Version" />
</p>

<p align="left">
  <!-- 🔧 GitHub / CI -->
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/commits/main">
    <img src="https://img.shields.io/github/last-commit/renan-siqueira/rsazure-openai-toolkit" alt="Last Commit" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/graphs/commit-activity">
    <img src="https://img.shields.io/github/commit-activity/m/renan-siqueira/rsazure-openai-toolkit" alt="Commits Per Month" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/actions/workflows/python-ci.yml">
    <img src="https://github.com/renan-siqueira/rsazure-openai-toolkit/actions/workflows/python-ci.yml/badge.svg" alt="Build Status" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/security">
    <img src="https://img.shields.io/badge/security-scanned-green" alt="Security Scan" />
  </a>
</p>

<p align="left">
  <!-- 👥 Comunidade -->
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/stargazers">
    <img src="https://img.shields.io/github/stars/renan-siqueira/rsazure-openai-toolkit" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/renan-siqueira/rsazure-openai-toolkit" alt="Contributors" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/issues">
    <img src="https://img.shields.io/github/issues/renan-siqueira/rsazure-openai-toolkit" alt="Open Issues" />
  </a>
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/pulls">
    <img src="https://img.shields.io/github/issues-pr/renan-siqueira/rsazure-openai-toolkit" alt="Open PRs" />
  </a>
</p>

<p align="left">
  <!-- 🙋‍♂️ Author -->
  <a href="https://github.com/renan-siqueira">
    <img src="https://img.shields.io/badge/author-Renan%20Siqueira%20Antonio-blue" alt="Author" />
  </a>
  <a href="https://www.linkedin.com/in/renan-siqueira-antonio/">
    <img src="https://img.shields.io/badge/linkedin-@renan--siqueira--antonio-blue?logo=linkedin" alt="LinkedIn" />
  </a>
</p>

___

# [rsazure-openai-toolkit](https://pypi.org/project/rsazure-openai-toolkit/)


A lightweight, independent toolkit (with CLI support) to simplify and accelerate integration with Azure OpenAI.
___

## 📚 Contents
- [Why This Project?](#-why-this-project)
- [Design Principles](#-design-principles)
- [Features](#-features)
- [Security](#-security)
- [Requirements](#-requirements)
- [License](#-license)
- [Quick Start](#-quick-start)
- [Manual Setup](#-manual-setup-alternative)
- [Usage](#usage)
- [Environment Configuration](#environment-configuration)
- [CLI Usage (`rschat`)](#-cli-usage-rschat)
- [Developer Tools (`rschat-tools`)](#-developer-tools-rschat-tools)
- [Possible Issues](#-possible-issues)
- [Changelog](#-changelog)
- [About the Author](#-about-the-author)
- [Contact](#-contact)
___

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

## 🚀 Features

This toolkit was designed with reliability and real-world use in mind:

- ✅ Modular architecture — easy to integrate and extend
- ✅ Intelligent retry mechanism with exponential backoff (via `tenacity`)
- ✅ Fully compatible with OpenAI-style request formats
- ✅ CLI-first design — includes `rschat` for terminal usage and `rschat-tools` for automation
- ✅ Secure by design — no telemetry, no external data sent
- ✅ Production-ready — suitable for professional, CI/CD-integrated environments
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
___

## 📋 Requirements

- Python **3.9** or higher  
- An active **Azure OpenAI** resource and deployment
___

## 📄 License

This project is open source and licensed under the [MIT License](LICENSE), ensuring maximum flexibility and adoption.

You are free to use it in both personal and commercial projects.
___

## 🧪 Quick Start

> ⚠️ Requires Python 3.9+ and internet access.
> 📂 [View setup scripts](https://github.com/renan-siqueira/rsazure-openai-toolkit/tree/main/scripts)

Don't want to deal with virtual environments or manual setup?

Set up your environment with one command:

### ▶️ Windows (PowerShell):

```powershell
iwr -useb https://raw.githubusercontent.com/renan-siqueira/rsazure-openai-toolkit/main/scripts/setup.ps1 | iex
```

### 🐧 Linux/macOS (Bash):

```bash
curl -sSfL https://raw.githubusercontent.com/renan-siqueira/rsazure-openai-toolkit/main/scripts/setup.sh | bash
```

This will:

- Create a virtual environment
- Activate it
- Install `rsazure-openai-toolkit`
- Print usage instructions

Ideal for both beginners and experienced developers 🚀
> 💬 Want to try it out quickly? Run `rschat-tools samples` after setup to see ready-to-run examples.
___

## 💻 Manual Setup (Alternative)

### From PyPI:
```bash
pip install rsazure-openai-toolkit
```
### From GitHub:
```bash
pip install git+https://github.com/renan-siqueira/rsazure-openai-toolkit
```
___

## Usage

```python
from rsazure_openai_toolkit import call_azure_openai_handler

response = call_azure_openai_handler(
    api_key="your-api-key",
    azure_endpoint="https://your-resource.openai.azure.com/",
    api_version="2023-12-01-preview",
    deployment_name="gpt-35-turbo",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Summarize what artificial intelligence is."}
    ]
)

print(response)
```
___

## Environment Configuration

To simplify local development and testing, this toolkit supports loading environment variables from a `.env` file.

Create a `.env` file in your project root (or copy the provided `.env.example`) and add your Azure OpenAI credentials:

```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-12-01-preview
AZURE_DEPLOYMENT_NAME=your-deployment-name
```

In your script, load the environment variables before calling the handler:

```python
from dotenv import load_dotenv
import os

load_dotenv()  # defaults to loading from .env in the current directory

from rsazure_openai_toolkit import call_azure_openai_handler

response = call_azure_openai_handler(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    deployment_name=os.getenv("AZURE_DEPLOYMENT_NAME"),
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Summarize what artificial intelligence is."}
    ]
)
```
___

## 💻 CLI Usage (`rschat`)

After installing the package, you can interact with Azure OpenAI directly from your terminal using:

```bash
rschat "What can you do for me?"
```

Make sure you have a valid .env file with your Azure credentials configured:
```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-12-01-preview
AZURE_DEPLOYMENT_NAME=your-deployment-name
```
You can also ask in Portuguese (or any supported language):
```bash
rschat "Resuma o que é inteligência artificial"
```

*If any required variable is missing, the CLI will exit with a clear error message.*
___

## 🧰 Developer Tools (`rschat-tools`)

The toolkit includes a companion CLI called `rschat-tools` to assist with setup and onboarding.

To generate sample projects in your current directory, run:

```bash
rschat-tools samples
```

You'll see an interactive menu like this:

```
[0] Exit
[1] Basic Usage
[2] Advanced Usage
[3] Env Usage
[4] Env + Advanced Usage
[all] Generate All
```

Choose an option, and a folder will be created inside `./samples/` containing ready-to-run scripts and configurations.

💡 Samples that include a chat loop will clearly display: `Type 'exit' to quit`  
This ensures the CLI is friendly even for non-developers who might not be familiar with Ctrl+C.

You can generate all examples at once using:

```bash
rschat-tools samples
# then select: all
```

This is the fastest way to explore real usage examples and start integrating Azure OpenAI with minimal setup.
___

### 🚨 Possible Issues

- **Invalid API Key or Endpoint**  
  Ensure your `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT` are correctly set in your `.env` file.

- **Deployment Not Found**  
  Check that your `deployment_name` matches exactly the name defined in your Azure OpenAI resource.

- **Timeouts or 5xx Errors**  
  The toolkit includes automatic retries with exponential backoff via `tenacity`. If errors persist, verify network access or Azure service status.

- **Missing Environment Variables**  
  Always ensure `load_dotenv()` is called before accessing `os.getenv(...)`, especially when testing locally.
___

## 📦 Changelog

We follow [semantic versioning](https://semver.org/) to ensure predictable upgrades.

- 🔎 Check the full [CHANGELOG.md](CHANGELOG.md) for detailed release notes
- 📌 Visit the [Releases Page](https://github.com/renan-siqueira/rsazure-openai-toolkit/releases) to explore version history
___

## 👨‍💻 About the Author

I'm a software engineer with real-world experience across backend, frontend, DevOps, cloud, and AI — building solutions that are designed to last.

Today, my passion is helping teams make AI development more accessible, maintainable, and truly production-ready — with full control, transparency, and respect for sound engineering principles.

I believe that great tools should be simple, powerful, and built to empower — not to lock people in. That’s the mindset behind everything I build and share.
___

### 📬 Contact

I'm always open to feedback, ideas, or professional collaboration.

- GitHub: [github.com/renan-siqueira](https://github.com/renan-siqueira)
- Email: [renan.siqu@gmail.com](mailto:renan.siqu@gmail.com)
- LinkedIn: [linkedin.com/in/renan-siqueira-antonio](https://www.linkedin.com/in/renan-siqueira-antonio/)

Feel free to connect or open an issue.  
Suggestions, contributions, and responsible disclosures are always welcome.
