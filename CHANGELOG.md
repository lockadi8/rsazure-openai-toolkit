# Changelog

All notable changes to this project will be documented in this file.
___

## [0.7.0] - 2024-04-12

### Added
- Introduced `ConverSession` as the new conversational core of the toolkit
- `Agent` class to load and validate behavior via `config.yaml` and `.rsmeta`
- Prompt architecture with support for external versioned prompt files (`.rsmeta`)
- Support for dynamic prompt variable injection and safe rendering
- CLI now powered by `ConverSession` internally

### Changed
- Refactored prompt and model configuration into unified `prompts/model.py`
- Centralized environment variable handling in `env/config.py`
- Updated CLI to be a lightweight interface using core orchestration
- Updated internal imports and module names for clarity (e.g. `conversession/`)
- Project version bumped to `0.7.0` to reflect architectural maturity

### Removed
- Legacy `model_config.py` (merged into `prompts.model`)
- Redundant `ChatCLI` class in CLI (replaced by `ConverSession`)

### Notes
- No breaking changes
- No new dependencies
- Safe to upgrade
___

## [0.6.4] - 2025-04-12
### Fixed
- Fixed bug where `.env` was not loaded early enough in CLI (`rschat`) causing missing environment variable errors
### Changed
- Moved `load_env()` to the top of `cli.py` to ensure environment is loaded before config validation
- Bumped version to 0.6.4
___

## [0.6.3] - 2025-04-08

### Added
- New `core/integration.py` module as the explicit integration layer with Azure OpenAI SDK
- Unit tests for `integration.py` using Python's built-in `unittest` and mock objects
- Full parameter structure validation for chat completions

### Changed
- Renamed `core.py` to `integration.py` and removed it from the public interface
- Main `__init__.py` no longer exposes internal technical functions
- `core/__init__.py` is now empty to reinforce its internal-only purpose

### Notes
- No external dependencies were added
- All tests pass via `unittest` with `python tests/core/test_integration.py`

- Bumped version to 0.6.3
___

## [0.6.2] - 2025-04-07

### Changed
- Refactored all template files in `samples/templates/` to align with the modular CLI architecture introduced in v0.6.0
  - Replaced all uses of `call_azure_openai_handler()` with `main()` function
  - Replaced manual print formatting with `ChatResult().print()` for consistent output
  - Replaced direct logging calls with `get_logger()` and `result.to_log_dict()`
  - Replaced hardcoded message structures with `get_context_messages()` for context support
  - Added defensive `response.choices` check and fallback token estimation
  - Standardized import style: `import rsazure_openai_toolkit as rschat`
  - Wrapped logic in `main()` blocks for reuse and testability

### Affected Templates
- `basic_usage.py.j2`
- `chat_loop_usage.py.j2`
- `env_usage.py.j2`
- `env_chat_loop_usage.py.j2`

> These templates are now fully aligned with the official CLI (`rschat`) and offer consistent logging, context persistence, and safety across all use cases.

### Notes
- No breaking changes
- Recommended: regenerate examples using `rschat-tools samples`
- Version bumped to 0.6.2
___

## [0.6.1] - 2025-04-05

### Changed
- Updated all documentation files in `docs/` to reflect the new architecture introduced in v0.6.0
  - Replaced usage of `call_azure_openai_handler()` with `main()` and `generate_response()`
  - Unified examples under `import rsazure_openai_toolkit as rschat`
  - Improved examples with `SessionContext`, `get_model_config()`, and `InteractionLogger`
  - Refined security policy with threat model, data boundaries, and architecture principles
- Rewrote `README.md` to include v0.6.0 highlights, `rschat` import style, sample links, and improved positioning
- Standardized absolute documentation links across files (for GitHub and PyPI compatibility)
- Bumped version to 0.6.1
___

## [0.6.0] - 2025-04-05

### Added
- Introduced a fully modular architecture under `src/rsazure_openai_toolkit/`, with well-defined packages: `core/`, `cli/`, `env/`, `model_config/`, `models/`, `session/`, `samples/`, `utils/`
- Created `ChatCLI` and `ToolsCLI` classes to encapsulate the logic of `rschat` and `rschat-tools` commands
- Added `ModelConfig` class and enhanced `get_model_config()` function for flexible, reproducible model parameter configuration
- Introduced `ContextInfo` and `ChatResult` as structured output representations in the `models/` module
- Session manager now supports full history via `.full.jsonl`, backup of metadata, and safe system prompt/config overrides

### Changed
- Refactored all CLI logic into object-oriented classes (`cli.py`, `tools.py`)
- Centralized helper functions in a single `utils/` module
- Renamed sample templates to a clearer format (`chat_loop_usage.py.j2`, etc.)
- Updated `pyproject.toml` to reflect new package structure and layout
- Improved CLI feedback: now prints context load info, system prompt in use, token usage, and fallback logging status
- Bumped version to 0.6.0

### Removed
- Removed deprecated and fragmented files: `handler.py`, `integration.py`, `token_utils.py`, `model_config_utils.py`
___

## [0.5.2] - 2025-04-03

### Fixed
- Fixed issue where environment variable changes in `.env` were not reflected on subsequent executions of `rschat`.
  - Now uses `load_dotenv(override=True)` to ensure latest `.env` values are always respected
- Updated sample templates (`.j2`) to also use `load_dotenv(override=True)`

### Changed
- Bumped version to 0.5.2
___

## [0.5.1] - 2025-03-30

