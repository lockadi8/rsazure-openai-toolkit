## 🔧 Advanced Configuration (Optional)

This toolkit provides a utility function called `get_model_config()` to help you **explicitly configure** OpenAI model behavior — in a way that is **transparent, reproducible, and easy to override**.

It returns a dictionary of model parameters that can be passed directly into the `call_azure_openai_handler`.

### ✅ Benefits:
- Clear defaults for fast iteration
- Full support for OpenAI parameters
- Reproducible generation with optional `seed`
- Easy to override only what you need

### 🔍 Supported Parameters

| Parameter           | Description                                                                 |
|_____________________|___________________________________________________________________________--|
| `temperature`       | Controls randomness (0.0 = deterministic, 1.0 = more creative)              |
| `max_tokens`        | Maximum number of tokens to generate                                        |
| `seed`              | Makes generation deterministic for same input (if supported by model)       |
| `top_p`             | Controls diversity via nucleus sampling                                     |
| `frequency_penalty` | Penalizes repetition                                                        |
| `presence_penalty`  | Encourages introduction of new topics                                       |
| `stop`              | Sequence(s) to stop generation (e.g., `"\nUser:"`)                          |
| `user`              | Optional user identifier (e.g., `"rschat-cli"`)                             |
| `logit_bias`        | Bias certain tokens (e.g., `{token_id: -100}` to suppress a token)          |
___

### ⚙️ Default Configuration

If you call `get_model_config()` with no arguments, you get:

```python
from rsazure_openai_toolkit.utils.model_config_utils import get_model_config

model_config = get_model_config()

# Returns:
# {
#     "temperature": 0.7,
#     "max_tokens": 1024,
#     "seed": 1
# }
```

This ensures a balance of creativity, length, and reproducibility.
___

### 🧩 Custom Overrides

You can selectively override any parameter using the `overrides` argument:

```python
# Adjust temperature and disable seed for non-deterministic behavior
config = get_model_config(overrides={"temperature": 0.5}, seed=None)

# Set a custom top_p and seed
config = get_model_config(overrides={"top_p": 0.9}, seed=42)

# Completely override everything
config = get_model_config(overrides={
    "temperature": 0.2,
    "max_tokens": 512,
    "seed": 123,
    "frequency_penalty": 0.5
})
```

If `seed` is provided as both an argument **and** inside `overrides`, the override takes precedence:

```python
get_model_config(overrides={"seed": 99}, seed=1)  # → uses seed=99
```
___

### 🔄 Why This Matters

In production scenarios, controlling model behavior **explicitly** improves:

- Cost and token budgeting
- Debugging and reproducibility
- Output consistency for testing and evaluation

You’re always in control — no hidden defaults.
___

> 💡 This function powers the CLI (`rschat`) under the hood, and you can reuse it in your own apps or pipelines.
