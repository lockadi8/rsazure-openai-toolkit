## 🔧 Advanced Configuration (Optional)

This toolkit provides a utility function called `get_model_config()` to help you **explicitly configure** OpenAI model behavior — in a way that is **transparent, reproducible, and easy to override**.

It returns a dictionary of model parameters that can be passed directly into the model call, including when using the `rschat` CLI.

### ✅ Benefits:
- Clear defaults for fast iteration
- Full support for OpenAI parameters
- Reproducible generation with optional `seed`
- Easy to override only what you need

### 🔍 Supported Parameters

| Parameter           | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| `temperature`       | Controls randomness (0.0 = deterministic, 1.0 = more creative)              |
| `max_tokens`        | Maximum number of tokens to generate                                        |
| `seed`              | Makes generation deterministic for same input (if supported by model)       |
| `top_p`             | Controls diversity via nucleus sampling                                     |
| `frequency_penalty` | Penalizes repetition                                                        |
| `presence_penalty`  | Encourages introduction of new topics                                       |
| `stop`              | Sequence(s) to stop generation (e.g., `"User:"`)                            |
| `user`              | Optional user identifier (e.g., `"rschat-cli"`)                             |
| `logit_bias`        | Bias certain tokens (e.g., `{token_id: -100}` to suppress a token)          |
___

### ⚙️ Default Configuration

If you call `get_model_config()` with no arguments, you get:

```python
import rsazure_openai_toolkit as rschat

model_config = rschat.get_model_config()

# Returns:
# {
#     "temperature": 0.7,
#     "max_tokens": 1024,
#     "seed": 1
# }
```

This ensures a balance of creativity, length, and reproducibility.

You can also instantiate the `ModelConfig` class directly if you prefer an object-oriented approach:

```python
config = rschat.ModelConfig(temperature=0.6, seed=42)
print(config.as_dict())
```
___

### 🧩 Custom Overrides

You can selectively override any parameter using the `overrides` argument:

```python
# Adjust temperature and disable seed for non-deterministic behavior
config = rschat.get_model_config(overrides={"temperature": 0.5}, seed=None)

# Set a custom top_p and seed
config = rschat.get_model_config(overrides={"top_p": 0.9}, seed=42)

# Completely override everything
config = rschat.get_model_config(overrides={
    "temperature": 0.2,
    "max_tokens": 512,
    "seed": 123,
    "frequency_penalty": 0.5
})
```

If `seed` is provided as both an argument **and** inside `overrides`, the override takes precedence:

```python
rschat.get_model_config(overrides={"seed": 99}, seed=1)  # → uses seed=99
```
___

### 🔄 Why This Matters

In production scenarios, controlling model behavior **explicitly** improves:

- Cost and token budgeting
- Debugging and reproducibility
- Output consistency for testing and evaluation

You’re always in control — no hidden defaults.

> 💡 This function powers the CLI (`rschat`) under the hood, ensuring consistent and traceable model configuration. All model parameters are printed alongside the output, and logged (if enabled), so you always know exactly what was used.

___

📚 See also:
- [Model Configuration](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/config.md)
- [Session Context](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/session_context.md)
- [Logging](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/docs/logging.md)