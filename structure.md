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
        ├── __init__.py                             # Main entry point and unified export layer
        ├── cli/
        │   ├── cli.py                              # Main CLI command (`rschat`)
        │   └── tools.py                            # Developer tools (`rschat-tools`)
        ├── core/
        │   └── core.py                             # Core interaction with Azure OpenAI
        ├── env/
        │   └── config.py                           # Environment loading and validation
        ├── logging/
        │   └── interaction_logger.py               # Structured logging for interactions
        ├── model_config/
        │   └── model_config.py                     # ModelConfig class and helpers
        ├── models/
        │   ├── context.py                          # ContextInfo dataclass
        │   └── results.py                          # ChatResult dataclass
        ├── samples/
        │   ├── generator.py                        # Sample project generator
        │   └── templates/
        │       ├── basic_usage.py.j2
        │       ├── chat_loop_usage.py.j2
        │       ├── env_chat_loop_usage.py.j2
        │       ├── env_usage.py.j2
        │       └── env.example.py.j2
        ├── session/
        │   └── session.py                          # SessionContext manager
        └── utils/
            ├── __init__.py                         # Token estimation and tokenizer utils
