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
