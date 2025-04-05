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
        ├── core.py
        ├── context_info.py
        ├── env_config.py
        ├── results.py
        ├── tools_cli.py
        ├── utils.py
        ├── model_config
        │   └── model_config.py
        ├── logging
        │   └── interaction_logger.py
        ├── samples
        │   ├── generator.py
        │   └── templates
        │       ├── chat_loop_usage.py.j2
        │       ├── basic_usage.py.j2
        │       ├── env_chat_loop_usage.py.j2
        │       ├── env_usage.py.j2
        │       └── env.example.py.j2
        ├── session
        │   └── context.py
