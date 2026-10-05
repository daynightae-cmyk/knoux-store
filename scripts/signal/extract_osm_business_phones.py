"""Extract public business/place phone evidence from Geofabrik OSM PBF files.

Only objects with a public name/brand and phone/contact:phone are emitted.
Uncertain local-format GCC numbers are skipped rather than guessed.
"""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

import osmium
import phonenumbers
from .path_guard import artifact_path

TARGET = {"EG", "AE", "SA", "KW", "QA", "BH", "OM"}
CALLING = {
    "20": "EG",
    "971": "AE",
    "966": "SA",
    "965": "KW",
    "974": "QA",
    "973": "BH",
    "968": "OM",
}
COUNTRY_ALIASES = {
    "EGY": "EG", "EGYPT": "EG",
    "ARE": "AE", "UAE": "AE", "UNITED ARAB EMIRATES": "AE",
    "SAU": "SA", "SAUDI ARABIA": "SA",
    "KWT": "KW", "KUWAIT": "KW",
    "QAT": "QA", "QATAR": "QA",
    "BHR": "BH", "BAHRAIN": "BH",
    "OMN": "OM", "OMAN": "OM",
}

PHONE_KEYS = ("phone", "contact:phone")
NAME_KEYS = ("name", "name:en", "name:ar", "official_name", "brand", "operator")
CATEGORY_KEYS = (
    "amenity", "shop", "office", "tourism", "healthcare",
    "craft", "leisure", "government", "industrial", "man_made",
)


def clean_country(value: str | None) -> str | None:
    if not value:
        return None
    upper = value.strip().upper()
    if upper in TARGET:
        return upper
    return COUNTRY_ALIASES.get(upper)


def infer_country(raw: str, tags: dict[str, str], default_country: str | None) -> str | None:
    tagged = clean_country(
        tags.get("addr:country")
        or tags.get("is_in:country_code")
        or tags.get("country")
    )
    if tagged:
        return tagged
    if default_country:
        return default_country
    compact = re.sub(r"[^0-9+]", "", raw)
    if compact.startswith("00"):
        compact = "+" + compact[2:]
    digits = compact.lstrip("+")
    for code, country in sorted(CALLING.items(), key=lambda item: -len(item[0])):
        if compact.startswith("+") and digits.startswith(code):
            return country
    return None


def normalize_phone(raw: str, country: str | None) -> tuple[str, str] | None:
    candidate = raw.strip()
    if candidate.startswith("00"):
        candidate = "+" + candidate[2:]
    try:
        parsed = phonenumbers.parse(candidate, country)
    except phonenumbers.NumberParseException:
        return None
    if not phonenumbers.is_possible_number(parsed) or not phonenumbers.is_valid_number(parsed):
        return None
    region = phonenumbers.region_code_for_number(parsed)
    if region not in TARGET:
        return None
    e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    return e164, region


def split_phones(value: str) -> list[str]:
    return [part.strip() for part in re.split(r"[;,\n]+", value) if part.strip()]
class PhoneHandler(osmium.SimpleHandler):
    def __init__(
        self,
        *,
        default_country: str | None,
        output_dir: Path,
        dataset_id: str,
        batch_size: int,
    ) -> None:
        super().__init__()
        self.default_country = default_country
        output_dir = artifact_path(output_dir)
        self.output_dir = output_dir
        self.dataset_id = dataset_id
        self.batch_size = batch_size
        self.batch: list[dict[str, Any]] = []
        self.batch_index = 0
        self.seen: set[str] = set()
        self.counts: Counter[str] = Counter()
        self.objects_seen = 0
        self.phone_objects = 0
        self.rejected = 0
        output_dir.mkdir(parents=True, exist_ok=True)
        for old in output_dir.glob("batch_*.json"):
            old.unlink()

    def _flush(self) -> None:
        if not self.batch:
            return
        path = self.output_dir / f"batch_{self.batch_index:05d}.json"
        path.write_text(
            json.dumps(self.batch, ensure_ascii=False, separators=(",", ":"), sort_keys=True),
            encoding="utf-8",
        )
        self.batch_index += 1
        self.batch.clear()

    def _handle(self, obj: Any, object_type: str) -> None:
        self.objects_seen += 1
        tags = {tag.k: tag.v for tag in obj.tags}
        name = next((tags.get(key, "").strip() for key in NAME_KEYS if tags.get(key, "").strip()), "")
        phone_values = [tags.get(key, "").strip() for key in PHONE_KEYS if tags.get(key, "").strip()]
        if not name or not phone_values:
            return
        self.phone_objects += 1

        category_key = next((key for key in CATEGORY_KEYS if tags.get(key)), None)
        category = f"{category_key}:{tags[category_key]}" if category_key else "OpenStreetMap public place"
        locality = (
            tags.get("addr:city")
            or tags.get("addr:place")
            or tags.get("addr:suburb")
            or tags.get("is_in")
        )
        source_url = f"https://www.openstreetmap.org/{object_type}/{obj.id}"

        for phone_value in phone_values:
            for raw_phone in split_phones(phone_value):
                hint = infer_country(raw_phone, tags, self.default_country)
                normalized = normalize_phone(raw_phone, hint)
                if not normalized:
                    self.rejected += 1
                    continue
                e164, country = normalized
                record_id = f"{object_type}:{obj.id}:{e164}"
                if record_id in self.seen:
                    continue
                self.seen.add(record_id)
                self.counts[country] += 1
                self.batch.append({
                    "source_key": "openstreetmap",
                    "source_record_id": record_id,
                    "phone_e164": e164,
                    "country_code": country,
                    "business_name": name[:300],
                    "category": category[:180],
                    "locality": locality[:180] if locality else None,
                    "source_url": source_url,
                    "provenance": {
                        "dataset_id": self.dataset_id,
                        "osm_type": object_type,
                        "osm_id": str(obj.id),
                        "raw_phone": raw_phone,
                        "license": "ODbL-1.0",
                        "attribution": "© OpenStreetMap contributors",
                    },
                })
                if len(self.batch) >= self.batch_size:
                    self._flush()

    def node(self, obj: Any) -> None:
        self._handle(obj, "node")

    def way(self, obj: Any) -> None:
        self._handle(obj, "way")

    def relation(self, obj: Any) -> None:
        self._handle(obj, "relation")

    def finish(self) -> dict[str, Any]:
        self._flush()
        summary = {
            "dataset_id": self.dataset_id,
            "objects_seen": self.objects_seen,
            "phone_objects": self.phone_objects,
            "valid_rows": len(self.seen),
            "rejected_phone_values": self.rejected,
            "countries": dict(sorted(self.counts.items())),
            "batches": self.batch_index,
        }
        (self.output_dir / "summary.json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        return summary
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--dataset-id", required=True)
    parser.add_argument("--default-country", choices=sorted(TARGET))
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()

    handler = PhoneHandler(
        default_country=args.default_country,
        output_dir=Path(args.output_dir),
        dataset_id=args.dataset_id,
        batch_size=max(50, args.batch_size),
    )
    handler.apply_file(args.input, locations=False)
    print(json.dumps(handler.finish(), ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
