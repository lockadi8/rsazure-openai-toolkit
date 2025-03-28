# Changelog

All notable changes to this project will be documented in this file.

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

## [0.1.2] - 2025-03-24
### Added
- Included `SECURITY.md` policy
- Added missing URLs to `pyproject.toml` for better PyPI visibility

## [0.1.1] - 2025-03-23
### Fixed
- Import path issue in `handler.py`
### Added
- Initial GitHub Actions CI with basic install/import test

## [0.1.0] - 2025-03-23
### Added
- First public release with:
  - `call_azure_openai_handler`
  - `generate_response` with retry
  - `.env` configuration support
