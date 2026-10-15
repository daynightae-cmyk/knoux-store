# Published Sentinel Guide recovery

Baseline: GitHub main `77a78bccf3f8623988e53d1f98506b98384c1877`, verified with `git ls-remote` on 16 October 2026. Changes are isolated from Base and all original C/K copies.

Source: Traycer `FINAL_RECOVERY_DECISION_MATRIX.csv`, first two rows; physical copy `sentinel-visitor-guide-31742fe9`. The eight source files below match `K35_RAW_FILE_HASHES.csv` SHA256 evidence. The independent local snapshot contains their original bytes, C dirty sources and the complete original Git object store, including stashes and unreachable objects.

| Source path | SHA256 |
| --- | --- |
| src/app/api/sentinel/catalog/route.ts | 44d06d814516d7e13e5aed63aa1f9d36af3b14a6c30fb6a17a328cfaebd703b1 |
| src/components/identity/SentinelGuideLauncher.tsx | 73f90e77c689c15a96228bc748bf19c8654eaf3dbbbc7a179347a16821c81b5f |
| src/components/identity/SentinelGuidePanel.tsx | 9a2c39748c3e7100169a1a222713c17ed977513174187a55d3b2f53ee59aae37 |
| src/components/identity/SentinelGuide.module.css | 81c63df2b017aa319b45db7656d6b9f17664b3e179f288de0749d343f4877dfc |
| src/components/identity/sentinel-preferences.ts | fa6876369d160f8c1844b95998001ecbdaf05aee33de57c269a92ef21c7335ae |
| src/lib/sentinel/guide.ts | c0a9aaa9c4a1678d87e60356f6cda8e35dffd64a84e8608d3b469e6181542a9f |
| src/lib/sentinel/visible-section.ts | 9ebe27caecc4b038acc942552a58df807b7ee8bc4ed67dfb63308e0003b17e79 |
| tests/sentinel-guide.test.mjs | e06606dec41c16e5085543528cc8a812a143007d02b2dfed6ea8033aa41eeb6f |

## Behavior

The site layout exposes an accessible, lazily loaded native modal for published page explanations, local service search and optional browser speech. Arabic and English choice persists locally; Arabic search accepts vowel marks, articles and punctuation. Source links close the modal. Escape restores focus after modal removal. Quiet mode stops speech and pointer following. No provider, account, bridge or database calls are made by the guide. The anonymous catalog projects only public registry fields, denies query parameters and foreign origins, and bounds requests and per-process request volume. Per-process limits are not distributed abuse protection.

PR #45 (`c4ea76686871981ce5ad5de33b0ab8221c2e49e8`) already contains a substantially expanded companion, provider and locale implementation. This increment isolates the hash-verified published guide; it does not claim the broader PR is lost or fully reconciled. Applying #45 later requires reconciling overlapping guide files. PR #46 remains stacked on #45.

## Verification

`e2e/sentinel-guide-recovery.spec.ts` covers local search, Arabic/RTL persistence, modal geometry at 11 widths, keyboard focus, navigation and retry after unavailable catalog. `tests/sentinel-guide.test.mjs` exercises the actual catalog boundary and projection. Existing mascot tests verify the preserved mark and pointer behavior.

Runtime credentials and production integrations are not required. No production changes or database migrations are part of this recovery. Revert this atomic commit to remove the guide while preserving original sources.

Executed: full ESLint PASS; TypeScript PASS; production build PASS; unit/integration 772/772 PASS; CSS integrity PASS (62 documents, 17 byte-matched stylesheets, 15 route families); focused production Playwright 9/9 PASS including axe. Initial browser failures exposed a focus-restoration bug (fixed) and an overly broad dialog selector (scoped to Sentinel; Build has its own dialog). Full repository Playwright is not yet certified. npm audit reports six existing high development-tooling findings in the braces chain; no dependency versions changed. No live speech service or provider was exercised.
