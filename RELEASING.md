# 📦 Releasing a New Version of rsazure-openai-toolkit

This guide describes the exact steps to create a new release and publish it to PyPI, including tagging and changelog updates.
___

## ✅ 1. Finalize Implementation
- Finish all coding, testing, and documentation
- Ensure the project runs correctly via CLI and as a library
___

## 📝 2. Update Version Metadata

### pyproject.toml
Update the version and metadata:

```toml
version = "<new_version>"

[project.scripts]
rschat = "rsazure_openai_toolkit.cli:cli"
rschat-tools = "rsazure_openai_toolkit.cli.tools:main"
```

Also review and update (if needed):
- `keywords = [...]`
- `classifiers = [...]`

*When adding new non-code files (e.g. templates, env files), remember to configure [tool.setuptools.package-data].*
___

### CHANGELOG.md
At the top, add a new entry with this structure:

```md
## [<new_version>] - YYYY-MM-DD
### Added
- List new features
### Changed
- List improvements and changes
### Fixed
- List bug fixes (if any)
```
___

### README.md
- Ensure any new commands or examples are included (e.g. `rschat-tools samples`)
- Confirm version badges reflect the latest release
___

## 🔀 3. Commit & Push Changes
```bash
git add .
git commit -m "Release v<new_version>: <summary>"
git push origin main
```
___

## 🏷️ 4. Create and Push Git Tag
```bash
git tag v<new_version>
git push origin v<new_version>
```
> This is necessary for GitHub tag-based badges to reflect the correct version.
___

## 📦 5. Build Distributable Packages
```bash
find . -type d -name "__pycache__" -exec rm -r {} +
rm -rf dist/
python -m build
```
___

## 🚀 6. Upload to PyPI
```bash
twine upload dist/*
```
> Use `__token__` as your username if authenticating with a PyPI token.
___

## 🏁 7. Create GitHub Release

Use the following format to publish your release:

### 📌 Title:
```
v<new_version> — <summary title>
```

### 📝 Description:

```md
Highlights  
<emoji> <Brief description of major additions or fixes>

✅ List of visible or user-facing enhancements  
🔐 Notes on security, reliability, or architecture changes (if any)
___

What's Changed  

✅ Added  (if applicable)
- Describe new features or modules

🔧 Changed  (if applicable)
- List refactors or improvements

🐛 Fixed  (if applicable)
- Mention any bugs resolved

(... Others sections if applicable)

📌 Notes  
- No breaking changes (if applicable)  
- No new dependencies (if applicable)  
- Safe to upgrade (if applicable)

🔎 See the [Changelog](https://github.com/renan-siqueira/rsazure-openai-toolkit/blob/main/CHANGELOG.md) for full details.
```
___

## ✅ 8. Final Checks
- Confirm PyPI is showing the latest version: https://pypi.org/project/rsazure-openai-toolkit/
- Run a test:
```bash
pip install --upgrade rsazure-openai-toolkit
rschat "What can you do?"
rschat-tools samples
```

___

You're done! 🎉
