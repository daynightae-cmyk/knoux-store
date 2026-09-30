"""Verify the real Next.js Signal lookup contract end-to-end."""
from __future__ import annotations

import argparse
import json

import httpx

from .models import LookupVerification


def verify_lookup(base_url: str, query: str, country: str, timeout: float = 30.0) -> LookupVerification:
    endpoint = base_url.rstrip("/") + "/api/signal/lookup"
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.post(endpoint, json={"query": query, "country": country})
    try:
        payload = response.json()
    except ValueError:
        return LookupVerification(ok=False, http_status=response.status_code, error="Lookup returned non-JSON content")

    if not response.is_success or not payload.get("ok"):
        reason = payload.get("error") or (payload.get("query") or {}).get("reason") or "lookup failed"
        return LookupVerification(ok=False, http_status=response.status_code, error=str(reason))

    data = payload.get("data") or {}
    number = data.get("number") or {}
    evidence_count = (
        len(data.get("aliases") or [])
        + len(data.get("businessMatches") or [])
        + len(data.get("publicMentions") or [])
        + len(data.get("reputation") or {})
        + (1 if (data.get("profile") or {}).get("verified") else 0)
    )
    return LookupVerification(
        ok=True,
        http_status=response.status_code,
        normalized_e164=number.get("e164"),
        country_code=number.get("countryCode"),
        line_type=number.get("lineType"),
        evidence_count=evidence_count,
        storage_available=(payload.get("storage") or {}).get("available"),
        providers=payload.get("providers") or {},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify /api/signal/lookup against the deployed/current app")
    parser.add_argument("phone")
    parser.add_argument("--country", default="AE")
    parser.add_argument("--base-url", default="http://127.0.0.1:4666")
    args = parser.parse_args()
    result = verify_lookup(args.base_url, args.phone, args.country)
    print(json.dumps(result.model_dump(mode="json"), ensure_ascii=False, indent=2, sort_keys=True))
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
