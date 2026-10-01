import httpx
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

packages = [
    ("EG", "hotosm_egy_points_of_interest"),
    ("SA", "hotosm_sau_points_of_interest"),
    ("AE", "hotosm_are_points_of_interest"),
    ("KW", "hotosm_kwt_points_of_interest"),
    ("QA", "hotosm_qat_points_of_interest"),
    ("BH", "hotosm_bhr_points_of_interest"),
    ("OM", "hotosm_omn_points_of_interest"),
]

for cc, pkg in packages:
    url = f"https://data.humdata.org/api/3/action/package_show?id={pkg}"
    try:
        r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
        if r.status_code == 200:
            res = r.json().get("result", {})
            title = res.get("title")
            print(f"=== {cc}: {title} ===")
            for rsc in res.get("resources", []):
                fmt = rsc.get("format", "").upper()
                name = rsc.get("name")
                durl = rsc.get("download_url") or rsc.get("url")
                if fmt in ("CSV", "GEOJSON", "SHP", "ZIP"):
                    print(f"   [{fmt}] {name} -> {durl}")
        else:
            print(f"{cc}: status {r.status_code}")
    except Exception as e:
        print(f"{cc} error: {e}")
