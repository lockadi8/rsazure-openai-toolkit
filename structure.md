.
├── docs
│   ├── cli.md
│   ├── config.md
│   ├── features.md
│   ├── logging.md
│   ├── overview.md
│   ├── quick_start.md
│   ├── session_context.md
│   ├── troubleshooting.md
│   └── usage.md
├── scripts
│   ├── setup.ps1
│   └── setup.sh
└── src
    └── rsazure_openai_toolkit
        ├── __init__.py
        ├── cli.py
        ├── handler.py
        ├── integration.py
        ├── tools_cli.py
        ├── logging
        │   └── interaction_logger.py
        ├── samples
        │   ├── generator.py
        │   └── templates
        │       ├── advanced_usage.py.j2
        │       ├── basic_usage.py.j2
        │       ├── env_advanced_usage.py.j2
        │       ├── env_usage.py.j2
        │       └── env.example.py.j2
        ├── session
        │   └── context.py
        └── utils
            ├── model_config_utils.py
            └── token_utils.py