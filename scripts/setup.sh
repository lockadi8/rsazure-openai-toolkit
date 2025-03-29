#!/bin/bash

echo "Creating virtual environment..."
python3 -m venv .venv

echo "Virtual environment created: .venv"

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing rsazure-openai-toolkit..."
pip install --upgrade pip
pip install rsazure-openai-toolkit

echo ""
echo "Setup complete!"
echo ""
echo "To activate the environment manually next time, run:"
echo "   source .venv/bin/activate"
echo ""
echo "You can now run:"
echo "   rschat-tools samples"
echo "   rschat \"Say hello!\""
