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

> *If any required variable is missing, the CLI will exit with a clear error message.*

### 📝 Logging with CLI

To enable logging while using the CLI:

```env
RSCHAT_LOG_MODE=jsonl
RSCHAT_LOG_PATH=~/.rsazure/chat_logs.jsonl
```
> *This will record your interactions, including prompt, response, token usage, seed, and full configuration.*

To disable logging:

```env
RSCHAT_LOG_MODE=none
# Or omit RSCHAT_LOG_MODE and RSCHAT_LOG_PATH variables
```
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
