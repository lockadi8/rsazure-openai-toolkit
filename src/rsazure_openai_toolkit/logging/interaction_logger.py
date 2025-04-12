import csv
import json
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

from rsazure_openai_toolkit.env import get_logging_config


class InteractionLogger:
    def __init__(self, mode: Optional[str] = None, path: Optional[str] = None):
        """
        Initializes the logger based on mode and path.
        If either is missing or mode is set to 'none', logging is disabled to respect user intent.

        Args:
            mode (str): Logging mode ('jsonl', 'csv', or 'none')
            path (str): File path for saving logs
        """
        if not mode or mode.lower() == "none" or not path:
            self.enabled = False
            return

        self.enabled = True
        self.mode = mode.lower()
        self.path = Path(path).expanduser()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def log(self, data: dict):
        if not self.enabled:
            return

        data["timestamp"] = datetime.now(timezone.utc).isoformat()

        if self.mode == "jsonl":
            with self.path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(data, ensure_ascii=False) + "\n")

        elif self.mode == "csv":
            is_new = not self.path.exists()
            with self.path.open("a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=data.keys())
                if is_new:
                    writer.writeheader()
                writer.writerow(data)
        else:
            raise ValueError(f"Unsupported logging mode: {self.mode}")

    def get_logs(self) -> list[dict]:
        if not self.enabled or not self.path.exists():
            return []

        if self.mode == "jsonl":
            with self.path.open("r", encoding="utf-8") as f:
                return [json.loads(line) for line in f]
        elif self.mode == "csv":
            with self.path.open("r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                return list(reader)
        return []

    def view(self, n: int = 5):
        logs = self.get_logs()
        for entry in logs[-n:]:
            print(f"[{entry['timestamp']}] {entry['question']} → {entry['response'][:60]}...")

    def __str__(self):
        if not self.enabled:
            return "<InteractionLogger disabled>"
        logs = self.get_logs()
        return f"<InteractionLogger mode='{self.mode}' path='{self.path}' entries={len(logs)}>"


def get_logger() -> InteractionLogger:
    """
    Helper to instantiate the logger using environment configuration
    from the centralized env module.
    """
    cfg = get_logging_config()
    return InteractionLogger(mode=cfg["mode"], path=cfg["path"])
