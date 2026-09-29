from __future__ import annotations

import argparse
from pathlib import Path

import phonenumbers
import polars as pl

from .config import PROCESSED_DIR


def normalize_phone(value: object, default_region: str | None) -> tuple[str, bool, str, str]:
    raw = "" if value is None else str(value).strip()
    if not raw:
        return "", False, "", ""

    try:
        parsed = phonenumbers.parse(raw, default_region)
    except phonenumbers.NumberParseException:
        return "", False, "", ""

    valid = phonenumbers.is_valid_number(parsed)
    if not valid:
        return "", False, "", ""

    e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    country = phonenumbers.region_code_for_number(parsed) or ""

    number_type = phonenumbers.number_type(parsed)
    type_map = {
        phonenumbers.PhoneNumberType.MOBILE: "mobile",
        phonenumbers.PhoneNumberType.FIXED_LINE: "fixed",
        phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE: "fixed_or_mobile",
        phonenumbers.PhoneNumberType.VOIP: "voip",
        phonenumbers.PhoneNumberType.TOLL_FREE: "toll_free",
        phonenumbers.PhoneNumberType.PREMIUM_RATE: "premium_rate",
    }
    return e164, True, country, type_map.get(number_type, "unknown")


def normalize_file(
    input_path: Path,
    *,
    phone_column: str,
    default_region: str | None,
    output_path: Path | None = None,
) -> Path:
    suffix = input_path.suffix.lower()
    if suffix == ".csv":
        frame = pl.read_csv(input_path, infer_schema_length=10000, truncate_ragged_lines=True)
    elif suffix == ".json":
        frame = pl.read_json(input_path)
    elif suffix == ".parquet":
        frame = pl.read_parquet(input_path)
    else:
        raise ValueError(f"Unsupported input format: {suffix}")

    if phone_column not in frame.columns:
        raise KeyError(f"Missing phone column {phone_column!r}; columns={frame.columns}")

    normalized = [normalize_phone(value, default_region) for value in frame[phone_column].to_list()]
    e164, valid, country, line_type = zip(*normalized) if normalized else ([], [], [], [])

    result = frame.with_columns(
        pl.Series("phone_e164", e164),
        pl.Series("phone_valid", valid),
        pl.Series("detected_country", country),
        pl.Series("line_type", line_type),
    ).filter(pl.col("phone_valid"))

    result = result.unique(subset=["phone_e164"], keep="first")

    output = output_path or (PROCESSED_DIR / f"{input_path.stem}_normalized.parquet")
    output.parent.mkdir(parents=True, exist_ok=True)
    result.write_parquet(output, compression="zstd")
    print(f"NORMALIZED {input_path.name}: {frame.height} rows -> {result.height} valid unique rows")
    print(f"OUTPUT {output}")
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize phone datasets to E.164")
    parser.add_argument("--input", required=True)
    parser.add_argument("--phone-col", default="phone")
    parser.add_argument("--region", default=None)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    normalize_file(
        Path(args.input),
        phone_column=args.phone_col,
        default_region=args.region,
        output_path=Path(args.output) if args.output else None,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
