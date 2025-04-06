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
- Optionally run `rschat-tools samples` to generate starter examples

Once complete, you'll be able to use:

```bash
rschat "Summarize GPT-4o capabilities"
```

### 🧩 Before using `rschat`, create a `.env` file like this:

```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-12-01-preview
AZURE_DEPLOYMENT_NAME=your-deployment-name
```

> 💬 Want to try it out quickly? Run `rschat-tools samples` after setup to see ready-to-run examples.

___

📚 See also:
- [CLI Usage](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/cli.md)
- [Usage & Environment Setup](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/usage.md)
- [Sample Generator](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/cli.md#-developer-tools-rschat-tools)