"""Bound CLI artifact paths to reviewed storage configuration, including symlinks."""
from pathlib import Path

from .config import DATA_ROOT, PROJECT_ROOT, load_config


def resolve_under(value: str | Path, roots: list[Path]) -> Path:
    candidate = Path(value).resolve()
    # These paths are also interpolated into DuckDB COPY statements.
    if any(character in str(candidate) for character in ("'", "\0", "\n", "\r")):
        raise ValueError("Artifact path contains unsupported characters")
    for root in roots:
        boundary = root.resolve()
        if candidate != boundary and candidate.is_relative_to(boundary):
            return candidate
    raise ValueError("Artifact path escapes the configured Signal storage roots")


def artifact_path(value: str | Path) -> Path:
    config = load_config()
    roots = [DATA_ROOT, Path(r"C:\KNOuX-Signal-Data")]
    configured = (config.get("global") or {}).get("external_storage_root")
    if configured:
        roots.append(Path(configured))
    roots.extend(Path(source["storage_root"]) for source in config.get("sources", []) if source.get("storage_root"))
    return resolve_under(value, roots)


def carrier_map_path(value: str | Path) -> Path:
    return resolve_under(value, [PROJECT_ROOT / "src" / "lib" / "signal" / "generated"])
