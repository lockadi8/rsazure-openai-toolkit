<p align="left">
  <!-- 📦 PyPI -->
  <img src="https://img.shields.io/pypi/v/rsazure-openai-toolkit" alt="PyPI Version" />
  <img src="https://img.shields.io/pypi/dm/rsazure-openai-toolkit" alt="PyPI Downloads" />
  <img src="https://img.shields.io/github/v/tag/renan-siqueira/rsazure-openai-toolkit" alt="GitHub Tag" />
  <img src="https://img.shields.io/github/license/renan-siqueira/rsazure-openai-toolkit" alt="License" />
  <img src="https://img.shields.io/github/repo-size/renan-siqueira/rsazure-openai-toolkit" alt="Repo Size" />
  <img src="https://img.shields.io/badge/python-3.11-blue" alt="Python Version" />
</p>

<p align="left">
  <!-- 🔧 GitHub / CI -->
  <img src="https://img.shields.io/github/last-commit/renan-siqueira/rsazure-openai-toolkit" alt="Last Commit" />
  <img src="https://img.shields.io/github/commit-activity/m/renan-siqueira/rsazure-openai-toolkit" alt="Commits Per Month" />
  <a href="https://github.com/renan-siqueira/rsazure-openai-toolkit/actions">
    <img src="https://github.com/renan-siqueira/rsazure-openai-toolkit/actions/workflows/python-ci.yml/badge.svg" alt="Build Status" />
  </a>
  <img src="https://img.shields.io/badge/security-scanned-green" alt="Security Scan" />
</p>

<p align="left">
  <!-- 👥 Comunidade -->
  <img src="https://img.shields.io/github/stars/renan-siqueira/rsazure-openai-toolkit" alt="GitHub Stars" />
  <img src="https://img.shields.io/github/contributors/renan-siqueira/rsazure-openai-toolkit" alt="Contributors" />
  <img src="https://img.shields.io/github/issues/renan-siqueira/rsazure-openai-toolkit" alt="Open Issues" />
  <img src="https://img.shields.io/github/issues-pr/renan-siqueira/rsazure-openai-toolkit" alt="Open PRs" />
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

A lightweight, independent toolkit to simplify and accelerate integration with Azure OpenAI.
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

## Features

- Modular and easy to extend
- Retry mechanism with exponential backoff
- Accepts OpenAI-compatible parameters
- Ready for production use
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
