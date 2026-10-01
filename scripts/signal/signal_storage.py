"""External storage routing for large KNOuX Signal artifacts.

The repository worktree lives on a small volume, so multi-gigabyte raw artifacts and
bulk parquet outputs must not be written under ``data/signal``. This module resolves a
per-source storage root and refuses to place an artifact on a volume without enough
free space.

Rules:

* Small artifacts (manifests, checksums, schemas, fixtures) stay in the worktree.
* Any source may be redirected to an external root via
  ``global.external_storage_root`` plus an optional per-source
  ``storage_root``/``external: true`` override in ``config/signal_sources.yaml``.
* ``ensure_free_space`` is called before every large write so an acquisition never
  silently fills a volume.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from .config import DATA_ROOT, PROCESSED_DIR, PROJECT_ROOT, RAW_DIR, load_config

DEFAULT_EXTERNAL_ROOT = Path(r"C:\KNOuX-Signal-Data")
EXTERNAL_THRESHOLD_BYTES = 1024**3


def _free_bytes(path: Path) -> int:
    probe = path if path.exists() else path.parent
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    return shutil.disk_usage(probe).free


def free_bytes(path: Path) -> int:
    return _free_bytes(path)


def external_root(config: dict | None = None) -> Path | None:
    cfg = config or load_config()
    configured = (cfg.get("global") or {}).get("external_storage_root")
    if not configured:
        return DEFAULT_EXTERNAL_ROOT
    return Path(configured)


def uses_external_storage(source_id: str, config: dict | None = None) -> bool:
    """Return True when *source_id* artifacts must live outside the worktree."""
    cfg = config or load_config()
    for raw in cfg.get("sources", []) or []:
        if raw.get("id") != source_id:
            continue
        if raw.get("external") is True:
            return True
        if raw.get("storage_root"):
            return True
        size_hint = raw.get("expected_artifact_bytes") or 0
        return int(size_hint) >= EXTERNAL_THRESHOLD_BYTES
    # Unregistered sources default to external: new bulk sources are the common case
    # and the worktree volume has limited capacity.
    return True


def storage_root(source_id: str, config: dict | None = None) -> Path:
    cfg = config or load_config()
    for raw in cfg.get("sources", []) or []:
        if raw.get("id") == source_id and raw.get("storage_root"):
            return Path(raw["storage_root"])
    root = external_root(cfg) or DEFAULT_EXTERNAL_ROOT
    return root


def raw_dir(source_id: str, config: dict | None = None) -> Path:
    cfg = config or load_config()
    if uses_external_storage(source_id, cfg):
        return storage_root(source_id, cfg) / "raw" / source_id
    return RAW_DIR / source_id


def processed_dir(source_id: str, config: dict | None = None) -> Path:
    cfg = config or load_config()
    if uses_external_storage(source_id, cfg):
        return storage_root(source_id, cfg) / "processed" / source_id
    return PROCESSED_DIR / source_id


def staging_dir(source_id: str, config: dict | None = None) -> Path:
    cfg = config or load_config()
    if uses_external_storage(source_id, cfg):
        return storage_root(source_id, cfg) / "staging" / source_id
    return DATA_ROOT / "staging" / source_id


def manifests_dir(source_id: str | None = None, config: dict | None = None) -> Path:
    """Manifests always stay in the worktree: they are small and they are reviewed in git."""
    return DATA_ROOT / "manifests" if source_id is None else DATA_ROOT / "manifests" / source_id


def describe(source_id: str, config: dict | None = None) -> dict[str, str]:
    root = raw_dir(source_id, config)
    return {
        "project_root": str(PROJECT_ROOT),
        "raw": str(root),
        "processed": str(processed_dir(source_id, config)),
        "staging": str(staging_dir(source_id, config)),
        "manifests": str(manifests_dir(source_id, config)),
    }


class InsufficientSpaceError(RuntimeError):
    """Raised when a volume cannot hold an artifact about to be written."""


def ensure_free_space(required_bytes: int, target: Path | None = None) -> None:
    """Fail loudly before a large write instead of filling the volume."""
    if required_bytes <= 0:
        return
    probe = target
    if probe is None:
        probe = external_root() or RAW_DIR
    if probe.suffix:
        probe = probe.parent
    available = _free_bytes(probe)
    if available < required_bytes:
        raise InsufficientSpaceError(
            f"{probe}: need {required_bytes / 1024**3:.2f} GiB free, have {available / 1024**3:.2f} GiB. "
            "Repoint global.external_storage_root or free space before retrying."
        )
