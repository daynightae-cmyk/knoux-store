"""Parse current ITU National Numbering Plan PDFs into conservative prefixes.

Only current numbering-plan tables are selected. Historical migration/exchange
tables are intentionally excluded. Range expansion is exact: emitted decimal
prefix blocks never cover numbers outside the source range.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

import pymupdf

RAW_ROOT = Path("data/signal/raw")
MANIFEST_ROOT = Path("data/signal/manifests")
OUT_DEFAULT = Path("data/signal/processed/itu_numbering_prefixes.json")

COUNTRY = {
    "EG": {
        "calling": "20",
        "dataset": "itu_numbering-egypt",
        "file": "T020200003E0004PDFE.pdf",
        "tables": [(1, 1), (1, 2), (3, 1), (4, 1), (5, 1)],
    },
    "AE": {
        "calling": "971",
        "dataset": "itu_numbering-uae",
        "file": "T02020000DC0001PDFE.pdf",
        "tables": [(1, 1), (2, 1), (3, 1), (4, 1)],
    },
    "SA": {
        "calling": "966",
        "dataset": "itu_numbering-saudi",
        "file": "T02020000B70006PDFE.pdf",
        "tables": [(1, 1), (3, 1), (4, 1), (5, 2), (6, 1)],
    },
    "KW": {
        "calling": "965",
        "dataset": "itu_numbering-kuwait",
        "file": "T02020000730012PDFE.pdf",
        "tables": [(1, 1)],
    },
    "QA": {
        "calling": "974",
        "dataset": "itu_numbering-qatar",
        "file": "T02020000AB0002PDFE.pdf",
        "tables": [(1, 1)],
    },
    "BH": {
        "calling": "973",
        "dataset": "itu_numbering-bahrain",
        "file": "T02020000110008PDFE.pdf",
        "tables": [(1, 1), (2, 1), (3, 1), (4, 1), (5, 1)],
    },
    "OM": {
        "calling": "968",
        "dataset": "itu_numbering-oman",
        "file": "T020200009F0009PDFE.pdf",
        "tables": [(1, 1)],
    },
}

OMAN_CELL_OVERRIDES = {
    "74": ("Mobile service", "Ooredoo"),
    "75": ("Mobile service", "Vodafone"),
    "775": ("Mobile service", "Vodafone"),
    "776": ("Mobile service", "Vodafone"),
    "778": ("Mobile service", "Vodafone"),
    "779": ("Mobile service", "Vodafone"),
    "4": ("IoT Service", "Ooredoo/Omantel/Vodafone"),
    "21": ("Fixed service", "Ooredoo/Omantel/Awasr"),
}

OPERATOR_MARKERS = [
    ("Telecom Egypt", "Telecom Egypt"),
    ("Vodafone", "Vodafone"),
    ("Orange", "Orange"),
    ("Etisalat Masr", "Etisalat Masr"),
    ("Etisalat", "Etisalat"),
    ("du allocation", "du"),
    ("STC Bahrain", "stc Bahrain"),
    ("stc Bahrain", "stc Bahrain"),
    ("Saudi Telecom Company", "STC"),
    ("Assigned for STC", "STC"),
    ("Mobily", "Mobily"),
    ("Zain Saudi Arabia", "Zain"),
    ("Assigned for Zain", "Zain"),
    ("Virgin Mobile", "Virgin Mobile"),
    ("Salam Mobile", "Salam Mobile"),
    ("Red Bull", "Red Bull Mobile"),
    ("Lebara", "Lebara Mobile"),
    ("Bahrain Telecommunications Company", "Batelco"),
    ("BATELCO", "Batelco"),
    ("Zain Bahrain", "Zain Bahrain"),
    ("Ooredoo", "Ooredoo"),
    ("Omantel", "Omantel"),
    ("Virgin", "Virgin"),
    ("MoC", "MoC"),
]


def clean(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).replace("\ufffd", "-").split()).strip()


def numeric(value: str) -> int | None:
    match = re.search(r"\d+", value or "")
    return int(match.group()) if match else None


OM_DOCUMENT_OVERRIDES = {
    "74XXXXXX": ("Mobile service", "Ooredoo"),
    "75XXXXXX": ("Mobile service", "Vodafone"),
    "775XXXXX": ("Mobile service", "Vodafone"),
    "776XXXXX": ("Mobile service", "Vodafone"),
    "778XXXXX": ("Mobile service", "Vodafone"),
    "779XXXXX": ("Mobile service", "Vodafone"),
    "4XXXXXXXXXXX": ("IoT Service", "Ooredoo/Omantel/Vodafone"),
    "21XXXXXX": ("Fixed service", "Ooredoo/Omantel/Awasr"),
}


def row_fields(country: str, row: list[Any]) -> tuple[str, str, str, str, str]:
    vals = [clean(v) for v in row]
    if country == "OM":
        ndc = next((v for v in vals[:3] if v), "")
        maximum = vals[3] if len(vals) > 3 else ""
        minimum = vals[6] if len(vals) > 6 else ""
        usage = vals[9] if len(vals) > 9 else ""
        additional = vals[12] if len(vals) > 12 else ""
        if not usage and ndc in OM_DOCUMENT_OVERRIDES:
            usage, additional = OM_DOCUMENT_OVERRIDES[ndc]
        return ndc, maximum, minimum, usage, additional

    ndc = vals[0] if vals else ""
    maximum = vals[1] if len(vals) > 1 else ""
    minimum = vals[2] if len(vals) > 2 else ""
    usage = vals[3] if len(vals) > 3 else ""
    additional = vals[4] if len(vals) > 4 else ""
    return ndc, maximum, minimum, usage, additional


def decimal_range_prefixes(start: int, end: int) -> list[str]:
    """Cover [start,end] with exact decimal prefix blocks."""
    if start > end or start < 0:
        return []
    out: list[str] = []
    cursor = start
    while cursor <= end:
        power = 0
        while True:
            next_power = power + 1
            block = 10 ** next_power
            if cursor % block != 0 or cursor + block - 1 > end:
                break
            power = next_power
        divisor = 10 ** power
        prefix_value = cursor // divisor
        out.append(str(prefix_value))
        cursor += divisor
        if len(out) > 5000:
            raise ValueError(f"range expansion too large: {start}-{end}")
    return out


def fixed_digits(pattern: str) -> str:
    value = clean(pattern)
    value = re.sub(r"\(\s*NDC\s*\)", "", value, flags=re.I)
    value = value.replace("(0)", "0")
    compact = re.sub(r"[\s().]", "", value)
    match = re.match(r"0*([0-9]+)", compact)
    return match.group(1) if match else ""


def pattern_prefixes(raw: str, country: str) -> list[str]:
    text = clean(raw)
    if not text:
        return []

    # Pure numeric range or X-pattern range.
    parts = re.split(r"\s+(?:to|-)\s+", text, maxsplit=1, flags=re.I)
    if len(parts) == 2:
        left_digits = fixed_digits(parts[0])
        right_digits = fixed_digits(parts[1])
        if left_digits and right_digits:
            if len(left_digits) == len(right_digits):
                a, b = int(left_digits), int(right_digits)
                if b >= a:
                    if "X" in text.upper():
                        if b - a <= 200:
                            return [str(value) for value in range(a, b + 1)]
                    return decimal_range_prefixes(a, b)

    prefix = fixed_digits(text)
    if not prefix:
        return []

    # Egypt's source includes domestic trunk 0 in a few current rows (010/011/012).
    if country == "EG" and prefix.startswith("0") and len(prefix) > 1:
        prefix = prefix[1:]
    return [prefix]


def classify(usage: str, additional: str) -> str | None:
    text = f"{usage} {additional}".lower()
    compact = re.sub(r"\s+", "", text)
    if "reserved for future" in text:
        return None
    if "emergency" in text or "short code" in text or "short number" in text:
        return None
    if "freephone" in text or "toll-free" in text or "toll free" in text:
        return "freephone"
    if "premium" in text or "shared revenue" in text:
        return "premium"
    if "m2m" in text or "iot" in text:
        return "m2m"
    if "public mobile data" in text or "mobile data" in text:
        return "data"
    if "nomadic" in text:
        return "nomadic"
    if (
        "value-added" in text
        or "value added" in text
        or "special service" in text
        or "universal" in text
        or "corporate" in text
        or "security" in text
        or "military" in text
        or "fixed cost service" in text
        or "shared cost service" in text
    ):
        return "service"
    if "mobile" in text:
        return "mobile"
    if "geographic" in text or "geographic" in compact or re.search(r"\bfixed\b", text):
        return "fixed"
    return "other"


def operator_name(usage: str, additional: str) -> str | None:
    text = f"{usage} {additional}"
    found: list[str] = []
    for marker, canonical in OPERATOR_MARKERS:
        if marker.lower() in text.lower() and canonical not in found:
            found.append(canonical)
    return found[0] if len(found) == 1 else None


def manifest_for(dataset: str) -> dict[str, Any]:
    return json.loads(
        (MANIFEST_ROOT / dataset / "manifest.json").read_text(encoding="utf-8")
    )


def collect_rows() -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []

    for cc, meta in COUNTRY.items():
        dataset = meta["dataset"]
        manifest = manifest_for(dataset)
        pdf_path = RAW_ROOT / dataset / meta["file"]
        doc = pymupdf.open(pdf_path)

        for page_no, table_no in meta["tables"]:
            page = doc[page_no - 1]
            tables = page.find_tables().tables
            if table_no > len(tables):
                continue
            data = tables[table_no - 1].extract()

            for row_index, row in enumerate(data, start=1):
                ndc, maximum, minimum, usage, additional = row_fields(cc, row)
                if not ndc or "destination" in ndc.lower() or "leading digits" in ndc.lower():
                    continue
                if not re.search(r"\d", ndc):
                    continue

                line_type = classify(usage, additional)
                if line_type is None:
                    continue

                max_len = numeric(maximum)
                min_len = numeric(minimum)
                # Very short national-only service codes are not safe for prefix lookup.
                if max_len is not None and max_len <= 5:
                    continue

                national_prefixes = pattern_prefixes(ndc, cc)
                if not national_prefixes:
                    continue

                carrier = operator_name(usage, additional)
                for national_prefix in national_prefixes:
                    if not national_prefix.isdigit():
                        continue
                    full_prefix = f"{meta['calling']}{national_prefix}"
                    candidates.append({
                        "source_key": "itu_numbering",
                        "country_code": cc,
                        "prefix": full_prefix,
                        "carrier": carrier,
                        "line_type": line_type,
                        "source_record_id": f"{cc}:{full_prefix}:{line_type}",
                        "provenance": {
                            "dataset_id": dataset,
                            "document_sha256": manifest["sha256"],
                            "source_url": manifest["direct_download_url"],
                            "retrieved_at": manifest["retrieved_at"],
                            "page": page_no,
                            "table": table_no,
                            "row": row_index,
                            "raw_ndc": ndc,
                            "max_nsn_length": max_len,
                            "min_nsn_length": min_len,
                            "usage": usage,
                            "additional_information": additional,
                        },
                    })

    # Merge duplicate prefix/type candidates conservatively.
    grouped: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in candidates:
        grouped[(row["country_code"], row["prefix"], row["line_type"])].append(row)

    merged: list[dict[str, Any]] = []
    for key, variants in grouped.items():
        carriers = sorted({v["carrier"] for v in variants if v["carrier"]})
        first = variants[0]
        provenance_variants = [v["provenance"] for v in variants]
        digest = hashlib.sha256(
            json.dumps(provenance_variants, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ).hexdigest()
        merged.append({
            "source_key": "itu_numbering",
            "country_code": first["country_code"],
            "prefix": first["prefix"],
            "carrier": carriers[0] if len(carriers) == 1 else None,
            "line_type": first["line_type"],
            "source_record_id": first["source_record_id"],
            "provenance": {
                "authority": "International Telecommunication Union",
                "selection_policy": "current numbering-plan tables only; historical transition tables excluded",
                "variant_count": len(variants),
                "variant_digest": digest,
                "variants": provenance_variants,
            },
        })

    merged.sort(key=lambda row: (row["country_code"], row["prefix"], row["line_type"]))
    return merged


def main() -> int:
    from .path_guard import artifact_path
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUT_DEFAULT)
    args = parser.parse_args()
    args.output = artifact_path(args.output)

    rows = collect_rows()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )

    per_country: dict[str, int] = defaultdict(int)
    per_type: dict[str, int] = defaultdict(int)
    for row in rows:
        per_country[row["country_code"]] += 1
        per_type[row["line_type"]] += 1

    print(json.dumps({
        "rows": len(rows),
        "countries": dict(sorted(per_country.items())),
        "line_types": dict(sorted(per_type.items())),
        "output": str(args.output),
    }, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
