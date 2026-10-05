"""Acquire Overture Maps ``places`` theme records for KNOuX Signal target countries.

The Overture ``places`` theme is published on an anonymous public S3 bucket under
per-source licences that are all permissive for commercial use (CDLA-Permissive-2.0
and Apache-2.0). It carries ``phones``, ``names.primary``, ``emails`` and
``taxonomy`` for publicly observable business destinations. It contains no natural
person contact data and no OSM data, so it does not inherit ODbL share-alike.

The theme is not partitioned by country, so every acquisition is a predicate-pushdown
scan of the full release partition set. The bounding-box predicate is applied inside
DuckDB so only the target-country rows are ever materialised locally.

Outputs land under the external storage root (see ``signal_storage.py``); only the
manifest, schema and measured statistics live in the Git worktree.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import duckdb

from .config import load_config
from .path_guard import artifact_path
from .signal_storage import ensure_free_space, processed_dir, raw_dir

SOURCE_ID = "overture_places"
BUCKET = "s3://overturemaps-us-west-2"
STAC_CATALOG = "https://stac.overturemaps.org/catalog.json"
FALLBACK_RELEASE = "2026-09-23.1"

TARGET_COUNTRIES = ("EG", "AE", "SA", "KW", "QA", "BH", "OM")

# GCC bounding box. Used as a cheap pre-filter before the exact country predicate.
GCC_BBOX = {"min_lon": 24.5, "max_lon": 60.5, "min_lat": 15.5, "max_lat": 33.5}

# The release that introduced taxonomy.primary and removed the old `categories` field.
MIN_PREDICATE_CONFIDENCE = 0.5

# Required free space for the scan, in bytes. The scan itself is streamed, so this
# only needs to cover the written output plus DuckDB's temporary spill.
REQUIRED_FREE_BYTES = 3 * 1024**3


def _connect() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute("SET s3_region='us-west-2';")
    return con


def resolve_release(explicit: str | None) -> str:
    """Resolve the Overture release identifier to acquire."""
    if explicit:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}\.\d+", explicit):
            raise ValueError("Invalid Overture release identifier")
        return explicit
    try:
        import httpx

        response = httpx.get(STAC_CATALOG, timeout=60.0, follow_redirects=True)
        response.raise_for_status()
        latest = response.json().get("latest")
        if isinstance(latest, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}\.\d+", latest):
            return latest
    except Exception as exc:  # noqa: BLE001 - network drift must not abort acquisition
        print(f"[{SOURCE_ID}] STAC catalog unavailable ({exc}); using pinned release", file=sys.stderr)
    return FALLBACK_RELEASE


def places_glob(release: str) -> str:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}\.\d+", release):
        raise ValueError("Invalid Overture release identifier")
    return f"{BUCKET}/release/{release}/theme=places/type=place/*"


def scan(con: duckdb.DuckDBPyConnection, release: str) -> int:
    return int(
        con.execute(
            f"""
            SELECT count(*)
            FROM read_parquet('{places_glob(release)}', hive_partitioning=1)
            WHERE bbox.xmin >= {GCC_BBOX['min_lon']}
              AND bbox.xmax <= {GCC_BBOX['max_lon']}
              AND bbox.ymin >= {GCC_BBOX['min_lat']}
              AND bbox.ymax <= {GCC_BBOX['max_lat']}
              AND phones IS NOT NULL
              AND len(phones) > 0
              AND names.primary IS NOT NULL
              AND names.primary <> ''
              AND (confidence IS NULL OR confidence >= {MIN_PREDICATE_CONFIDENCE})
              AND addresses[1].country IN {TARGET_COUNTRIES}
            """
        ).fetchone()[0]
    )


def extract(con: duckdb.DuckDBPyConnection, release: str, destination: Path) -> int:
    destination = artifact_path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    con.execute(
        f"""
        COPY (
            SELECT
                id                                                  AS gers_id,
                names.primary                                       AS name_primary,
                names.common                                        AS name_common,
                taxonomy.primary                                   AS category_primary,
                basic_category                                      AS basic_category,
                brand                                               AS brand,
                phones[1]                                           AS phone_raw,
                emails[1]                                           AS email_raw,
                websites[1]                                         AS website_raw,
                addresses[1].country                                AS country_code,
                addresses[1].region                                 AS region,
                addresses[1].locality                               AS locality,
                addresses[1].postcode                               AS postcode,
                addresses[1].freeform                               AS address_freeform,
                operating_status                                    AS operating_status,
                confidence                                          AS confidence,
                sources                                             AS sources,
                bbox                                                AS bbox
            FROM read_parquet('{places_glob(release)}', hive_partitioning=1)
            WHERE bbox.xmin >= {GCC_BBOX['min_lon']}
              AND bbox.xmax <= {GCC_BBOX['max_lon']}
              AND bbox.ymin >= {GCC_BBOX['min_lat']}
              AND bbox.ymax <= {GCC_BBOX['max_lat']}
              AND phones IS NOT NULL
              AND len(phones) > 0
              AND names.primary IS NOT NULL
              AND names.primary <> ''
              AND (confidence IS NULL OR confidence >= {MIN_PREDICATE_CONFIDENCE})
              AND addresses[1].country IN {TARGET_COUNTRIES}
        ) TO '{destination.as_posix()}'
        (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)
        """
    )
    return int(con.execute(f"SELECT count(*) FROM read_parquet('{destination.as_posix()}')").fetchone()[0])


def measure(con: duckdb.DuckDBPyConnection, path: Path) -> dict[str, Any]:
    row = con.execute(
        f"""
        SELECT
            count(*)                                                   AS rows,
            count(DISTINCT phone_raw)                                   AS distinct_raw_phones,
            count(DISTINCT country_code)                               AS countries,
            sum(CASE WHEN email_raw IS NOT NULL AND email_raw <> '' THEN 1 ELSE 0 END) AS rows_with_email,
            sum(CASE WHEN website_raw IS NOT NULL AND website_raw <> '' THEN 1 ELSE 0 END) AS rows_with_website,
            sum(CASE WHEN name_common IS NOT NULL AND len(map_keys(name_common)) > 0 THEN 1 ELSE 0 END) AS rows_with_alt_name,
            sum(coalesce(len(map_keys(name_common)), 0)) AS alternate_name_pairs
        FROM read_parquet('{path.as_posix()}')
        """
    ).fetchone()
    per_country = con.execute(
        f"""
        SELECT country_code, count(*) AS rows, count(DISTINCT phone_raw) AS distinct_phones
        FROM read_parquet('{path.as_posix()}')
        GROUP BY country_code
        ORDER BY rows DESC
        """
    ).fetchall()
    licences = con.execute(
        f"""
        SELECT src.license AS source_license, count(*) AS rows
        FROM (
            SELECT unnest(sources) AS src FROM read_parquet('{path.as_posix()}')
        )
        GROUP BY src.license
        ORDER BY rows DESC
        """
    ).fetchall()
    return {
        "measured_rows": int(row[0]),
        "distinct_raw_phones": int(row[1]),
        "countries": int(row[2]),
        "rows_with_email": int(row[3]),
        "rows_with_website": int(row[4]),
        "rows_with_alternate_name": int(row[5]),
        "alternate_name_pairs": int(row[6]),
        "per_country": {
            str(cc): {"rows": int(r), "distinct_raw_phones": int(d)} for cc, r, d in per_country
        },
        "per_source_licence": {str(lic): int(cnt) for lic, cnt in licences},
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release", default=None, help="Pin an Overture release id.")
    parser.add_argument("--out", default=None, help="Override output parquet path.")
    parser.add_argument("--measure-only", action="store_true", help="Count without writing.")
    parser.add_argument(
        "--reuse",
        action="store_true",
        help="Skip extraction when the destination parquet already exists.",
    )
    args = parser.parse_args(argv)

    config = load_config()
    destination = Path(args.out) if args.out else processed_dir(SOURCE_ID, config) / f"{SOURCE_ID}_{TARGET_COUNTRIES[0]}.parquet"
    destination = artifact_path(destination)
    ensure_free_space(REQUIRED_FREE_BYTES, destination)

    release = resolve_release(args.release)
    con = _connect()

    print(f"[{SOURCE_ID}] release={release}")
    print(f"[{SOURCE_ID}] raw root  : {raw_dir(SOURCE_ID, config)}")
    print(f"[{SOURCE_ID}] output    : {destination}")

    reuse = args.reuse and destination.exists()
    if reuse:
        print(f"[{SOURCE_ID}] reusing existing artifact ({destination.stat().st_size} bytes)")
        scanned = int(con.execute(f"SELECT count(*) FROM read_parquet('{destination.as_posix()}')").fetchone()[0])
    else:
        scanned = scan(con, release)
        print(f"[{SOURCE_ID}] gcc phone+name rows after predicate pushdown: {scanned}")
    if scanned == 0:
        print(f"[{SOURCE_ID}] FAIL: predicate matched zero rows", file=sys.stderr)
        return 2

    if not args.measure_only and not reuse:
        written = extract(con, release, destination)
        print(f"[{SOURCE_ID}] wrote {written} rows -> {destination}")

    stats = measure(con, destination)
    stats["release"] = release
    stats["artifact_bytes"] = destination.stat().st_size if destination.exists() else 0
    stats["source_url"] = "https://overturemaps.org"
    stats["license"] = "CDLA-Permissive-2.0; Apache-2.0 (per-source, see per_source_licence)"
    stats["retrieved_at"] = datetime.now(timezone.utc).isoformat()
    stats["min_predicate_confidence"] = MIN_PREDICATE_CONFIDENCE

    manifest_path = processed_dir(SOURCE_ID, config) / "overture_places.stats.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(stats, indent=2, sort_keys=True), encoding="utf-8")

    print(json.dumps(stats, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
