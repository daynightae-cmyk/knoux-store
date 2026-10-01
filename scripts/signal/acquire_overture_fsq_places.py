"""Acquire, normalize, and manifest commercial POIs from Overture Maps x Foursquare OS Places.

Uses DuckDB HTTP range queries over remote Apache 2.0 Parquet to extract
all commercial places in the 7 target countries (EG, AE, SA, KW, QA, BH, OM),
normalizes dual phone channels (Overture_phones + FSQ_tel) to E.164,
deduplicates and manifests the corpus, and prepares database staging batches.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import duckdb
import phonenumbers
import polars as pl

from .config import DATA_ROOT, LOGS_DIR, MANIFESTS_DIR, PROCESSED_DIR, RAW_DIR
from .deduplication import stable_fingerprint

sys.stdout.reconfigure(encoding="utf-8")

TARGET_REGIONS = {"EG", "AE", "SA", "KW", "QA", "BH", "OM"}
SOURCE_KEY = "overture_foursquare_places"
SOURCE_URL = (
    "https://huggingface.co/datasets/Placekey/"
    "FOURSQUARE_OPEN_SOURCE_PLACES_x_OVERTURE_INNER_JOIN/resolve/main/data.snappy.parquet"
)
DATASET_ID = "placekey-overture-foursquare-mena"
LICENSE = "Apache-2.0"
PUBLISHER = "Placekey / Foursquare Open Source Places / Overture Maps Foundation"


def parse_and_normalize_phones(
    raw_overture: Any, raw_fsq: Any, country_code: str
) -> list[tuple[str, str]]:
    """Extract and validate E.164 numbers from Overture and Foursquare phone fields."""
    candidates = []

    # Overture phones might be string list or JSON string
    if raw_overture:
        ov_str = str(raw_overture)
        # Match potential phone patterns or JSON strings
        clean_items = re.findall(r"[\+\d\s\(\)\-\.]{7,25}", ov_str)
        candidates.extend(clean_items)

    if raw_fsq:
        fsq_str = str(raw_fsq)
        candidates.append(fsq_str)

    results = []
    seen = set()
    for cand in candidates:
        clean = re.sub(r"[^\d\+]", "", cand)
        if len(clean) < 7:
            continue
        test_val = clean if clean.startswith("+") else ("+" + clean)
        for hint in [country_code] + list(TARGET_REGIONS) + [None]:
            try:
                parsed = phonenumbers.parse(test_val, hint)
                if phonenumbers.is_valid_number(parsed):
                    reg = phonenumbers.region_code_for_number(parsed)
                    if reg in TARGET_REGIONS:
                        e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                        if e164 not in seen:
                            seen.add(e164)
                            results.append((e164, reg))
                        break
            except Exception:
                pass
    return results


def run_acquisition(dry_run: bool = False) -> dict[str, Any]:
    raw_dir = RAW_DIR / "overture-fsq-places"
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw_parquet_path = raw_dir / "overture_fsq_mena.parquet"
    processed_parquet_path = PROCESSED_DIR / "ready" / "overture_fsq_places.parquet"
    processed_parquet_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path = MANIFESTS_DIR / "overture_fsq_places.manifest.json"
    staging_dir = PROCESSED_DIR / "ready" / "stage_payload_overture_fsq"
    staging_dir.mkdir(parents=True, exist_ok=True)

    print(f"[{datetime.now(timezone.utc).isoformat()}] Querying remote Overture x Foursquare Parquet via DuckDB...")
    start_time = time.time()

    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")

    extract_query = """
    SELECT 
        placekey,
        Overture_id,
        "Foursquare Open Source Places_fsq_place_id" as fsq_id,
        Overture_country,
        Overture_selected_name,
        "Foursquare Open Source Places_name" as fsq_name,
        Overture_phones,
        "Foursquare Open Source Places_tel" as fsq_tel,
        Overture_categories,
        "Foursquare Open Source Places_fsq_category_labels" as fsq_categories,
        Overture_locality,
        "Foursquare Open Source Places_locality" as fsq_locality,
        "Foursquare Open Source Places_address" as fsq_address,
        Overture_websites,
        "Foursquare Open Source Places_website" as fsq_website
    FROM parquet_scan(?)
    WHERE Overture_country IN ('EG', 'AE', 'SA', 'KW', 'QA', 'BH', 'OM')
    """

    df_raw = con.execute(extract_query, [SOURCE_URL]).pl()
    query_duration = round(time.time() - start_time, 2)
    print(f"Retrieved {len(df_raw)} records in {query_duration}s.")

    stats = {
        "total_extracted_records": len(df_raw),
        "valid_phone_records": 0,
        "unique_e164_phones": 0,
        "country_counts": {c: 0 for c in TARGET_REGIONS},
    }

    normalized_records = []
    seen_unique_phones = set()

    for row in df_raw.iter_rows(named=True):
        country = row["Overture_country"]
        raw_ov_phones = row["Overture_phones"]
        raw_fsq_tel = row["fsq_tel"]

        valid_phones = parse_and_normalize_phones(raw_ov_phones, raw_fsq_tel, country)
        if not valid_phones:
            continue

        name = row["Overture_selected_name"] or row["fsq_name"] or ""
        name = name.strip()
        if not name:
            continue

        locality = row["Overture_locality"] or row["fsq_locality"] or None
        address = row["fsq_address"] or None
        website = row["fsq_website"] or row["Overture_websites"] or None
        category = str(row["Overture_categories"] or row["fsq_categories"] or "")

        for e164, region in valid_phones:
            stats["valid_phone_records"] += 1
            stats["country_counts"][region] = stats["country_counts"].get(region, 0) + 1
            seen_unique_phones.add(e164)

            record_id = str(row["placekey"] or row["Overture_id"] or row["fsq_id"] or "")
            if not record_id:
                record_id = stable_fingerprint(SOURCE_KEY, e164, name)

            record = {
                "source_key": SOURCE_KEY,
                "source_record_id": f"placekey:{record_id}:{e164}",
                "country_code": region,
                "phone_e164": e164,
                "record_kind": "business_phone",
                "business_name": name,
                "category": category[:200] if category else None,
                "locality": locality,
                "addresses": address,
                "source_url": website or SOURCE_URL,
                "provenance": {
                    "dataset_id": DATASET_ID,
                    "license": LICENSE,
                    "publisher": PUBLISHER,
                    "placekey": row["placekey"],
                    "overture_id": row["Overture_id"],
                    "fsq_place_id": row["fsq_id"],
                    "raw_ov_phones": str(raw_ov_phones) if raw_ov_phones else None,
                    "raw_fsq_tel": str(raw_fsq_tel) if raw_fsq_tel else None,
                },
            }
            normalized_records.append(record)

    stats["unique_e164_phones"] = len(seen_unique_phones)
    total_duration = round(time.time() - start_time, 2)
    print(f"Normalized {stats['valid_phone_records']} phone records ({stats['unique_e164_phones']} unique E.164).")
    print(f"Country breakdown: {stats['country_counts']}")

    if dry_run:
        return stats

    # Save raw extracted Parquet
    df_raw.write_parquet(raw_parquet_path, compression="snappy")
    raw_size_bytes = raw_parquet_path.stat().st_size
    raw_sha256 = hashlib.sha256(raw_parquet_path.read_bytes()).hexdigest()
    print(f"Saved raw Parquet: {raw_parquet_path} ({raw_size_bytes} bytes)")

    # Save normalized Parquet
    df_norm = pl.DataFrame(normalized_records)
    df_norm.write_parquet(processed_parquet_path, compression="snappy")
    norm_size_bytes = processed_parquet_path.stat().st_size
    norm_sha256 = hashlib.sha256(processed_parquet_path.read_bytes()).hexdigest()
    print(f"Saved normalized Parquet: {processed_parquet_path} ({norm_size_bytes} bytes, {len(df_norm)} rows)")

    # Prepare staging batches
    batch_size = 500
    batch_idx = 0
    for i in range(0, len(normalized_records), batch_size):
        chunk = normalized_records[i : i + batch_size]
        batch_file = staging_dir / f"batch_{batch_idx:03d}.json"
        with open(batch_file, "w", encoding="utf-8") as bf:
            json.dump(chunk, bf, ensure_ascii=False, indent=2)
        batch_idx += 1
    print(f"Prepared {batch_idx} staging batch files in {staging_dir}")

    # Generate Manifest
    manifest = {
        "dataset_key": "overture_foursquare_places",
        "dataset_id": DATASET_ID,
        "title": "Overture Maps x Foursquare Open Source Places (MENA 7 Countries)",
        "source_key": SOURCE_KEY,
        "publisher": PUBLISHER,
        "license": LICENSE,
        "license_url": "https://www.apache.org/licenses/LICENSE-2.0",
        "source_url": SOURCE_URL,
        "acquired_at": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": total_duration,
        "raw_artifact": {
            "path": str(raw_parquet_path.relative_to(DATA_ROOT)),
            "size_bytes": raw_size_bytes,
            "sha256": raw_sha256,
            "format": "parquet",
        },
        "processed_artifact": {
            "path": str(processed_parquet_path.relative_to(DATA_ROOT)),
            "size_bytes": norm_size_bytes,
            "sha256": norm_sha256,
            "format": "parquet",
            "row_count": len(df_norm),
            "unique_phones": stats["unique_e164_phones"],
        },
        "stats": stats,
    }
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, ensure_ascii=False, indent=2)
    print(f"Wrote manifest: {manifest_path}")

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Acquire Overture x Foursquare MENA Places")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    stats = run_acquisition(dry_run=args.dry_run)
    print("=== SUMMARY STATS ===")
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
