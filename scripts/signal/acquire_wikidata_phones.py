"""Acquire public non-human phone statements from Wikidata (CC0).

This intentionally excludes items explicitly typed as humans (Q5) and
queries one target country at a time to keep WDQS requests bounded.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import phonenumbers

from .config import MANIFESTS_DIR, RAW_DIR

ENDPOINT = "https://query.wikidata.org/sparql"
USER_AGENT = "KNOuX-Signal/1.1 lawful-data-ingestion (public Wikidata CC0)"

COUNTRIES = {
    "EG": ("Q79", "Egypt"),
    "AE": ("Q878", "United Arab Emirates"),
    "SA": ("Q851", "Saudi Arabia"),
    "KW": ("Q817", "Kuwait"),
    "QA": ("Q846", "Qatar"),
    "BH": ("Q398", "Bahrain"),
    "OM": ("Q842", "Oman"),
}


def query_for(qid: str, limit: int) -> str:
    return f"""
SELECT DISTINCT ?item ?itemLabel ?phone ?website WHERE {{
  VALUES ?country {{ wd:{qid} }}
  ?item wdt:P17 ?country ;
        wdt:P1329 ?phone .
  FILTER NOT EXISTS {{ ?item wdt:P31 wd:Q5 . }}
  OPTIONAL {{ ?item wdt:P856 ?website . }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,ar". }}
}}
LIMIT {int(limit)}
""".strip()


def normalize_phone(value: str, country: str) -> tuple[str, str] | None:
    try:
        parsed = phonenumbers.parse(value, country)
        if not phonenumbers.is_possible_number(parsed):
            return None
        if not phonenumbers.is_valid_number(parsed):
            return None
        region = phonenumbers.region_code_for_number(parsed)
        if region not in COUNTRIES:
            return None
        return (
            phonenumbers.format_number(
                parsed, phonenumbers.PhoneNumberFormat.E164
            ),
            region,
        )
    except phonenumbers.NumberParseException:
        return None


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save_json(path: Path, value: Any) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(
        value, ensure_ascii=False, indent=2, sort_keys=True
    ).encode("utf-8")
    path.write_bytes(data)
    return data


def fetch_country(country: str, limit: int) -> dict[str, Any]:
    qid, country_name = COUNTRIES[country]
    query = query_for(qid, limit)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/sparql-results+json",
    }
    started = datetime.now(timezone.utc)

    response = None
    with httpx.Client(timeout=90, follow_redirects=True, headers=headers) as client:
        for attempt in range(1, 4):
            response = client.get(
                ENDPOINT,
                params={"query": query, "format": "json"},
            )
            if response.status_code != 429:
                response.raise_for_status()
                break
            retry_after = response.headers.get("retry-after")
            try:
                wait_seconds = float(retry_after) if retry_after else 65.0
            except ValueError:
                wait_seconds = 65.0
            wait_seconds = max(60.0, min(wait_seconds, 120.0))
            print(json.dumps({
                "country": country,
                "status": 429,
                "attempt": attempt,
                "retry_after_seconds": wait_seconds,
            }))
            if attempt == 3:
                response.raise_for_status()
            time.sleep(wait_seconds)
    assert response is not None
    payload = response.json()

    dataset_id = f"wikidata_phones-{country.lower()}"
    raw_path = RAW_DIR / dataset_id / "results.json"
    raw_bytes = save_json(raw_path, payload)
    raw_sha = sha256_bytes(raw_bytes)

    rows: list[dict[str, Any]] = []
    rejected = 0
    seen: set[tuple[str, str]] = set()

    for binding in payload.get("results", {}).get("bindings", []):
        item_url = binding.get("item", {}).get("value", "")
        qid_value = item_url.rsplit("/", 1)[-1]
        label = binding.get("itemLabel", {}).get("value", "").strip()
        raw_phone = binding.get("phone", {}).get("value", "").strip()
        normalized = normalize_phone(raw_phone, country)
        if not qid_value or not label or not normalized:
            rejected += 1
            continue
        phone_e164, phone_region = normalized
        key = (qid_value, phone_e164)
        if key in seen:
            continue
        seen.add(key)
        website = binding.get("website", {}).get("value")
        rows.append({
            "source_key": "wikidata_phones",
            "source_record_id": f"{qid_value}:{phone_e164}",
            "phone_e164": phone_e164,
            "country_code": phone_region,
            "business_name": label[:300],
            "category": "Wikidata public entity",
            "locality": None,
            "source_url": item_url,
            "provenance": {
                "dataset_id": dataset_id,
                "wikidata_qid": qid_value,
                "raw_phone": raw_phone,
                "website": website,
                "license": "CC0-1.0",
                "query_scope": "country + P1329 + exclude explicit humans Q5",
            },
        })

    processed_path = Path("data/signal/processed/wikidata") / f"{country.lower()}.json"
    save_json(processed_path, rows)

    manifest = {
        "dataset_id": dataset_id,
        "source_url": "https://www.wikidata.org",
        "direct_download_url": str(response.url),
        "publisher": "Wikimedia Foundation / Wikidata community",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "country_coverage": [country],
        "retrieved_at": started.isoformat(),
        "file_size_bytes": len(raw_bytes),
        "sha256": raw_sha,
        "http_status": response.status_code,
        "content_type": response.headers.get("content-type"),
        "status": "downloaded",
        "query": query,
        "bindings_seen": len(payload.get("results", {}).get("bindings", [])),
        "valid_rows": len(rows),
        "rejected_rows": rejected,
    }
    save_json(MANIFESTS_DIR / dataset_id / "manifest.json", manifest)
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", choices=sorted(COUNTRIES))
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--delay", type=float, default=1.2)
    args = parser.parse_args()

    selected = sorted(COUNTRIES) if args.all else [args.country or "AE"]
    summaries = []
    for index, country in enumerate(selected):
        if index:
            time.sleep(max(0.0, args.delay))
        result = fetch_country(country, args.limit)
        summaries.append({
            "country": country,
            "bindings_seen": result["bindings_seen"],
            "valid_rows": result["valid_rows"],
            "rejected_rows": result["rejected_rows"],
            "sha256": result["sha256"],
        })
        print(json.dumps(summaries[-1], sort_keys=True))
    print(json.dumps({"countries": len(summaries), "valid_rows": sum(x["valid_rows"] for x in summaries)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
