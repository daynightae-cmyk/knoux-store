# KNOuX SIGNAL ingestion pipeline

This pipeline is part of the KNOuX Store repository. It is not a separate product.

## Safety gates

Only sources that are both APPROVED and enabled may be downloaded automatically.
QUARANTINED and REJECTED sources are blocked in code.

## Local setup (Windows)

python -m venv .venv-signal
.\.venv-signal\Scripts\python.exe -m pip install --no-compile -r requirements-signal.txt

The --no-compile flag is intentional on the current Windows/Python 3.13 workstation because pip bytecode compilation can fail under the local filesystem/AV setup.

## Verification

.\.venv-signal\Scripts\python.exe -m compileall -q scripts\signal
.\.venv-signal\Scripts\python.exe -m scripts.signal.download_datasets --dry-run

## Normalize a local dataset

.\.venv-signal\Scripts\python.exe -m scripts.signal.normalize_datasets --input data\signal\raw\source.csv --phone-col phone

## Ingest approved normalized business data

A service-role key is required only for the offline ingestion process. It must never be exposed to browser code.

Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell, then run:
.\.venv-signal\Scripts\python.exe -m scripts.signal.ingest_datasets --input data\signal\processed\source_normalized.parquet --source openstreetmap

Use --dry-run first. Raw/processed/manifests/logs are ignored by Git.
