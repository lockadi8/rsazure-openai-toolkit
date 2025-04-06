# 📦 Releasing a New Version of rsazure-openai-toolkit

This guide describes the exact steps to create a new release and publish it to PyPI, including tagging and changelog updates.

---

## ✅ 1. Finalize Implementation
- Finish all coding, testing, and documentation
- Ensure the project runs correctly via CLI and as a library

---

## 📝 2. Update Version Metadata

### pyproject.toml
Update the version and metadata:

```toml
version = "<new_version>"

[project.scripts]
rschat = "rsazure_openai_toolkit.cli:cli"
rschat-tools = "rsazure_openai_toolkit.tools_cli:main"

[dependencies]
Jinja2>=3.1.2
```

Also review and update (if needed):
- `keywords = [...]`
- `classifiers = [...]`

*When adding new non-code files (e.g. templates, env files), remember to configure [tool.setuptools.package-data].*

### CHANGELOG.md
At the top, add a new entry with this structure:

```md
## [<new_version>] - YYYY-MM-DD
### Added
- List new features
### Changed
- Bumped version to <new_version>
```

### README.md
- Ensure any new commands or examples are included (e.g. `rschat-tools samples`)
- Confirm version badges reflect the latest release

---

## 🔀 3. Commit & Push Changes
```bash
git add .
git commit -m "Release v<new_version>: <summary>"
git push origin main
```

---

## 🏷️ 4. Create and Push Git Tag
```bash
git tag v<new_version>
git push origin v<new_version>
```
> This is necessary for GitHub tag-based badges to reflect the correct version.

---

## 📦 5. Build Distributable Packages
```bash
find . -type d -name "__pycache__" -exec rm -r {} +
rm -rf dist/
python -m build
```

---

## 🚀 6. Upload to PyPI
```bash
twine upload dist/*
```
> Use `__token__` as your username if authenticating with a PyPI token.

---

## 🏁 7. Create GitHub Release
- Go to: https://github.com/renan-siqueira/rsazure-openai-toolkit/releases
- Click "Draft a new release"
- Select tag: `v<new_version>`
- Title: `v<new_version> - <summary>`
- Description: copy from `CHANGELOG.md`
- Publish

---

## ✅ 8. Final Checks
- Confirm PyPI is showing the latest version: https://pypi.org/project/rsazure-openai-toolkit/
- Run a test:
```bash
pip install --upgrade rsazure-openai-toolkit
rschat "What can you do?"
rschat-tools samples
```

---

You're done! 🎉