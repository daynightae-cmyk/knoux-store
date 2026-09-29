from __future__ import annotations

from pathlib import Path
import os
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = PROJECT_ROOT / "config" / "signal_sources.yaml"
DATA_ROOT = PROJECT_ROOT / "data" / "signal"
RAW_DIR = DATA_ROOT / "raw"
PROCESSED_DIR = DATA_ROOT / "processed"
MANIFESTS_DIR = DATA_ROOT / "manifests"
LOGS_DIR = DATA_ROOT / "logs"

for path in (RAW_DIR, PROCESSED_DIR, MANIFESTS_DIR, LOGS_DIR):
    path.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def service_role_configured() -> bool:
    return bool(
        os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        and os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )
