"""Streaming/resumable download utilities for approved Signal artifacts."""
from __future__ import annotations

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from .config import MANIFESTS_DIR, RAW_DIR, load_config

logger = logging.getLogger("knoux.signal.download")


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
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
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    temporary.replace(path)
    return path


def _log_event(event: str, **fields: object) -> None:
    logger.info(json.dumps({"event": event, **fields}, ensure_ascii=False, default=str, sort_keys=True))


def _retry_delay(attempt: int, response: httpx.Response | None = None) -> float:
    """Return a bounded retry delay and honor numeric Retry-After on 429."""
    if response is not None and response.status_code == 429:
        raw = response.headers.get("retry-after")
        if raw:
            try:
                return min(300.0, max(0.0, float(raw)))
            except ValueError:
                pass
    return min(60.0, 0.5 * (2 ** (attempt - 1)))


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

    max_retries = max(1, int(cfg.get("max_retries", 5)))
    timeout = float(cfg.get("timeout_seconds", 120))
    chunk_size = int(cfg.get("chunk_size_bytes", 65536))
    user_agent = str(cfg.get("user_agent", "KNOuX-Signal/1.1 lawful-data-ingestion"))
    base_headers = {"User-Agent": user_agent, "Accept-Encoding": "identity"}

    last_error: Exception | None = None
    last_http_status = 0
    last_content_type: str | None = None
    for attempt in range(1, max_retries + 1):
        resume_at = tmp.stat().st_size if tmp.exists() else 0
        headers = dict(base_headers)
        if resume_at:
            headers["Range"] = f"bytes={resume_at}-"

        try:
            digest = hashlib.sha256()
            if resume_at:
                with tmp.open("rb") as existing:
                    for chunk in iter(lambda: existing.read(chunk_size), b""):
                        digest.update(chunk)

            with httpx.Client(headers=headers, timeout=timeout, follow_redirects=True) as client:
                with client.stream("GET", url) as response:
                    last_http_status = response.status_code
                    last_content_type = response.headers.get("content-type")
                    if response.status_code == 416 and resume_at:
                        tmp.unlink(missing_ok=True)
                        raise httpx.HTTPStatusError("Range rejected; restart required", request=response.request, response=response)
                    response.raise_for_status()

                    append = bool(resume_at and response.status_code == 206)
                    if resume_at and not append:
                        resume_at = 0
                        digest = hashlib.sha256()
                    mode = "ab" if append else "wb"
                    size = resume_at
                    with tmp.open(mode) as handle:
                        for chunk in response.iter_bytes(chunk_size=chunk_size):
                            if not chunk:
                                continue
                            handle.write(chunk)
                            digest.update(chunk)
                            size += len(chunk)

                    status = response.status_code
                    content_type = response.headers.get("content-type")
                    accept_ranges = response.headers.get("accept-ranges")

            got_sha = digest.hexdigest()
            if expected_sha256 and got_sha.lower() != expected_sha256.lower():
                tmp.unlink(missing_ok=True)
                raise ValueError(f"SHA-256 mismatch for {dataset_id}: expected={expected_sha256} got={got_sha}")

            tmp.replace(dest)
            manifest = {
                "dataset_id": dataset_id,
                "source_url": source_url,
                "direct_download_url": url,
                "publisher": publisher,
                "original_filename": filename,
                "local_filename": str(dest),
                "license_url": license_url,
                "country_coverage": countries,
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "file_size_bytes": size,
                "sha256": got_sha,
                "http_status": status,
                "content_type": content_type,
                "accept_ranges": accept_ranges,
                "resumed": append,
                "status": "downloaded",
            }
            save_manifest(dataset_id, manifest)
            _log_event("download_complete", dataset_id=dataset_id, bytes=size, sha256=got_sha, resumed=append)
            return manifest
        except httpx.HTTPStatusError as exc:
            last_error = exc
            last_http_status = exc.response.status_code
            last_content_type = exc.response.headers.get("content-type")
            delay = _retry_delay(attempt, exc.response)
            _log_event(
                "download_retry",
                dataset_id=dataset_id,
                attempt=attempt,
                http_status=last_http_status,
                retry_after_seconds=delay,
                error=str(exc),
            )
            if attempt < max_retries:
                time.sleep(delay)
                continue
            break
        except (httpx.HTTPError, OSError) as exc:
            last_error = exc
            delay = _retry_delay(attempt)
            _log_event(
                "download_retry",
                dataset_id=dataset_id,
                attempt=attempt,
                retry_after_seconds=delay,
                error=str(exc),
            )
            if attempt < max_retries:
                time.sleep(delay)
                continue
            break
        except ValueError as exc:
            last_error = exc
            _log_event("download_integrity_failure", dataset_id=dataset_id, error=str(exc))
            break

    failure = {
        "dataset_id": dataset_id,
        "source_url": source_url,
        "direct_download_url": url,
        "publisher": publisher,
        "original_filename": filename,
        "local_filename": str(tmp),
        "license_url": license_url,
        "country_coverage": countries,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "file_size_bytes": tmp.stat().st_size if tmp.exists() else 0,
        "sha256": sha256_file(tmp) if tmp.exists() else "",
        "http_status": last_http_status,
        "content_type": last_content_type,
        "status": "failed",
        "error_message": str(last_error) if last_error else "unknown download failure",
    }
    save_manifest(dataset_id, failure)
    _log_event(
        "download_failed",
        dataset_id=dataset_id,
        http_status=last_http_status,
        error=failure["error_message"],
    )
    raise RuntimeError(f"Download failed for {dataset_id}: {failure['error_message']}") from last_error
