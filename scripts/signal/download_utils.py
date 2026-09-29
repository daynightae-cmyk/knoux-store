from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from .config import MANIFESTS_DIR, RAW_DIR, load_config


def sha256_file(path: Path, chunk_size: int = 65536) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _settings() -> dict[str, Any]:
    return load_config().get("global", {})


def save_manifest(dataset_id: str, manifest: dict[str, Any]) -> Path:
    out_dir = MANIFESTS_DIR / dataset_id
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=0.5, min=1, max=30),
    retry=retry_if_exception_type((httpx.HTTPError, OSError)),
    reraise=True,
)
def download_stream(
    *,
    dataset_id: str,
    url: str,
    filename: str,
    source_url: str,
    publisher: str,
    license_url: str | None,
    countries: list[str],
    expected_sha256: str | None = None,
) -> dict[str, Any]:
    cfg = _settings()
    dest_dir = RAW_DIR / dataset_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    tmp = dest.with_suffix(dest.suffix + ".part")

    digest = hashlib.sha256()
    size = 0
    headers = {"User-Agent": str(cfg.get("user_agent", "KNOuX-Signal/1.1"))}
    timeout = float(cfg.get("timeout_seconds", 120))
    chunk_size = int(cfg.get("chunk_size_bytes", 65536))

    with httpx.Client(headers=headers, timeout=timeout, follow_redirects=True) as client:
        with client.stream("GET", url) as response:
            response.raise_for_status()
            with tmp.open("wb") as handle:
                for chunk in response.iter_bytes(chunk_size=chunk_size):
                    if not chunk:
                        continue
                    handle.write(chunk)
                    digest.update(chunk)
                    size += len(chunk)
            content_type = response.headers.get("content-type")
            status = response.status_code

    got_sha = digest.hexdigest()
    if expected_sha256 and got_sha.lower() != expected_sha256.lower():
        tmp.unlink(missing_ok=True)
        raise ValueError(f"SHA-256 mismatch for {dataset_id}: {got_sha}")

    tmp.replace(dest)
    manifest = {
        "dataset_id": dataset_id,
        "source_url": source_url,
        "direct_download_url": url,
        "publisher": publisher,
        "license_url": license_url,
        "country_coverage": countries,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "local_file": str(dest.relative_to(dest.parents[3])),
        "file_size_bytes": size,
        "sha256": got_sha,
        "http_status": status,
        "content_type": content_type,
        "status": "downloaded",
    }
    save_manifest(dataset_id, manifest)
    return manifest
