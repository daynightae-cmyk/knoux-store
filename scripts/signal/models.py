"""Typed contracts for the KNOuX Signal ingestion pipeline.

These models describe dataset/provenance state only. They do not replace the
runtime Signal API contracts in ``src/lib/signal/types.ts`` and they do not
create a second community alias/reputation model.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class LegalStatus(str, Enum):
    APPROVED = "approved"
    QUARANTINED = "quarantined"
    REJECTED = "rejected"


class IngestionStatus(str, Enum):
    NOT_STARTED = "not_started"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    INSPECTING = "inspecting"
    NORMALIZING = "normalizing"
    STAGING = "staging"
    STAGED = "staged"
    PROMOTING = "promoting"
    PROMOTED = "promoted"
    REJECTED = "rejected"
    FAILED = "failed"


class QualityMetrics(BaseModel):
    total_rows: int | None = None
    phone_rows: int | None = None
    valid_phone_rows: int | None = None
    unique_phone_rows: int | None = None
    name_rows: int | None = None
    duplicate_rate: float | None = None
    invalid_phone_rate: float | None = None
    missing_name_rate: float | None = None


class DatasetManifestEntry(BaseModel):
    dataset_key: str
    title: str
    source_key: str
    publisher: str = ""
    source_url: str = ""
    direct_download_url: str = ""
    license_url: str = ""
    countries: list[str] = Field(default_factory=list)
    formats: list[str] = Field(default_factory=list)
    legal_status: LegalStatus = LegalStatus.QUARANTINED
    ingestion_status: IngestionStatus = IngestionStatus.NOT_STARTED
    artifact_name: str = ""
    artifact_sha256: str = ""
    file_size_bytes: int | None = None
    measured_rows: int | None = None
    valid_phone_records: int | None = None
    unique_phone_records: int | None = None
    retrieved_at: str | None = None
    reason: str = ""
    quality: QualityMetrics = Field(default_factory=QualityMetrics)
    provenance: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StageRecord(BaseModel):
    dataset_key: str
    source_record_fingerprint: str
    record_kind: str
    raw_phone: str = ""
    phone_e164: str | None = None
    country_code: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class LookupVerification(BaseModel):
    ok: bool
    http_status: int
    normalized_e164: str | None = None
    country_code: str | None = None
    line_type: str | None = None
    evidence_count: int = 0
    storage_available: bool | None = None
    providers: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
