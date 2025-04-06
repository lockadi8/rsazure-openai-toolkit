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

Internally, the `rschat` command is powered by the `ChatCLI` class, which handles context loading, model configuration, logging, and response formatting in a modular and testable way.

To enable persistent conversation context across sessions:

```env
RSCHAT_USE_CONTEXT=1
RSCHAT_SESSION_ID=default
RSCHAT_CONTEXT_MAX_MESSAGES=10
RSCHAT_CONTEXT_MAX_TOKENS=3000
```

> The context is saved in `.jsonl` files and automatically trimmed based on the configured limits. Full history is stored separately as `.full.jsonl`.

A companion metadata file is also created: `<session_id>.meta.json`.  
It stores the `system_prompt`, model deployment name, context size limits, and timestamps.  

> Whenever changes are detected (e.g., prompt overrides), a backup file is saved automatically with a timestamped `.bak-*.json` suffix to ensure safety and traceability.

To enable verbose output with context and configuration info:

```env
RSCHAT_VERBOSE=1
```

> *If any required variable is missing, the CLI will exit with a clear error message.*

### 📝 Logging with CLI

To enable logging while using the CLI:

```env
RSCHAT_LOG_MODE=jsonl
RSCHAT_LOG_PATH=~/.rsazure/chat_logs.jsonl
```

Both `jsonl` and `csv` formats are supported:

```env
RSCHAT_LOG_MODE=csv
RSCHAT_LOG_PATH=~/.rsazure/chat_logs.csv
```

> *This will record your interactions, including prompt, response, token usage, seed, and full configuration.*

To disable logging:

```env
RSCHAT_LOG_MODE=none
# Or omit RSCHAT_LOG_MODE and RSCHAT_LOG_PATH variables
```

Logging is handled by the `InteractionLogger`, which respects your configuration and never transmits data externally.
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
[2] Chat Loop Usage
[3] Env Usage
[4] Env + Chat Loop Usage

[all] Generate All
```

Each option generates a folder inside `.samples/` with ready-to-run scripts and configurations.

The `rschat-tools` utility is powered by the `ToolsCLI` class, designed to simplify the onboarding experience and provide reusable examples.

💡 Samples that include a chat loop will clearly display: `Type 'exit' to quit`  
This ensures the CLI is friendly even for non-developers who might not be familiar with Ctrl+C.

You can generate all examples at once using:

```bash
rschat-tools samples
# then select: all
```

This is the fastest way to explore real usage examples and start integrating Azure OpenAI with minimal setup.

___

📚 See also:
- [Model Configuration](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/config.md)
- [Session Context](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/session_context.md)
- [Logging](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/logging.md)
