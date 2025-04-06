## 📊 Logging and Usage Tracking

This toolkit gives you full control over logging behavior — by default, **no logs are saved** unless explicitly configured.

To enable logging, define the following environment variables:

```env
RSCHAT_LOG_MODE=jsonl      # or csv
RSCHAT_LOG_PATH=~/.rsazure/chat_logs.jsonl
```

You can choose between:

- `jsonl`: line-delimited JSON, ideal for programmatic parsing and analysis
- `csv`: easy to open in Excel, Sheets, or import into dashboards

Logging is handled by the `InteractionLogger` class, which respects your configuration and saves data locally on disk.

What gets logged:

- Prompt and response
- Token usage (input, output, total)
- Model used
- Seed (if any)
- Response time
- Model configuration
- Raw OpenAI API response (for debugging or replay)

This helps with **debugging**, **cost estimation**, **traceability**, and **auditability** — all without compromising your privacy.

> Logs are never transmitted externally — all logging is local and controlled entirely by the user.

To disable logging, set:

```env
RSCHAT_LOG_MODE=none
# Or simply omit both RSCHAT_LOG_MODE and RSCHAT_LOG_PATH
```

To quickly inspect the last few logs directly from your script or console:

```python
import rsazure_openai_toolkit as rschat

logger = rschat.get_logger()
logger.view(n=5)  # Prints the last 5 logged interactions
```

___

📚 See also:
- [CLI Usage](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/cli.md)
- [Session Context](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/session_context.md)
- [Security Policy](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/SECURITY.md)