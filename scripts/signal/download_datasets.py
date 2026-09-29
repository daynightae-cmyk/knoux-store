from __future__ import annotations

import argparse
import sys

from .download_utils import download_stream
from .sources_registry import SourceRegistry


def planned_downloads(source_filter: str | None = None) -> list[tuple]:
    registry = SourceRegistry()
    selected = registry.executable
    if source_filter:
        source = registry.assert_downloadable(source_filter)
        selected = [source]

    plan: list[tuple] = []
    for source in selected:
        raw = source.raw
        urls = raw.get("download_urls")
        if isinstance(urls, dict):
            for label, url in urls.items():
                plan.append((source, label, str(url)))
        elif raw.get("download_url"):
            plan.append((source, "default", str(raw["download_url"])))
    return plan


def main() -> int:
    parser = argparse.ArgumentParser(description="KNOuX SIGNAL approved-source downloader")
    parser.add_argument("--source", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    registry = SourceRegistry()
    print(registry.summary())
    try:
        plan = planned_downloads(args.source)
    except (KeyError, PermissionError) as exc:
        print(f"BLOCKED: {exc}", file=sys.stderr)
        return 2
    print(f"\nDownload artifacts planned: {len(plan)}")

    if args.dry_run:
        for source, label, url in plan:
            print(f"DRY-RUN {source.id}:{label} -> {url}")
        return 0

    failures = 0
    for source, label, url in plan:
        raw = source.raw
        try:
            manifest = download_stream(
                dataset_id=f"{source.id}-{label}",
                url=url,
                filename=url.rsplit("/", 1)[-1] or f"{label}.bin",
                source_url=str(raw.get("source_url", url)),
                publisher=str(raw.get("publisher", "")),
                license_url=raw.get("license_url"),
                countries=[str(x) for x in raw.get("countries", [])],
            )
            print(f"DOWNLOADED {source.id}:{label} sha256={manifest['sha256']}")
        except Exception as exc:
            failures += 1
            print(f"FAILED {source.id}:{label}: {exc}", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
