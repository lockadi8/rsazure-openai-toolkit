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

# rsazure-openai-toolkit

A lightweight, independent toolkit (with CLI support) to simplify and accelerate integration with Azure OpenAI.
___

## Installation

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
    messages=[...]
)
```
___

## 🖥️ CLI Usage (`rschat`)

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

## Features

- Modular and easy to extend
- Retry mechanism with exponential backoff
- Accepts OpenAI-compatible parameters
- Ready for production use
- Comes with an intuitive CLI (`rschat`) for direct terminal interaction
___

## Requirements

- Python 3.9+
- Azure OpenAI resource and deployment
___

## License

This project is open-sourced and available to everyone under the [MIT License](LICENSE).
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

## 📝 Changelog

Check the [Releases](https://github.com/renan-siqueira/rsazure-openai-toolkit/releases) page for updates and version history.

See the full list of changes in [CHANGELOG.md](CHANGELOG.md)
___

## 🛡️ Security

If you discover any security issues, please report them privately via email: [renan.siqu@gmail.com](mailto:renan.siqu@gmail.com).
___

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or pull requests.

To contribute:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a PR

Please follow PEP8 and ensure your code passes existing tests.
___

## 🧠 Design Principles

- Simplicity over complexity
- Focus on production-readiness
- Explicit configuration
- Easy to extend and maintain
___

## 👨‍💻 About the Author

Hi, I'm Renan Siqueira Antonio — a technical leader in Artificial Intelligence with hands-on experience in delivering real-world AI solutions across different industries.

Over the years, I've had the opportunity to collaborate with incredible teams and contribute to initiatives recognized by companies.

This project was born from a personal need: to create a clean, reusable, and production-ready way to interact with Azure OpenAI. I'm sharing it with the hope that it helps others move faster and build better.
___

### 📬 Contact

Feel free to reach out via:

- GitHub: [github.com/renan-siqueira](https://github.com/renan-siqueira)
- Email: [renan.siqu@gmail.com](mailto:renan.siqu@gmail.com)
- Linkedin: [linkedin.com/in/renan-siqueira-antonio](https://www.linkedin.com/in/renan-siqueira-antonio/)

Contributions, suggestions, and bug reports are welcome!
