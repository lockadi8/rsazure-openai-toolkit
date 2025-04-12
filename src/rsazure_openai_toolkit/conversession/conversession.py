from typing import Optional, Dict, Any
from pathlib import Path
import time

from rsazure_openai_toolkit.prompts.agent import Agent
from rsazure_openai_toolkit.prompts.fallback_agent import BuiltInAgent
from rsazure_openai_toolkit.session import SessionContext
from rsazure_openai_toolkit.logging.interaction_logger import get_logger, InteractionLogger
from rsazure_openai_toolkit.prompts import ModelConfig
from rsazure_openai_toolkit.env import get_cli_config
from rsazure_openai_toolkit.core.integration import main as call_azure_openai

class ConverSession:
    def __init__(
        self,
        agent: str,
        prompt: Optional[str] = None,
        prompt_vars: Optional[Dict[str, str]] = None,
        session_id: Optional[str] = None,
        enable_context: bool = True,
        enable_logging: bool = True,
        overrides: Optional[Dict[str, Any]] = None,
        prompt_path: Optional[str] = None,
    ):
        """
        Builds a new instance of the ConverSession.

        Args:
            agent (str): Agent name (folder inside prompt_path)
            prompt (str): Name of the .rsmeta to be loaded (optional)
            prompt_vars (dict): Variables to be injected into the prompt
            session_id (str): Session ID for the context (optional)
            enable_context (bool): Enables or disables context usage
            enable_logging (bool): Enables or disables local logging
            overrides (dict): Additional configurations for the model
            prompt_path (str): Base path for agents/prompts (required or via .env)
        """
        self.prompt_vars = prompt_vars or {}

        base_path = Path(prompt_path or Path(get_cli_config().get("prompt_path", ""))).expanduser()
        if not base_path.exists():
            raise FileNotFoundError(f"Prompt base path not found: {base_path}")

        try:
            self.agent = Agent(agent_name=agent, base_path=base_path)
        except FileNotFoundError:
            print("⚠️  Prompt path not found or agent missing. Using built-in agent.")
            self.agent = BuiltInAgent()

        self.prompt_data = self.agent.get_prompt(prompt or self.agent.default_prompt)
        self.config = ModelConfig(
            temperature=self.agent.temperature,
            max_tokens=self.agent.max_tokens,
            seed=self.agent.seed,
            **(overrides or {})
        )

        self.system_prompt = (
            self.prompt_data.metadata.system_prompt or self.agent.system_prompt
        )
        self.input_text = self.prompt_data.render(self.prompt_vars)

        self.context = (
            SessionContext(session_id=session_id or "default") if enable_context else None
        )

        self.logger: Optional[InteractionLogger] = get_logger() if enable_logging else None

        self.response = None
        self.elapsed = 0.0

    def send(self) -> str:
        """
        Executes the model call, manages context, and performs structured logging.
        """
        messages = [{"role": "system", "content": self.system_prompt}]

        if self.context:
            self.context.add("user", self.input_text)
            messages = self.context.get(system_prompt=self.system_prompt)
        else:
            messages.append({"role": "user", "content": self.input_text})

        config_env = get_cli_config()

        start = time.time()
        self.response = call_azure_openai(
            api_key=config_env["api_key"],
            api_version=config_env["version"],
            azure_endpoint=config_env["endpoint"],
            deployment_name=config_env["deployment_name"],
            messages=messages,
            **self.config.as_dict()
        )
        self.elapsed = round(time.time() - start, 2)

        response_text = self.response.choices[0].message.content

        if self.context:
            self.context.add("assistant", response_text)
            self.context.save()

        if self.logger and self.logger.enabled:
            usage = self.response.usage.model_dump() if self.response.usage else {}
            self.logger.log({
                "agent": self.agent.name,
                "prompt_name": self.prompt_data.metadata.name,
                "system_prompt": self.system_prompt,
                "input_text": self.input_text,
                "response": response_text,
                "model": self.response.model,
                "config": self.config.as_dict(),
                "elapsed_time": self.elapsed,
                "tokens": usage,
                "agent_config_hash": self.agent.config_hash(),
                "prompt_hash": self.agent.prompt_hash(self.prompt_data.metadata.name),
            })

        return response_text
