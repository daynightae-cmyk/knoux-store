"""Acquire Foursquare Open Source Places rows for KNOuX Signal target countries.

Foursquare Open Source Places is published under Apache-2.0. The canonical
``foursquare/fsq-os-places`` repository is access-gated, but an ungated Apache-2.0
mirror is published on the Hugging Face Hub. This adapter streams the mirror over
HTTP range requests with DuckDB and materialises only the target-country rows that
carry both ``tel`` and ``name``.

The artifact is ~10.6 GB remotely and is never downloaded in full: DuckDB reads only
the row groups whose ``country`` predicate is satisfiable, and writes the filtered
result to external storage.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import duckdb

from .config import load_config
from .signal_storage import ensure_free_space, processed_dir, raw_dir

SOURCE_ID = "foursquare_os_places"
HF_REPO = "do-me/foursquare_places_100M"
HF_FILE = "foursquare_places.parquet"
HF_URL = f"https://huggingface.co/datasets/{HF_REPO}/resolve/main/{HF_FILE}"

LICENSE = "Apache-2.0"
PUBLISHER = "Foursquare (open source release), via ungated Apache-2.0 mirror"

TARGET_COUNTRIES = ("EG", "AE", "SA", "KW", "QA", "BH", "OM")

# Mirror snapshot date; recorded for provenance and freshness reporting.
MIRROR_SNAPSHOT = "2024-11-19"

REQUIRED_FREE_BYTES = 2 * 1024**3


def _connect() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    # Large remote parquet: raise the object cache so range requests are not
    # re-issued for every column group.
    con.execute("SET http_keep_alive=true;")
    con.execute("SET enable_progress_bar=true;")
    return con


def scan(con: duckdb.DuckDBPyConnection, url: str) -> int:
    return int(
        con.execute(
            f"""
            SELECT count(*)
            FROM read_parquet('{url}')
            WHERE country IN {TARGET_COUNTRIES}
              AND tel IS NOT NULL AND tel <> ''
              AND name IS NOT NULL AND name <> ''
            """
        ).fetchone()[0]
    )


def extract(con: duckdb.DuckDBPyConnection, url: str, destination: Path) -> int:
    destination.parent.mkdir(parents=True, exist_ok=True)
    con.execute(
        f"""
        COPY (
            SELECT
                fsq_place_id        AS fsq_place_id,
                name                AS name_primary,
                tel                 AS phone_raw,
                website             AS website_raw,
                email               AS email_raw,
                country             AS country_code,
                region              AS region,
                locality            AS locality,
                post_town           AS post_town,
                postcode            AS postcode,
                address             AS address_freeform,
                date_created        AS date_created,
                date_refreshed      AS date_refreshed,
                date_closed         AS date_closed,
                fsq_category_labels AS category_labels,
                latitude            AS latitude,
                longitude           AS longitude
            FROM read_parquet('{url}')
            WHERE country IN {TARGET_COUNTRIES}
              AND tel IS NOT NULL AND tel <> ''
              AND name IS NOT NULL AND name <> ''
        ) TO '{destination.as_posix()}'
        (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)
        """
    )
    return int(con.execute(f"SELECT count(*) FROM read_parquet('{destination.as_posix()}')").fetchone()[0])


def measure(con: duckdb.DuckDBPyConnection, path: Path) -> dict[str, Any]:
    row = con.execute(
        f"""
        SELECT
            count(*)                                                  AS rows,
            count(DISTINCT phone_raw)                                  AS distinct_raw_phones,
            count(DISTINCT country_code)                              AS countries,
            sum(CASE WHEN email_raw IS NOT NULL AND email_raw <> '' THEN 1 ELSE 0 END)      AS rows_with_email,
            sum(CASE WHEN website_raw IS NOT NULL AND website_raw <> '' THEN 1 ELSE 0 END)  AS rows_with_website,
            count(DISTINCT lower(trim(name_primary)))                  AS distinct_names
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
    return {
        "measured_rows": int(row[0]),
        "distinct_raw_phones": int(row[1]),
        "countries": int(row[2]),
        "rows_with_email": int(row[3] or 0),
        "rows_with_website": int(row[4] or 0),
        "distinct_names": int(row[5]),
        "per_country": {
            str(cc): {"rows": int(r), "distinct_raw_phones": int(d)} for cc, r, d in per_country
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=HF_URL, help="Override the mirror parquet URL.")
    parser.add_argument("--out", default=None, help="Override output parquet path.")
    parser.add_argument(
        "--reuse", action="store_true", help="Skip extraction when the artifact already exists."
    )
    args = parser.parse_args(argv)

    config = load_config()
    destination = (
        Path(args.out)
        if args.out
        else processed_dir(SOURCE_ID, config) / f"{SOURCE_ID}_gcc.parquet"
    )
    ensure_free_space(REQUIRED_FREE_BYTES)

    con = _connect()
    print(f"[{SOURCE_ID}] raw root  : {raw_dir(SOURCE_ID, config)}")
    print(f"[{SOURCE_ID}] output    : {destination}")
    print(f"[{SOURCE_ID}] streaming : {args.url}")

    reuse = args.reuse and destination.exists()
    if reuse:
        scanned = int(con.execute(f"SELECT count(*) FROM read_parquet('{destination.as_posix()}')").fetchone()[0])
        print(f"[{SOURCE_ID}] reusing existing artifact ({destination.stat().st_size} bytes)")
    else:
        print(f"[{SOURCE_ID}] scanning remote parquet (no full download) ...")
        scanned = scan(con, args.url)
        print(f"[{SOURCE_ID}] gcc tel+name rows: {scanned}")

    if scanned == 0:
        print(f"[{SOURCE_ID}] FAIL: predicate matched zero rows", file=sys.stderr)
        return 2

    if not reuse:
        written = extract(con, args.url, destination)
        print(f"[{SOURCE_ID}] wrote {written} rows -> {destination}")

    stats = measure(con, destination)
    stats.update(
        {
            "publisher": PUBLISHER,
            "source_url": HF_URL,
            "mirror_repo": HF_REPO,
            "mirror_snapshot": MIRROR_SNAPSHOT,
            "license": LICENSE,
            "artifact_bytes": destination.stat().st_size,
            "remote_artifact_bytes": 10_577_227_196,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    stats_path = processed_dir(SOURCE_ID, config) / "foursquare_os_places.stats.json"
    stats_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.write_text(json.dumps(stats, indent=2, sort_keys=True), encoding="utf-8")

    print(json.dumps(stats, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
