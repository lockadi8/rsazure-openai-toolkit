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
import rsazure_openai_toolkit as rschat

response = rschat.main(
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
import rsazure_openai_toolkit as rschat

load_dotenv()  # defaults to loading from .env in the current directory

response = rschat.main(
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

## 🔧 Custom Model Configuration

You can define custom behavior using `get_model_config()`:

```python
config = rschat.get_model_config(overrides={"temperature": 0.5}, seed=42)

response = rschat.main(
    ...,
    messages=messages,
    **config
)
```

___

## 🧠 Using Session Context

To persist conversation history across runs:

```python
ctx = rschat.SessionContext(session_id="my_sess", max_messages=5)
ctx.add("user", "Hello!")
messages = ctx.get()

response = rschat.main(
    ...,
    messages=messages
)

ctx.add("assistant", response)
ctx.save()
```

___

## 📝 Enabling Logging

To enable structured logging, set these in your `.env`:

```env
RSCHAT_LOG_MODE=jsonl
RSCHAT_LOG_PATH=~/.rsazure/chat_logs.jsonl
```

Or use programmatically:

```python
logger = rschat.get_logger()
logger.log_interaction(messages=messages, response=response, config=config)
```

___

📚 See also:
- [Model Configuration](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/config.md)
- [Session Context](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/session_context.md)
- [Logging](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/logging.md)