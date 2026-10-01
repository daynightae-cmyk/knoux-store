from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .config import load_config

VALID_STATUSES = {"APPROVED", "QUARANTINED", "REJECTED"}


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    status: str
    enabled: bool
    priority: int
    raw: dict[str, Any]


class SourceRegistry:
    def __init__(self) -> None:
        cfg = load_config()
        self.global_config = cfg.get("global", {})
        self.sources: list[Source] = []
        for raw in cfg.get("sources", []):
            status = str(raw.get("status", "")).upper()
            if status not in VALID_STATUSES:
                raise ValueError(f"Invalid source status for {raw.get('id')}: {status}")
            self.sources.append(
                Source(
                    id=str(raw["id"]),
                    name=str(raw.get("name", raw["id"])),
                    status=status,
                    enabled=bool(raw.get("enabled", False)),
                    priority=int(raw.get("priority", 99)),
                    raw=raw,
                )
            )

    @property
    def executable(self) -> list[Source]:
        return sorted(
            [s for s in self.sources if s.status == "APPROVED" and s.enabled],
            key=lambda s: (s.priority, s.id),
        )

    @property
    def quarantined(self) -> list[Source]:
        return [s for s in self.sources if s.status == "QUARANTINED"]

    @property
    def rejected(self) -> list[Source]:
        return [s for s in self.sources if s.status == "REJECTED"]

    def get(self, source_id: str) -> Source | None:
        return next((s for s in self.sources if s.id == source_id), None)

    def assert_downloadable(self, source_id: str) -> Source:
        source = self.get(source_id)
        if source is None:
            raise KeyError(f"Unknown source: {source_id}")
        if source.status != "APPROVED" or not source.enabled:
            raise PermissionError(
                f"Source {source_id} is {source.status} / enabled={source.enabled}; download blocked."
            )
        return source

    def summary(self) -> str:
        counts = {
            status: sum(1 for s in self.sources if s.status == status)
            for status in sorted(VALID_STATUSES)
        }
        lines = [
            "KNOuX SIGNAL source registry",
            f"APPROVED={counts['APPROVED']}  QUARANTINED={counts['QUARANTINED']}  REJECTED={counts['REJECTED']}",
            f"EXECUTABLE={len(self.executable)}",
        ]
        for source in sorted(self.sources, key=lambda s: (s.status, s.priority, s.id)):
            marker = "RUN" if source in self.executable else "HOLD"
            lines.append(f"[{marker}] {source.status:11} p{source.priority:02d} {source.id} — {source.name}")
        return "\n".join(lines)
