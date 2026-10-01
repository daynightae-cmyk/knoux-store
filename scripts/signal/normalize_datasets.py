"""Memory-bounded phone normalization for KNOuX Signal.

CSV is processed in Polars batches, Parquet in Arrow record batches and NDJSON
line-by-line. A disk-backed SQLite uniqueness index prevents multi-million-row
inputs from requiring an in-memory ``set`` of all phone numbers.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import tempfile
from pathlib import Path
from typing import Iterator

import phonenumbers
import polars as pl
import pyarrow as pa
import pyarrow.parquet as pq

from .config import PROCESSED_DIR

BATCH_SIZE = 50_000
SMALL_JSON_LIMIT_BYTES = 64 * 1024 * 1024


def normalize_phone(value: object, default_region: str | None) -> tuple[str, bool, str, str]:
    raw = "" if value is None else str(value).strip()
    if not raw:
        return "", False, "", "unknown"
    try:
        parsed = phonenumbers.parse(raw, default_region)
    except phonenumbers.NumberParseException:
        return "", False, "", "unknown"
    if not phonenumbers.is_valid_number(parsed):
        return "", False, "", "unknown"
    e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    country = phonenumbers.region_code_for_number(parsed) or ""
    number_type = phonenumbers.number_type(parsed)
    type_map = {
        phonenumbers.PhoneNumberType.MOBILE: "mobile",
        phonenumbers.PhoneNumberType.FIXED_LINE: "fixed",
        phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE: "fixed_or_mobile",
        phonenumbers.PhoneNumberType.VOIP: "voip",
        phonenumbers.PhoneNumberType.TOLL_FREE: "toll_free",
        phonenumbers.PhoneNumberType.PREMIUM_RATE: "premium_rate",
    }
    return e164, True, country, type_map.get(number_type, "unknown")


def _csv_batches(path: Path, batch_size: int) -> Iterator[pl.DataFrame]:
    reader = pl.read_csv_batched(
        path,
        batch_size=batch_size,
        infer_schema_length=10_000,
        truncate_ragged_lines=True,
    )
    while True:
        batches = reader.next_batches(1)
        if not batches:
            return
        yield batches[0]


def _parquet_batches(path: Path, batch_size: int) -> Iterator[pl.DataFrame]:
    parquet = pq.ParquetFile(path)
    for batch in parquet.iter_batches(batch_size=batch_size):
        yield pl.from_arrow(batch)


def _ndjson_batches(path: Path, batch_size: int) -> Iterator[pl.DataFrame]:
    pending: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            pending.append(json.loads(stripped))
            if len(pending) >= batch_size:
                yield pl.DataFrame(pending)
                pending = []
    if pending:
        yield pl.DataFrame(pending)


def iter_batches(path: Path, batch_size: int = BATCH_SIZE) -> Iterator[pl.DataFrame]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        yield from _csv_batches(path, batch_size)
    elif suffix == ".parquet":
        yield from _parquet_batches(path, batch_size)
    elif suffix in {".ndjson", ".jsonl"}:
        yield from _ndjson_batches(path, batch_size)
    elif suffix == ".json" and path.stat().st_size <= SMALL_JSON_LIMIT_BYTES:
        frame = pl.read_json(path)
        for offset in range(0, frame.height, batch_size):
            yield frame.slice(offset, batch_size)
    else:
        raise ValueError(
            f"Unsupported/unsafe input format for streaming: {suffix}. "
            "Large JSON arrays must be converted to NDJSON or Parquet first."
        )


def normalize_file(
    input_path: Path,
    *,
    phone_column: str,
    default_region: str | None,
    output_path: Path | None = None,
    batch_size: int = BATCH_SIZE,
) -> Path:
    input_path = Path(input_path)
    output = output_path or (PROCESSED_DIR / f"{input_path.stem}_normalized.parquet")
    output.parent.mkdir(parents=True, exist_ok=True)

    writer: pq.ParquetWriter | None = None
    rows_seen = 0
    rows_valid = 0
    rows_unique = 0

    with tempfile.TemporaryDirectory(prefix="knoux-signal-dedupe-") as temp_dir:
        db = sqlite3.connect(Path(temp_dir) / "seen.sqlite3")
        db.execute("pragma journal_mode=wal")
        db.execute("create table seen(phone_e164 text primary key)")

        try:
            for frame in iter_batches(input_path, batch_size=batch_size):
                if phone_column not in frame.columns:
                    raise KeyError(f"Missing phone column {phone_column!r}; columns={frame.columns}")
                rows_seen += frame.height
                normalized = [normalize_phone(value, default_region) for value in frame[phone_column].to_list()]
                e164 = [item[0] for item in normalized]
                valid = [item[1] for item in normalized]
                country = [item[2] for item in normalized]
                line_type = [item[3] for item in normalized]
                rows_valid += sum(valid)

                accepted: list[bool] = []
                with db:
                    for is_valid, phone in zip(valid, e164):
                        if not is_valid or not phone:
                            accepted.append(False)
                            continue
                        cursor = db.execute("insert or ignore into seen(phone_e164) values (?)", (phone,))
                        accepted.append(cursor.rowcount == 1)

                batch = frame.with_columns(
                    pl.Series("phone_e164", e164),
                    pl.Series("phone_valid", valid),
                    pl.Series("detected_country", country),
                    pl.Series("line_type", line_type),
                    pl.Series("_signal_unique", accepted),
                ).filter(pl.col("phone_valid") & pl.col("_signal_unique")).drop("_signal_unique")

                if batch.is_empty():
                    continue
                rows_unique += batch.height
                arrow_table = batch.to_arrow()
                if writer is None:
                    writer = pq.ParquetWriter(output, arrow_table.schema, compression="zstd")
                writer.write_table(arrow_table)
        finally:
            if writer is not None:
                writer.close()
            db.close()

    if writer is None:
        pa_table = pa.table({
            "phone_e164": pa.array([], type=pa.string()),
            "phone_valid": pa.array([], type=pa.bool_()),
            "detected_country": pa.array([], type=pa.string()),
            "line_type": pa.array([], type=pa.string()),
        })
        pq.write_table(pa_table, output, compression="zstd")

    print(f"NORMALIZED rows_seen={rows_seen} valid={rows_valid} unique={rows_unique}")
    print(f"OUTPUT {output}")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize Signal phone datasets to E.164 in bounded memory")
    parser.add_argument("--input", required=True)
    parser.add_argument("--phone-col", default="phone")
    parser.add_argument("--region", default=None)
    parser.add_argument("--output", default=None)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    args = parser.parse_args()
    normalize_file(
        Path(args.input),
        phone_column=args.phone_col,
        default_region=args.region,
        output_path=Path(args.output) if args.output else None,
        batch_size=max(1_000, args.batch_size),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
