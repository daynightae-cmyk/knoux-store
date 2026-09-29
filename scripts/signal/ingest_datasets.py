from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
from typing import Any

import httpx
import polars as pl

from .sources_registry import SourceRegistry


def deterministic_record_id(source_key: str, phone: str, name: str) -> str:
    material = f"{source_key}\0{phone}\0{name}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


class SupabaseRest:
    def __init__(self) -> None:
        self.url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.url or not self.key:
            raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are required for ingestion.")
        self.headers = {
            "apikey": self.key,
            "authorization": f"Bearer {self.key}",
            "content-type": "application/json",
            "prefer": "resolution=merge-duplicates,return=minimal",
        }

    def get_source_id(self, source_key: str) -> str:
        with httpx.Client(timeout=30) as client:
            response = client.get(
                f"{self.url}/rest/v1/signal_source_catalog",
                params={"source_key": f"eq.{source_key}", "select": "id,approval_status,enabled"},
                headers=self.headers,
            )
            response.raise_for_status()
            rows = response.json()
        if len(rows) != 1:
            raise RuntimeError(f"Source not found in Supabase: {source_key}")
        if rows[0]["approval_status"] != "approved":
            raise PermissionError(f"Source is not approved in Supabase: {source_key}")
        return str(rows[0]["id"])

    def upsert_business_rows(self, rows: list[dict[str, Any]]) -> None:
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{self.url}/rest/v1/signal_business_phone_records",
                params={"on_conflict": "source_id,source_record_id,phone_e164"},
                headers=self.headers,
                json=rows,
            )
            response.raise_for_status()


def load_rows(path: Path, source_key: str, source_id: str) -> list[dict[str, Any]]:
    frame = pl.read_parquet(path)
    required = {"phone_e164"}
    if not required.issubset(frame.columns):
        raise KeyError(f"Missing columns {sorted(required - set(frame.columns))}")

    name_column = next((c for c in ("business_name", "name", "itemLabel", "title") if c in frame.columns), None)
    if name_column is None:
        raise KeyError("No business/entity name column found.")

    rows: list[dict[str, Any]] = []
    for row in frame.iter_rows(named=True):
        phone = str(row.get("phone_e164") or "").strip()
        name = str(row.get(name_column) or "").strip()
        if not phone.startswith("+") or not name:
            continue

        country = str(row.get("detected_country") or row.get("country_code") or "").strip() or None
        category = str(row.get("category") or row.get("amenity") or "").strip() or None
        locality = str(row.get("locality") or row.get("city") or "").strip() or None
        source_url = str(row.get("source_url") or "").strip() or None
        record_id = str(row.get("source_record_id") or "").strip()
        if not record_id:
            record_id = deterministic_record_id(source_key, phone, name)

        rows.append({
            "source_id": source_id,
            "source_record_id": record_id,
            "phone_e164": phone,
            "country_code": country,
            "business_name": name[:300],
            "category": category,
            "locality": locality,
            "source_url": source_url,
            "provenance": {"pipeline": "scripts.signal.ingest_datasets", "source_key": source_key},
        })
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest approved normalized business-phone data")
    parser.add_argument("--input", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()

    registry = SourceRegistry()
    source = registry.get(args.source)
    if source is None:
        raise SystemExit(f"Unknown source: {args.source}")
    if source.status != "APPROVED":
        raise SystemExit(f"Blocked: source status is {source.status}")
    if not source.enabled and not args.dry_run:
        raise SystemExit("Blocked: source is not enabled for ingestion.")

    if args.dry_run:
        frame = pl.read_parquet(args.input)
        print(f"DRY-RUN source={source.id} rows={frame.height} columns={frame.columns}")
        return 0

    db = SupabaseRest()
    source_id = db.get_source_id(source.id)
    rows = load_rows(Path(args.input), source.id, source_id)
    for start in range(0, len(rows), args.batch_size):
        batch = rows[start:start + args.batch_size]
        db.upsert_business_rows(batch)
        print(f"INGESTED {start + len(batch)}/{len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
