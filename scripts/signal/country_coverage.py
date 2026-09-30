"""Generate a country/source coverage matrix from the current registry and dataset manifest."""
from __future__ import annotations

import json

from .dataset_manifest import DatasetManifest
from .sources_registry import SourceRegistry

TARGET_COUNTRIES = ("EG", "AE", "SA", "KW", "QA", "BH", "OM")


def generate_coverage() -> dict[str, dict]:
    registry = SourceRegistry()
    manifest = DatasetManifest()
    datasets = manifest.entries
    report: dict[str, dict] = {}

    for country in TARGET_COUNTRIES:
        sources = [source for source in registry.sources if country in source.raw.get("countries", []) or "GLOBAL" in source.raw.get("countries", [])]
        approved = [source.id for source in sources if source.status == "APPROVED"]
        quarantined = [source.id for source in sources if source.status == "QUARANTINED"]
        rejected = [source.id for source in sources if source.status == "REJECTED"]
        country_datasets = [entry for entry in datasets if country in entry.countries]
        report[country] = {
            "approved_sources": approved,
            "quarantined_sources": quarantined,
            "rejected_sources": rejected,
            "datasets": [entry.dataset_key for entry in country_datasets],
            "downloaded_or_beyond": [
                entry.dataset_key
                for entry in country_datasets
                if entry.ingestion_status.value in {"downloaded", "normalizing", "staging", "staged", "promoting", "promoted"}
            ],
        }
    return report


def main() -> int:
    print(json.dumps(generate_coverage(), ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
