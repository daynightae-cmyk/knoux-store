"""Deterministic fingerprints for Signal ingestion records."""
from __future__ import annotations

import hashlib
import json
from typing import Any, Iterable


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def stable_fingerprint(*parts: object) -> str:
    """Stable SHA-256 across Python/Polars versions.

    Do not replace this with Polars ``.hash()``: Polars does not promise hash
    stability across versions.
    """
    payload = "\x1f".join(canonical_json(part) for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def deduplicate_dicts(
    rows: Iterable[dict[str, Any]],
    *,
    key_fields: tuple[str, ...],
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output: list[dict[str, Any]] = []
    for row in rows:
        fingerprint = stable_fingerprint(*(row.get(field) for field in key_fields))
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        output.append(row)
    return output
