.
├── docs/                             # Modular documentation
│   ├── cli.md
│   ├── config.md
│   ├── features.md
│   ├── logging.md
│   ├── overview.md
│   ├── quick_start.md
│   ├── session_context.md
│   ├── troubleshooting.md
│   └── usage.md
│
├── scripts/                          # Automation scripts for setup and build
│   ├── setup.ps1
│   └── setup.sh
│
└── src/
    └── rsazure_openai_toolkit/
        ├── __init__.py                          # Entry point and public export layer
        │
        ├── cli/
        │   ├── cli.py                           # Main command rschat
        │   └── tools.py                         # Auxiliary tools rschat-tools
        │
        ├── conversession/
        │   ├── __init__.py                      # Exports ConverSession
        │   └── conversession.py                 # Core of conversational orchestration
        │
        ├── core/
        │   ├── __init__.py
        │   └── integration.py                   # Encapsulates call to Azure OpenAI
        │
        ├── env/
        │   ├── __init__.py
        │   └── config.py                        # Loading and validation of environment variables
        │
        ├── logging/
        │   ├── __init__.py
        │   └── interaction_logger.py            # Structured logger for LLM interactions
        │
        ├── models/
        │   ├── __init__.py
        │   ├── context.py                       # Class ContextInfo
        │   └── results.py                       # Class ChatResult
        │
        ├── prompts/
        │   ├── __init__.py
        │   ├── agent.py                         # Represents an agent with config.yaml + prompts
        │   ├── manager.py                       # .rsmeta prompt loader
        │   └── model.py                         # Contains PromptMetadata, PromptData, ModelConfig
        │
        ├── samples/
        │   ├── __init__.py
        │   ├── generator.py                     # Sample project generator
        │   └── templates/                       # Jinja2 templates for Python examples
        │       ├── basic_usage.py.j2
        │       ├── chat_loop_usage.py.j2
        │       ├── env_chat_loop_usage.py.j2
        │       ├── env_usage.py.j2
        │       └── env.example.py.j2
        │
        ├── session/
        │   ├── __init__.py
        │   └── session.py                       # Persistent context manager (SessionContext)
        │
        └── utils/
            ├── __init__.py
            └── utils.py                         # Token estimation and various utilities
