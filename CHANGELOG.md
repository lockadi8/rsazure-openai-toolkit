# Changelog

All notable changes to this project will be documented in this file.

## [0.3.3] - 2025-03-29
### Changed
- Rewritten `README.md` to improve structure, clarity, and professionalism
- Improved section linking and emoji compatibility for better UX
- Refactored `SECURITY.md` with clearer language and contributor guidelines

### Changed
- Bumped version to 0.3.3

## [0.3.2] - 2025-03-29
### Fixed
- Removed accidental inclusion of `__pycache__` directory from the PyPI package

### Changed
- Bumped version to 0.3.2

## [0.3.1] - 2025-03-29
### Fixed
- Missing `.j2` templates in the distributed package, causing `rschat-tools samples` to crash on installed versions.

### Changed
- Bumped version to 0.3.1

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

## [0.2.0] - 2025-03-28
### Added
- New CLI entrypoint `rschat` to interact with Azure OpenAI from the terminal
- CLI documentation section in README
- Environment variable validation in CLI

### Changed
- Bumped version to 0.2.0

## [0.1.3] - 2025-03-24
### Changed
- Improved `README.md` with detailed badges and sections
- Added `SECURITY.md` file and linked in `pyproject.toml`
- Updated project metadata (`project.urls`) in `pyproject.toml`
- Bumped version to 0.1.3

## [0.1.2] - 2025-03-24
### Added
- Included `SECURITY.md` policy
- Added missing URLs to `pyproject.toml` for better PyPI visibility

### Changed
- Bumped version to 0.1.2

## [0.1.1] - 2025-03-23
### Fixed
- Import path issue in `handler.py`

### Added
- Initial GitHub Actions CI with basic install/import test

### Changed
- Bumped version to 0.1.1

## [0.1.0] - 2025-03-23
### Added
- First public release with:
  - `call_azure_openai_handler`
  - `generate_response` with retry
  - `.env` configuration support

### Changed
- Bumped version to 0.1.0