### Added
- Added `__version__ = "0.5.1"` to the main `__init__.py` file
  - Enables programmatic access via `rsazure_openai_toolkit.__version__`

### Changed
- Bumped version to 0.5.1
___

## [0.5.0] - 2025-03-30

### Added
- `SessionContext`: full support for context window management with automatic disk persistence
  - Saves message history per session (via `session_id`)
  - Supports context trimming by message count (`max_messages`) or token budget (`max_tokens`)
  - Automatically emits user warnings when trimming occurs
  - Metadata file (`.meta.json`) tracks system prompt, creation time, and session config
  - Auto-backup of `meta.json` before overriding system prompt or config
  - Full history stored in `.full.jsonl`, even if trimmed from active context
  - Integrated with CLI (`rschat`) via environment variables
- New documentation file: `docs/session_context.md`

### Changed
- `rschat` CLI now prints:
  - Previous message count and total context size when using session
  - Active system prompt from the loaded context
  - Config mismatch alerts (e.g., deployment or token limits)
  - Enhanced safety checks for accidental system prompt or config overrides
- Bumped version to 0.5.0
___

## [0.4.1] - 2025-03-30

### Added
- Modular documentation structure in `docs/`
- Dedicated files for CLI, config, usage, logging, and troubleshooting
- Improved `troubleshooting.md` with detailed error handling tips

### Changed
- Simplified and reorganized `README.md` for PyPI compatibility
- Added inline official PyPI/GitHub badges next to project name
- Improved visual layout of badge groups for clarity and aesthetics
- Bumped version to 0.4.1

### Fixed
- Broken internal links in PyPI view (now absolute GitHub links)
___

## [0.4.0] - 2025-03-29
### Added
- `InteractionLogger`: a flexible and transparent logging system for model interactions
  - Supports `jsonl` and `csv` formats
  - Logging is fully opt-in via `RSCHAT_LOG_MODE` and `RSCHAT_LOG_PATH`
  - Includes timestamps, prompts, tokens, model config, and raw API response
- `get_model_config()`: utility function to build model parameters with optional overrides and default values
  - Supports `temperature`, `max_tokens`, `seed`, and others
  - Provides a clean and traceable way to manage generation config
- Full input/output/total token tracking from the OpenAI API (with fallback)
- CLI (`rschat`) now prints:
  - Assistant response
  - Token usage (input, output, total)
  - Model used
  - Seed (if provided)
  - Elapsed time
- Added `seed` support for reproducible outputs
- Updated all example templates to use the new architecture
  - Now print response info and optionally log interactions
  - Use `get_model_config()` for generation parameters
- Logging gracefully handles `RSCHAT_LOG_MODE=none` (or unset) without errors
- Template logging support added to:
  - `basic_usage.py.j2`
  - `advanced_usage.py.j2`
  - `env_usage.py.j2`
  - `env_advanced_usage.py.j2`

### Changed
- `call_azure_openai_handler()` now returns the full OpenAI response object instead of just the content
- Token estimation moved to a reusable utility with smart tokenizer resolution
- Logging system respects user intent: no logging unless explicitly enabled via environment variables
- CLI output reorganized to be more readable and transparent
- Bumped version to 0.4.0

### Removed
- Implicit logging behavior — users must now explicitly enable it
___

## [0.3.3] - 2025-03-29
### Added
- Rewritten `README.md` to improve structure, clarity, and professionalism
- Improved section linking and emoji compatibility for better UX
- Refactored `SECURITY.md` with clearer language and contributor guidelines

### Changed
- Bumped version to 0.3.3
___

## [0.3.2] - 2025-03-29
### Fixed
- Removed accidental inclusion of `__pycache__` directory from the PyPI package

### Changed
- Bumped version to 0.3.2
___

## [0.3.1] - 2025-03-29
### Fixed
- Missing `.j2` templates in the distributed package, causing `rschat-tools samples` to crash on installed versions.

### Changed
- Bumped version to 0.3.1
___

## [0.3.0] - 2025-03-29
### Added
- New CLI utility `rschat-tools` for developer-facing features
- `samples` subcommand to generate usage examples with ready-to-run code
- Templates for:
  - Basic usage
  - Advanced usage (chat loop without `.env`)
  - Env usage (`.env` + basic script)
  - Env + advanced usage (`.env` + chat loop)
- `Jinja2` added as a new dependency for template rendering

### Changed
- Bumped version to 0.3.0
___

## [0.2.0] - 2025-03-28
### Added
- New CLI entrypoint `rschat` to interact with Azure OpenAI from the terminal
- CLI documentation section in README
- Environment variable validation in CLI

### Changed
- Bumped version to 0.2.0
___

## [0.1.3] - 2025-03-24
### Changed
- Improved `README.md` with detailed badges and sections
- Added `SECURITY.md` file and linked in `pyproject.toml`
- Updated project metadata (`project.urls`) in `pyproject.toml`
- Bumped version to 0.1.3
___

## [0.1.2] - 2025-03-24
### Added
- Included `SECURITY.md` policy
- Added missing URLs to `pyproject.toml` for better PyPI visibility

### Changed
- Bumped version to 0.1.2
___

## [0.1.1] - 2025-03-23
### Fixed
- Import path issue in `handler.py`

### Added
- Initial GitHub Actions CI with basic install/import test

### Changed
- Bumped version to 0.1.1
___

## [0.1.0] - 2025-03-23
### Added
- First public release with:
  - `call_azure_openai_handler`
  - `generate_response` with retry
  - `.env` configuration support

### Changed
- Bumped version to 0.1.0
