"""Prepare lawful telecom metadata for KNOuX Signal.

Inputs:
- mcc-mnc.org networks.csv
- Google libphonenumber carrier maps

Outputs deterministic JSON payloads for Supabase plus a compact
carrier-prefix map consumed by the Next.js instant-telecom layer.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any
from .path_guard import artifact_path, carrier_map_path

TARGET_COUNTRIES = {"EG", "AE", "SA", "KW", "QA", "BH", "OM"}

CARRIER_FILES = {
    "EG": ("google_libphonenumber-carrier_eg", "20.txt"),
    "AE": ("google_libphonenumber-carrier_ae", "971.txt"),
    "SA": ("google_libphonenumber-carrier_sa", "966.txt"),
    "KW": ("google_libphonenumber-carrier_kw", "965.txt"),
    "QA": ("google_libphonenumber-carrier_qa", "974.txt"),
    "BH": ("google_libphonenumber-carrier_bh", "973.txt"),
    "OM": ("google_libphonenumber-carrier_om", "968.txt"),
}


def read_manifest(manifests: Path, dataset_id: str) -> dict[str, Any]:
    path = manifests / dataset_id / "manifest.json"
    return json.loads(path.read_text(encoding="utf-8"))


def fingerprint(*parts: str) -> str:
    material = "\0".join(parts).encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def network_rows(raw: Path, manifests: Path) -> list[dict[str, Any]]:
    dataset_id = "mcc_mnc_org-default"
    source = raw / dataset_id / "networks.csv"
    manifest = read_manifest(manifests, dataset_id)
    rows: list[dict[str, Any]] = []

    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            iso = (row.get("iso") or "").strip().upper()
            if iso not in TARGET_COUNTRIES:
                continue
            mcc = (row.get("mcc") or "").strip()
            mnc = (row.get("mnc") or "").strip()
            if not mcc or not mnc:
                continue
            record_id = (row.get("plmn") or "").strip() or fingerprint(mcc, mnc)
            rows.append({
                "source_key": "mcc_mnc_org",
                "country_code": iso,
                "mcc": mcc,
                "mnc": mnc,
                "operator_name": (row.get("operator") or "").strip() or None,
                "brand": (row.get("brand") or "").strip() or None,
                "network_type": (row.get("network_types") or "").strip() or None,
                "source_record_id": record_id,
                "provenance": {
                    "dataset_id": dataset_id,
                    "sha256": manifest["sha256"],
                    "source_url": row.get("url") or manifest["source_url"],
                    "retrieved_at": manifest["retrieved_at"],
                    "publisher": manifest["publisher"],
                },
            })

    rows.sort(key=lambda item: (item["country_code"], item["mcc"], item["mnc"]))
    return rows


def prefix_rows(raw: Path, manifests: Path) -> tuple[list[dict[str, Any]], dict[str, str]]:
    rows: list[dict[str, Any]] = []
    mapping: dict[str, str] = {}

    for country, (dataset_id, filename) in CARRIER_FILES.items():
        path = raw / dataset_id / filename
        manifest = read_manifest(manifests, dataset_id)
        with path.open("r", encoding="utf-8") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#") or "|" not in line:
                    continue
                prefix, carrier = line.split("|", 1)
                prefix = prefix.strip()
                carrier = carrier.strip()
                if not prefix.isdigit() or not carrier:
                    continue
                mapping[prefix] = carrier
                rows.append({
                    "source_key": "google_libphonenumber",
                    "country_code": country,
                    "prefix": prefix,
                    "carrier": carrier,
                    "line_type": "MOBILE",
                    "source_record_id": f"{country}:{prefix}",
                    "provenance": {
                        "dataset_id": dataset_id,
                        "sha256": manifest["sha256"],
                        "source_url": manifest["direct_download_url"],
                        "retrieved_at": manifest["retrieved_at"],
                        "publisher": manifest["publisher"],
                    },
                })

    rows.sort(key=lambda item: (item["country_code"], item["prefix"]))
    return rows, dict(sorted(mapping.items()))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-dir", default="data/signal/raw")
    parser.add_argument("--manifests-dir", default="data/signal/manifests")
    parser.add_argument("--processed-dir", default="data/signal/processed/telecom")
    parser.add_argument("--ui-map", default="src/lib/signal/generated/carrierPrefixes.json")
    args = parser.parse_args()

    raw = artifact_path(args.raw_dir)
    manifests = artifact_path(args.manifests_dir)
    processed = artifact_path(args.processed_dir)
    processed.mkdir(parents=True, exist_ok=True)

    networks = network_rows(raw, manifests)
    prefixes, ui_map = prefix_rows(raw, manifests)

    (processed / "network_codes.json").write_text(
        json.dumps(networks, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    (processed / "numbering_prefixes.json").write_text(
        json.dumps(prefixes, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    ui_path = carrier_map_path(args.ui_map)
    ui_path.parent.mkdir(parents=True, exist_ok=True)
    ui_path.write_text(
        json.dumps(ui_map, ensure_ascii=False, separators=(",", ":"), sort_keys=True),
        encoding="utf-8",
    )

    print(json.dumps({
        "network_codes": len(networks),
        "numbering_prefixes": len(prefixes),
        "ui_prefixes": len(ui_map),
        "countries": sorted(TARGET_COUNTRIES),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
