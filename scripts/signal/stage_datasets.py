"""Stage normalized business-phone evidence in bounded batches.

This script never promotes directly into public lookup tables. Promotion is a
separate database transaction invoked by ``promote_staged.py``.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Iterator

import httpx
import pyarrow.parquet as pq

from .deduplication import stable_fingerprint
from .sources_registry import SourceRegistry

DEFAULT_BATCH_SIZE = 1000


class SupabaseRest:
    def __init__(self) -> None:
        self.url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key:
            raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
        self.headers = {
            "apikey": self.key,
            "authorization": f"Bearer {self.key}",
            "content-type": "application/json",
            "prefer": "resolution=merge-duplicates,return=representation",
        }

    def source(self, source_key: str) -> dict[str, Any]:
        with httpx.Client(timeout=30) as client:
            response = client.get(
                f"{self.url}/rest/v1/signal_source_catalog",
                params={
                    "source_key": f"eq.{source_key}",
                    "select": "id,source_key,approval_status,enabled,contains",
                },
                headers=self.headers,
            )
            response.raise_for_status()
            rows = response.json()
        if len(rows) != 1:
            raise RuntimeError(f"Source not found in Supabase: {source_key}")
        source = rows[0]
        if source.get("approval_status") != "approved" or not source.get("enabled"):
            raise PermissionError(f"Source is not approved+enabled in Supabase: {source_key}")
        contains = source.get("contains") or {}
        if not isinstance(contains, dict) or not bool(contains.get("phone_business")):
            raise PermissionError(
                f"Source is not governed as business-phone evidence in Supabase: {source_key}"
            )
        return source

    def upsert_dataset(self, payload: dict[str, Any]) -> str:
        headers = dict(self.headers)
        headers["prefer"] = "resolution=merge-duplicates,return=representation"
        with httpx.Client(timeout=30) as client:
            response = client.post(
                f"{self.url}/rest/v1/signal_datasets",
                params={"on_conflict": "dataset_key"},
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            rows = response.json()
        if not rows:
            raise RuntimeError("Dataset upsert returned no row")
        return str(rows[0]["id"])

    def upsert_staging(self, rows: list[dict[str, Any]]) -> None:
        if not rows:
            return
        headers = dict(self.headers)
        headers["prefer"] = "resolution=merge-duplicates,return=minimal"
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{self.url}/rest/v1/signal_source_records_staging",
                params={"on_conflict": "dataset_id,source_record_fingerprint"},
                headers=headers,
                json=rows,
            )
            response.raise_for_status()

    def update_dataset(self, dataset_id: str, payload: dict[str, Any]) -> None:
        headers = dict(self.headers)
        headers["prefer"] = "return=minimal"
        with httpx.Client(timeout=30) as client:
            response = client.patch(
                f"{self.url}/rest/v1/signal_datasets",
                params={"id": f"eq.{dataset_id}"},
                headers=headers,
                json=payload,
            )
            response.raise_for_status()


def parquet_rows(path: Path, batch_size: int) -> Iterator[list[dict[str, Any]]]:
    parquet = pq.ParquetFile(path)
    for batch in parquet.iter_batches(batch_size=batch_size):
        yield batch.to_pylist()


def stage_business_parquet(
    path: Path,
    *,
    source_key: str,
    dataset_key: str,
    title: str,
    batch_size: int = DEFAULT_BATCH_SIZE,
    dry_run: bool = False,
) -> dict[str, int]:
    registry = SourceRegistry()
    source = registry.assert_downloadable(source_key)
    contains = source.raw.get("contains", {})
    if not isinstance(contains, dict) or not bool(contains.get("phone_business")):
        raise PermissionError(
            f"Source {source_key} is not governed as a business-phone source."
        )
    stats = {"seen": 0, "staged": 0, "rejected": 0}

    if dry_run:
        for rows in parquet_rows(path, batch_size):
            stats["seen"] += len(rows)
            for row in rows:
                if row.get("phone_e164") and any(row.get(key) for key in ("business_name", "name", "itemLabel", "title")):
                    stats["staged"] += 1
                else:
                    stats["rejected"] += 1
        return stats

    db = SupabaseRest()
    remote_source = db.source(source_key)
    dataset_id = db.upsert_dataset({
        "dataset_key": dataset_key,
        "source_id": remote_source["id"],
        "title": title,
        "legal_status": "approved",
        "ingestion_status": "staging",
        "countries": [str(value) for value in source.raw.get("countries", []) if value != "GLOBAL"],
        "provenance": {"pipeline": "scripts.signal.stage_datasets", "source_key": source_key},
    })

    for rows in parquet_rows(path, batch_size):
        staged_rows: list[dict[str, Any]] = []
        stats["seen"] += len(rows)
        for row in rows:
            phone = str(row.get("phone_e164") or "").strip()
            name_key = next((key for key in ("business_name", "name", "itemLabel", "title") if row.get(key)), None)
            name = str(row.get(name_key) or "").strip() if name_key else ""
            if not phone.startswith("+") or not name:
                stats["rejected"] += 1
                continue
            source_record_id = str(row.get("source_record_id") or "").strip()
            if not source_record_id:
                source_record_id = stable_fingerprint(source_key, phone, name)
            fingerprint = stable_fingerprint(source_key, source_record_id, phone, name)
            payload = {
                "source_record_id": source_record_id,
                "business_name": name[:300],
                "category": str(row.get("category") or row.get("amenity") or "").strip() or None,
                "locality": str(row.get("locality") or row.get("city") or "").strip() or None,
                "source_url": str(row.get("source_url") or "").strip() or None,
                "line_type": str(row.get("line_type") or "").strip() or None,
            }
            staged_rows.append({
                "dataset_id": dataset_id,
                "source_record_fingerprint": fingerprint,
                "record_kind": "business_phone",
                "raw_phone": str(row.get("phone") or row.get("raw_phone") or phone),
                "phone_e164": phone,
                "country_code": str(row.get("detected_country") or row.get("country_code") or "").strip() or None,
                "payload": payload,
                "status": "staged",
            })
        db.upsert_staging(staged_rows)
        stats["staged"] += len(staged_rows)
        print(f"STAGED {stats['staged']} / seen={stats['seen']} rejected={stats['rejected']}")

    db.update_dataset(dataset_id, {
        "ingestion_status": "staged",
        "measured_rows": stats["seen"],
        "valid_phone_records": stats["staged"],
    })
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Stage normalized Signal business-phone records")
    parser.add_argument("--input", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--dataset-key", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        stats = stage_business_parquet(
            Path(args.input),
            source_key=args.source,
            dataset_key=args.dataset_key,
            title=args.title,
            batch_size=max(100, args.batch_size),
            dry_run=args.dry_run,
        )
    except (KeyError, PermissionError) as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2
    print(stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
