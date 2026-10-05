"""Measure exact deduplicated corpus metrics across all ready Signal Parquet datasets."""
from pathlib import Path
import json
import polars as pl
import sys

sys.stdout.reconfigure(encoding="utf-8")

pfs = [
    Path("data/signal/processed/ready/osm_egypt_business_phones.parquet"),
    Path("data/signal/processed/ready/osm_gcc_business_phones.parquet"),
    Path("data/signal/processed/ready/wikidata_public_entities.parquet"),
    Path("data/signal/processed/ready/opensanctions_targets.parquet"),
    Path("data/signal/processed/ready/overture_fsq_places.parquet"),
]

all_dfs = []
total_rows = 0

for p in pfs:
    if not p.exists():
        continue
    df = pl.read_parquet(p)
    total_rows += len(df)
    sub = pl.DataFrame(
        {
            "phone_e164": df["phone_e164"].cast(pl.String),
            "country_code": df["country_code"].cast(pl.String),
            "business_name": df["business_name"].cast(pl.String) if "business_name" in df.columns else pl.Series([None] * len(df), dtype=pl.String),
            "person_name": df["person_name"].cast(pl.String) if "person_name" in df.columns else pl.Series([None] * len(df), dtype=pl.String),
            "aliases": df["aliases"].cast(pl.String) if "aliases" in df.columns else pl.Series([None] * len(df), dtype=pl.String),
            "source_key": df["source_key"].cast(pl.String),
        },
        schema={
            "phone_e164": pl.String,
            "country_code": pl.String,
            "business_name": pl.String,
            "person_name": pl.String,
            "aliases": pl.String,
            "source_key": pl.String,
        }
    )
    all_dfs.append(sub)

combined = pl.concat(all_dfs)
unique_e164 = combined["phone_e164"].n_unique()
with_person_name = combined.filter(pl.col("person_name").is_not_null() & (pl.col("person_name") != "")).height
with_business_name = combined.filter(pl.col("business_name").is_not_null() & (pl.col("business_name") != "")).height
with_aliases = combined.filter(pl.col("aliases").is_not_null() & (pl.col("aliases") != "")).height

print("=== COMBINED KNOUX SIGNAL CORPUS STATS ===")
print("Total Measured Rows:", total_rows)
print("Total Unique E.164 Phones:", unique_e164)
print("Records with Business Names:", with_business_name)
print("Records with Person Names:", with_person_name)
print("Records with Aliases:", with_aliases)
print("Country Breakdown:")
for r in combined.group_by("country_code").agg([
    pl.count().alias("rows"),
    pl.col("phone_e164").n_unique().alias("unique_phones")
]).sort("rows", descending=True).to_dicts():
    print(f"  {r['country_code']}: {r['rows']} rows, {r['unique_phones']} unique E.164")
