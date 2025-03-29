# PowerShell script to create and activate a virtual environment and install rsazure-openai-toolkit

Write-Host "Creating virtual environment..."
python -m venv .venv

Write-Host "Virtual environment created: .venv"

Write-Host "Activating virtual environment..."
.\\.venv\\Scripts\\Activate.ps1

Write-Host "Installing rsazure-openai-toolkit..."
pip install --upgrade pip
pip install rsazure-openai-toolkit

Write-Host ""
Write-Host "Setup complete!"
Write-Host ""
Write-Host "To activate the environment manually next time, run:"
Write-Host "   .\\.venv\\Scripts\\Activate.ps1"
Write-Host ""
Write-Host "You can now run:"
Write-Host "   rschat-tools samples"
Write-Host "   rschat \"Say hello!\""
