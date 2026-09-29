from __future__ import annotations

import json
from pathlib import Path

from .config import MANIFESTS_DIR, RAW_DIR
from .download_utils import sha256_file


def inspect() -> int:
    problems = 0
    for manifest_path in sorted(MANIFESTS_DIR.glob("*/manifest.json")):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        local = manifest.get("local_file")
        if not local:
            print(f"INVALID manifest: {manifest_path}")
            problems += 1
            continue

        candidates = list(RAW_DIR.rglob(Path(local).name))
        if not candidates:
            print(f"MISSING file for {manifest.get('dataset_id')}")
            problems += 1
            continue

        actual = sha256_file(candidates[0])
        expected = manifest.get("sha256")
        ok = actual == expected
        print(f"{'PASS' if ok else 'FAIL'} {manifest.get('dataset_id')} sha256={actual}")
        if not ok:
            problems += 1
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(inspect())
