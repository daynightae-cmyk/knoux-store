"""Promote a staged business dataset through the server-only database RPC."""
from __future__ import annotations

import argparse
import json
import os

import httpx


def promote(dataset_key: str) -> dict:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
    headers = {
        "apikey": key,
        "authorization": f"Bearer {key}",
        "content-type": "application/json",
    }
    with httpx.Client(timeout=120) as client:
        response = client.post(
            f"{url}/rest/v1/rpc/signal_promote_business_staging",
            headers=headers,
            json={"p_dataset_key": dataset_key},
        )
        response.raise_for_status()
        return response.json()


def main() -> int:
    parser = argparse.ArgumentParser(description="Promote a staged Signal business dataset")
    parser.add_argument("dataset_key")
    args = parser.parse_args()
    print(json.dumps(promote(args.dataset_key), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
