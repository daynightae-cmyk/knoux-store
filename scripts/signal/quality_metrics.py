"""Memory-bounded quality inspection for Signal tabular artifacts."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import polars as pl

SMALL_JSON_LIMIT_BYTES = 64 * 1024 * 1024


def _lazy_frame(path: Path) -> pl.LazyFrame | None:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return pl.scan_csv(path, infer_schema_length=10_000, truncate_ragged_lines=True)
    if suffix == ".parquet":
        return pl.scan_parquet(path)
    if suffix in {".ndjson", ".jsonl"}:
        return pl.scan_ndjson(path)
    return None


def inspect_tabular(path: Path, *, phone_column: str | None = None, name_column: str | None = None) -> dict[str, Any]:
    path = Path(path)
    result: dict[str, Any] = {
        "file": path.name,
        "size_bytes": path.stat().st_size,
        "format": path.suffix.lower().lstrip("."),
    }

    lazy = _lazy_frame(path)
    if lazy is None:
        if path.suffix.lower() == ".json" and path.stat().st_size <= SMALL_JSON_LIMIT_BYTES:
            frame = pl.read_json(path)
            result.update({"total_rows": frame.height, "columns": frame.columns})
            return result
        result["error"] = (
            "Large JSON arrays are intentionally not loaded into RAM. Convert the artifact "
            "to NDJSON or Parquet first."
        )
        return result

    try:
        schema = lazy.collect_schema()
        columns = list(schema.names())
        result["columns"] = columns
        phone_column = phone_column or next((c for c in columns if "phone" in c.lower() or "tel" in c.lower()), None)
        name_column = name_column or next((c for c in columns if "name" in c.lower()), None)

        expressions: list[pl.Expr] = [pl.len().alias("total_rows")]
        if phone_column and phone_column in columns:
            expressions.extend([
                pl.col(phone_column).is_not_null().sum().alias("phone_rows"),
                pl.col(phone_column).drop_nulls().n_unique().alias("unique_phone_values"),
            ])
        if name_column and name_column in columns:
            expressions.append(pl.col(name_column).is_not_null().sum().alias("name_rows"))

        stats = lazy.select(expressions).collect(streaming=True).row(0, named=True)
        result.update({key: int(value) if isinstance(value, int) else value for key, value in stats.items()})
        result["phone_column"] = phone_column
        result["name_column"] = name_column
    except Exception as exc:  # caller needs structured inspection failure, not a crash
        result["error"] = str(exc)
    return result
