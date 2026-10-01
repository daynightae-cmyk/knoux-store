"""Acquire, normalize, and manifest public target entities from OpenSanctions.

Streams OpenSanctions `targets.simple.csv` over HTTP, extracts entities
in the 7 target countries (EG, AE, SA, KW, QA, BH, OM) or with target calling codes,
normalizes phone numbers to E.164, classifies Person vs Business, preserves aliases
and address evidence, and outputs normalized Parquet and staging payloads.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import phonenumbers
import polars as pl

from .config import DATA_ROOT, LOGS_DIR, MANIFESTS_DIR, PROCESSED_DIR, RAW_DIR
from .deduplication import stable_fingerprint

sys.stdout.reconfigure(encoding="utf-8")

TARGET_REGIONS = {"EG", "AE", "SA", "KW", "QA", "BH", "OM"}
TARGET_CC_LOWER = {r.lower() for r in TARGET_REGIONS}
CALLING_CODES = {
    "20": "EG",
    "971": "AE",
    "966": "SA",
    "965": "KW",
    "974": "QA",
    "973": "BH",
    "968": "OM",
}

SOURCE_KEY = "opensanctions_targets"
SOURCE_URL = "https://data.opensanctions.org/datasets/latest/default/targets.simple.csv"
DATASET_ID = "opensanctions-targets-mena"
LICENSE = "CC-BY-4.0"
PUBLISHER = "OpenSanctions Community"


def normalize_phone(phone_str: str, country_hints: list[str]) -> list[tuple[str, str]]:
    """Parse raw phone string, validate, and return list of (e164, region)."""
    results = []
    # Split possible multiple phones
    candidates = [p.strip() for p in phone_str.replace(",", ";").split(";") if p.strip()]
    for cand in candidates:
        clean = cand.replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace(".", "")
        if not clean:
            continue
        test_val = clean if clean.startswith("+") else ("+" + clean)
        # Try country hints first, then target regions, then None
        hints_to_try = [h.upper() for h in country_hints if h] + list(TARGET_REGIONS) + [None]
        seen_regions = set()
        for hint in hints_to_try:
            if hint in seen_regions:
                continue
            seen_regions.add(hint)
            try:
                parsed = phonenumbers.parse(test_val, hint)
                if phonenumbers.is_valid_number(parsed):
                    reg = phonenumbers.region_code_for_number(parsed)
                    if reg in TARGET_REGIONS:
                        e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                        results.append((e164, reg))
                        break
            except Exception:
                pass
    return results


def run_acquisition(dry_run: bool = False, max_rows: int | None = None) -> dict[str, Any]:
    raw_dir = RAW_DIR / "opensanctions-targets"
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw_csv_path = raw_dir / "targets_mena.csv"
    processed_parquet_path = PROCESSED_DIR / "ready" / "opensanctions_targets.parquet"
    processed_parquet_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path = MANIFESTS_DIR / "opensanctions_targets.manifest.json"
    staging_dir = PROCESSED_DIR / "ready" / "stage_payload_opensanctions"
    staging_dir.mkdir(parents=True, exist_ok=True)

    print(f"[{datetime.now(timezone.utc).isoformat()}] Starting OpenSanctions stream from {SOURCE_URL}...")
    start_time = time.time()

    sha256_hasher = hashlib.sha256()
    stats = {
        "total_streamed_rows": 0,
        "matched_entities": 0,
        "valid_phone_records": 0,
        "person_entities": 0,
        "business_entities": 0,
        "country_counts": {c: 0 for c in TARGET_REGIONS},
    }

    raw_matches = []
    normalized_records = []

    with httpx.stream("GET", SOURCE_URL, follow_redirects=True, timeout=300) as resp:
        resp.raise_for_status()
        lines = resp.iter_lines()
        header_line = next(lines)
        sha256_hasher.update(header_line.encode("utf-8") + b"\n")
        headers = next(csv.reader(io.StringIO(header_line)))
        hmap = {h: i for i, h in enumerate(headers)}

        for line in lines:
            if not line:
                continue
            sha256_hasher.update(line.encode("utf-8") + b"\n")
            stats["total_streamed_rows"] += 1

            if max_rows and stats["total_streamed_rows"] > max_rows:
                break

            if stats["total_streamed_rows"] % 200000 == 0:
                print(f"Streamed {stats['total_streamed_rows']} rows... Matched entities: {stats['matched_entities']}")

            # In simple.csv, phones column is index 9
            try:
                row = next(csv.reader([line]))
            except Exception:
                continue

            phones_raw = row[hmap["phones"]] if "phones" in hmap and len(row) > hmap["phones"] else ""
            if not phones_raw.strip():
                continue

            countries_raw = row[hmap["countries"]] if "countries" in hmap and len(row) > hmap["countries"] else ""
            row_countries = [c.strip().lower() for c in countries_raw.split(";") if c.strip()]
            is_target_geo = bool(set(row_countries) & TARGET_CC_LOWER)

            target_phones = normalize_phone(phones_raw, row_countries)
            if not target_phones and not is_target_geo:
                continue

            stats["matched_entities"] += 1
            raw_matches.append(row)

            entity_id = row[hmap["id"]] if "id" in hmap else ""
            schema = row[hmap["schema"]] if "schema" in hmap else "Entity"
            name = row[hmap["name"]] if "name" in hmap else ""
            aliases_raw = row[hmap["aliases"]] if "aliases" in hmap else ""
            addresses_raw = row[hmap["addresses"]] if "addresses" in hmap else ""
            country_res = row_countries[0].upper() if row_countries else None

            is_person = schema.lower() == "person"
            if is_person:
                stats["person_entities"] += 1
            else:
                stats["business_entities"] += 1

            # Build record for each valid target phone
            for e164, region in target_phones:
                stats["valid_phone_records"] += 1
                stats["country_counts"][region] = stats["country_counts"].get(region, 0) + 1

                aliases_list = [a.strip() for a in aliases_raw.split(";") if a.strip()]

                record = {
                    "source_key": SOURCE_KEY,
                    "source_record_id": f"opensanctions:{entity_id}:{e164}",
                    "country_code": region,
                    "phone_e164": e164,
                    "record_kind": "person_phone" if is_person else "business_phone",
                    "person_name": name if is_person else None,
                    "business_name": name if not is_person else None,
                    "aliases": "; ".join(aliases_list) if aliases_list else None,
                    "category": f"OpenSanctions:{schema}",
                    "locality": None,
                    "addresses": addresses_raw or None,
                    "source_url": f"https://www.opensanctions.org/entities/{entity_id}/",
                    "provenance": {
                        "dataset_id": DATASET_ID,
                        "license": LICENSE,
                        "publisher": PUBLISHER,
                        "schema": schema,
                        "raw_phones": phones_raw,
                        "entity_id": entity_id,
                        "country_hints": row_countries,
                    },
                }
                normalized_records.append(record)

    duration = round(time.time() - start_time, 2)
    source_sha256 = sha256_hasher.hexdigest()
    print(f"Finished streaming in {duration}s. Total streamed: {stats['total_streamed_rows']}")
    print(f"Matched entities: {stats['matched_entities']}, Valid E.164 phone records: {stats['valid_phone_records']}")
    print(f"Country breakdown: {stats['country_counts']}")

    if dry_run:
        return stats

    # Write raw filtered CSV
    with open(raw_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(raw_matches)
    raw_size_bytes = raw_csv_path.stat().st_size
    raw_sha256 = hashlib.sha256(raw_csv_path.read_bytes()).hexdigest()
    print(f"Saved raw target CSV: {raw_csv_path} ({raw_size_bytes} bytes, sha256={raw_sha256[:16]}...)")

    # Write normalized Parquet
    df = pl.DataFrame(normalized_records)
    # Ensure correct schema matching KNOuX Signal standards
    df.write_parquet(processed_parquet_path, compression="snappy")
    parquet_size_bytes = processed_parquet_path.stat().st_size
    parquet_sha256 = hashlib.sha256(processed_parquet_path.read_bytes()).hexdigest()
    print(f"Saved normalized Parquet: {processed_parquet_path} ({parquet_size_bytes} bytes, {len(df)} rows)")

    # Prepare JSON staging batches
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
        "dataset_key": "opensanctions_targets",
        "dataset_id": DATASET_ID,
        "title": "OpenSanctions Public Entity Targets (MENA 7 Countries)",
        "source_key": SOURCE_KEY,
        "publisher": PUBLISHER,
        "license": LICENSE,
        "license_url": "https://creativecommons.org/licenses/by/4.0/",
        "source_url": SOURCE_URL,
        "acquired_at": datetime.now(timezone.utc).isoformat(),
        "duration_seconds": duration,
        "source_sha256": source_sha256,
        "raw_artifact": {
            "path": str(raw_csv_path.relative_to(DATA_ROOT)),
            "size_bytes": raw_size_bytes,
            "sha256": raw_sha256,
            "format": "csv",
        },
        "processed_artifact": {
            "path": str(processed_parquet_path.relative_to(DATA_ROOT)),
            "size_bytes": parquet_size_bytes,
            "sha256": parquet_sha256,
            "format": "parquet",
            "row_count": len(df),
            "unique_phones": df["phone_e164"].n_unique() if len(df) > 0 else 0,
        },
        "stats": stats,
    }
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, ensure_ascii=False, indent=2)
    print(f"Wrote manifest: {manifest_path}")

    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Acquire and normalize OpenSanctions MENA phone targets")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-rows", type=int, default=None)
    args = parser.parse_args()

    stats = run_acquisition(dry_run=args.dry_run, max_rows=args.max_rows)
    print("=== SUMMARY STATS ===")
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
