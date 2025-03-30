## 📊 Logging and Usage Tracking

This toolkit gives you full control over logging behavior — by default, **no logs are saved** unless explicitly configured.

To enable logging:

```env
RSCHAT_LOG_MODE=jsonl      # or csv
RSCHAT_LOG_PATH=~/.rsazure/chat_logs.jsonl
```

What gets logged:

- Prompt and response
- Token usage (input, output, total)
- Model used
- Seed (if any)
- Response time
- Raw API response
- Full model configuration

This helps with **debugging**, **cost estimation**, and **auditability** — without compromising privacy.

If you set `RSCHAT_LOG_MODE=none` or omit both variables, **no logs will be generated** — respecting user intent by design.
