"""Atomic central manifest for Signal datasets.

Per-artifact manifests in ``data/signal/manifests/<dataset>/manifest.json``
remain the download truth. This file provides one searchable dataset index and
does not replace ``signal_source_catalog`` in Supabase.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .config import MANIFESTS_DIR
from .models import DatasetManifestEntry

MANIFEST_PATH = MANIFESTS_DIR / "datasets.manifest.json"


class DatasetManifest:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or MANIFEST_PATH
        self._entries: dict[str, DatasetManifestEntry] = {}
        self._load()

    @property
    def entries(self) -> tuple[DatasetManifestEntry, ...]:
        return tuple(sorted(self._entries.values(), key=lambda item: item.dataset_key))

    def get(self, dataset_key: str) -> DatasetManifestEntry | None:
        return self._entries.get(dataset_key)

    def upsert(self, entry: DatasetManifestEntry) -> None:
        entry.updated_at = datetime.now(timezone.utc)
        self._entries[entry.dataset_key] = entry
        self.save()

    def _load(self) -> None:
        if not self.path.exists():
            return
        payload = json.loads(self.path.read_text(encoding="utf-8"))
        for raw in payload.get("datasets", []):
            entry = DatasetManifestEntry.model_validate(raw)
            self._entries[entry.dataset_key] = entry

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": "1.0.0",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "datasets": [entry.model_dump(mode="json") for entry in self.entries],
        }
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        temporary.replace(self.path)
