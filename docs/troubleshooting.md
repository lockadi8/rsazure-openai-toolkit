# 🛠️ Troubleshooting & Common Issues

This page lists common problems that users may encounter when working with `rsazure-openai-toolkit`, along with suggested solutions and context.

---

## 🔑 Authentication & Environment

### ❌ Invalid API Key or Endpoint
Make sure your `.env` file contains the correct values:
```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```
- Do **not** include a trailing slash (`/`) at the end of the endpoint.
- Your key must match the one created in your Azure OpenAI resource.

---

### ❌ Missing Environment Variables
Ensure you’ve called:
```python
from dotenv import load_dotenv
load_dotenv()
```
before accessing variables via `os.getenv(...)`.

If you're using CLI (`rschat`), make sure `.env` is in the project root.

---

### ⚠️ `.env` file not being loaded
Check:
- Is it in the current working directory when the script/CLI is run?
- Is the filename correct (no `.txt` or other extension)?
- Try adding `verbose=True` to `load_dotenv(verbose=True)` for debugging.

---

## 📦 Azure Deployment Errors

### ❌ Deployment not found
- Confirm that the deployment name in `.env` is exactly the same as configured in Azure:
```env
AZURE_DEPLOYMENT_NAME=gpt-35-turbo
```
- Deployment names are **case-sensitive**.
- Also ensure the correct **API version** is being used (`2023-12-01-preview` or newer).

---

### ❌ Model version mismatch
If you're getting version-related errors:
- Check if your deployment is targeting a model that supports required features (e.g. `seed`, `tool_calls`).
- Models like `gpt-4o`, `gpt-35-turbo`, etc. may behave differently depending on API version.

---

## 🔢 Token Count Errors

### ❌ Tokenizer not found for model
- If you see errors related to encoding or model name:
  - Make sure `tiktoken` is installed
  - The toolkit automatically maps deployment names like `gpt-4o` to the best tokenizer
  - You can override model name detection via: `AZURE_OPENAI_MODEL=gpt-4`

---

## 🌐 Network & Retry Behavior

### ⏳ Timeouts or 5xx Errors
- Azure sometimes returns transient errors (502, 504, etc.).
- The toolkit automatically retries up to 3 times with exponential backoff (via `tenacity`).
- If issues persist:
  - Check your internet connection
  - Verify Azure OpenAI service status

---

### 🔁 Infinite retry loop? (in your own wrappers)
By default, this toolkit limits retries to 3.  
If you wrap it in your own retry logic, make sure you’re not stacking conflicting mechanisms.

---

## 🧠 Session Context Issues

### 💾 Context not saving
- Check that `RSCHAT_USE_CONTEXT=1` is set
- Verify the context path is writable: `RSCHAT_CONTEXT_PATH=~/.rschat_history`
- If using custom session ID, confirm it's consistent across calls: `RSCHAT_SESSION_ID=my_session`

### 🔐 Prompt not updating
- If `RSCHAT_OVERRIDE_SYSTEM` is not set, the saved prompt is enforced
- Set `RSCHAT_OVERRIDE_SYSTEM=1` to allow overwriting the saved prompt/config

### ⚠️ Inconsistent message trimming
- If messages disappear between runs, you may be hitting `RSCHAT_CONTEXT_MAX_MESSAGES` or `RSCHAT_CONTEXT_MAX_TOKENS`
- The full history is always saved in `.full.jsonl` (check that file for confirmation)

---

## 🧪 Logging Not Working

### 📁 No logs being created
Ensure you've set the following:
```env
RSCHAT_LOG_MODE=jsonl  # or csv
RSCHAT_LOG_PATH=~/.rsazure/chat_logs.jsonl
```

Also confirm that:
- The folder exists and is writable
- Mode is not set to `none`
- Path is not pointing to a read-only or invalid location

---

## 🧠 Unexpected Model Behavior

### 🎲 Reproducibility not working (seed ignored)
- Not all models support `seed` yet (e.g., some Azure deployments may not support it depending on version).
- If `seed` has no effect, check the Azure OpenAI model and API version you’re using.

---

## 🛠 CLI Specific Issues

### 🐚 CLI not recognized (`rschat: command not found`)
- Run: `pip show rsazure-openai-toolkit` and confirm it's installed in your active environment.
- Try: `python -m rsazure_openai_toolkit.cli "Hello"` (bypass the script entrypoint)
- On Windows, re-open the terminal after installation to refresh PATH

---

### 📝 CLI exits silently or doesn’t log
- Check that `RSCHAT_LOG_MODE` and `RSCHAT_LOG_PATH` are set before running `rschat`
- Use `echo %RSCHAT_LOG_MODE%` (Windows) or `echo $RSCHAT_LOG_MODE` (Unix) to inspect
- Try enabling verbose output for diagnostics:

```env
RSCHAT_VERBOSE=1
```

---

## 📦 Package Installation Issues

### 🐍 Python version mismatch
Ensure you're using Python 3.9 or higher. Run:
```bash
python --version
```

### 🔄 Installed package outdated
Update using:
```bash
pip install --upgrade rsazure-openai-toolkit
```

---

## 💬 Still stuck?

Feel free to open an [Issue on GitHub](https://github.com/renan-siqueira/rsazure-openai-toolkit/issues) or contact the author via [email](mailto:renan.siqu@gmail.com).

---

📚 See also:
- [Session Context](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/session_context.md)
- [Logging](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/logging.md)
- [CLI Usage](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/cli.md)