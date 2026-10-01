# KNOuX SIGNAL — Source Governance

Last reviewed: 2026-09-29

This file is an implementation gate for KNOuX SIGNAL inside KNOuX Store.

## Truth contract

- Public visibility is not the same as bulk-reuse permission.
- A source marked APPROVED may still remain disabled until access credentials, grant terms, attribution, or a bounded ingestion implementation exist.
- QUARANTINED sources are metadata/roadmap only. They are never auto-downloaded or ingested.
- REJECTED sources are never downloaded, copied, queried through unofficial endpoints, or used to enrich results.
- No AI model may invent a phone-owner name, alias, carrier, business identity, reputation score, source, or evidence.
- Live lookup results must state the actual provider/data state.
- Personal reverse-lookup coverage is not implied by business/public-entity sources.

## Approved foundation

- Google libphonenumber: validation, E.164 normalization, numbering metadata.
- OpenStreetMap: public business/place phone data, subject to ODbL attribution and bounded ingestion.
- Wikidata: public entity phone statements, subject to bounded SPARQL ingestion and privacy review.
- ITU numbering-plan references: numbering metadata/reference documents.
- Dubai Pulse DED commerce: official business data; disabled until account/grant is obtained.
- Wathq commercial register: official business verification; disabled until authenticated API access is configured.
- Oman Business Platform: official business verification; no automated API is assumed.

## Quarantined

- OpenCorporates: keep disabled until commercial reuse/API terms for KNOuX are explicitly confirmed.
- MCC/MNC.org: useful operator metadata, but retain license/reuse evidence before production download.
- HLR/number-validation providers: require contract, permitted-purpose, privacy and cross-border review.
- CAMARA / Open Gateway: strategic integration only; availability varies by operator/country.
- Tellows / SpamCalls: no scraping; licensed access only.
- InfobelPRO / Signzy / KYC providers: contract and permitted-purpose review required.
- Dubizzle / OpenSooq: public listings are not bulk-reuse permission.

## Rejected

- Copied Truecaller/Getcontact datasets or unofficial APIs.
- Leaked/breached contact lists or SIM/WhatsApp dumps.
- Unauthorized Yellow Pages or directory scraping.
- Hidden contact-book harvesting.

## Ingestion gate

DISCOVER -> VERIFY SOURCE/RIGHTS -> DOWNLOAD -> SHA-256 -> INSPECT -> NORMALIZE E.164 ->
DEDUPE -> STAGE -> INGEST -> PROVENANCE -> VERIFY

Every downloadable artifact must retain:
- source key and publisher
- source and direct-download URLs
- license/reuse reference
- UTC retrieval timestamp
- file size
- SHA-256
- country coverage
- rows seen/imported/rejected
- ingestion result/error

Raw and processed datasets are local build artifacts and are not committed to Git.
