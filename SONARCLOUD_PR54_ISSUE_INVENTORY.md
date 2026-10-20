---
kind: spec
title: "SONARCLOUD_PR54_ISSUE_INVENTORY"
---

# SonarCloud PR #54 Issue Inventory

Analysis revision: exact PR head after remediation.
Branch: `feat/visual-singularity-platform`

| Issue Key | Rule | Severity | Type | File | Line(s) | Status Before | Fix Applied | Commit SHA | Status After |
|---|---|---|---|---|---|---|---|---|---|
| AaFM1rpm9MLJZdp8zWy2 | jssecurity:S8707 | MAJOR | VULNERABILITY | scripts/capture-build-workspace.mjs | 11-12 | OPEN | Path resolution + basename guard; refuse `.` start | 7024df1 | CLOSED (pending exact-head Sonar verification) |
| AaFM1rqF9MLJZdp8zWzW | javascript:S3403 | MAJOR | BUG | scripts/route-sweep.mjs | 176 | OPEN | `=== null` -> `=== ''` (empty string check) | 7024df1 | CLOSED (pending exact-head Sonar verification) |
| AaFM1rpv9MLJZdp8zWy9 | jssecurity:S8707 | MAJOR | VULNERABILITY | scripts/visual-capture-baseline.mjs | 22-23 | OPEN | Path resolution + basename guard | 7024df1 | CLOSED (pending exact-head Sonar verification) |
| AaFM1ro_9MLJZdp8zWxn | jssecurity:S8707 | MAJOR | VULNERABILITY | scripts/visual-capture.mjs | 13-15 | OPEN | Path resolution + basename guard | 7024df1 | CLOSED (pending exact-head Sonar verification) |
| AaFM1rOu9MLJZdp8zWxM | css:S4657 | CRITICAL | BUG | src/app/visual-system-v3.css | 98 | OPEN | Moved `font-style:normal` after `font:inherit` shorthand | 7024df1 | CLOSED (pending exact-head Sonar verification) |

Root causes documented:
- S8707: CLI-supplied directory arguments used without validation, allowing path traversal via `mkdirSync`.
- S3403: `.alt` property on `HTMLImageElement` is a `DOMString`; missing attribute yields `""`, never `null`. The original `=== null` was always false.
- S4657: `font-style:normal` was overridden by the `font:inherit` shorthand that followed it.

All fixes preserve existing application behavior; no security rules were suppressed.
