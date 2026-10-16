# PR #51 security recovery — 2026-10-16

Branch: `codex/growth-operating-studio-20261016`  
PR: https://github.com/daynightae-cmyk/knoux-store/pull/51  
Worktree: `K:/Knoux Projects/_Integration/worktrees/growth-os-20261016`

## Recovery evidence

The original worktree was clean at `d3f1afa7d0f0936ef9cc39dd8774a3c2b11be31b`, matching the remote PR head. There was no unique uncommitted material to snapshot. No standalone Cline process was found; the available VS Code Cline task directory last changed October 14. No unexpected concurrent edits appeared during recovery. Base and unrelated worktrees were not changed.

Fetched origin and merged `efd33c5c5ec2b116e452f4bbc212fdc2c04ef252` (current main including PRs #47/#49/#50) without conflict or history rewriting. Merge commit: `52c450d5ec756dac49ece22f8c83dae4a2d17674`.

## Changes and security behavior

- `src/lib/growth/draft-api.ts`: shared bounded JSON/origin validation, authenticated failures, scoped draft listing and transaction response mapping. The creative/campaign routes retain their domain-specific field validation.
- `src/app/api/growth/{creatives,campaigns}/route.ts`: removed arbitrary-ID upserts. An ID means update and requires `expectedUpdatedAt`; create requires a stable UUID `requestId`. Associated campaign/media IDs remain untrusted. Unknown platforms, malformed dates, review status changes and invalid identifiers are refused.
- `src/lib/growth/rbac.ts`: explicit `creative.edit` permission for existing creative-author roles; campaign updates use `campaign.edit`.
- `supabase/migrations/20261016045736_knoux_growth_atomic_drafts.sql`: CLI-generated migration. Invoker-rights, service-role-only functions lock the tenant and record, check current membership, validate ownership and allowed review states, update versions, invalidate durable approval rows, replace tenant-scoped channels and append audit within one transaction. Failed channel/audit persistence rolls back the parent and approval changes. Durable create receipts prevent duplicate records and reject request-key reuse with changed input. The CLI timestamp sorts before the media migration; functions reference media only when called, and the entire ordered sequence was executed successfully in PostgreSQL.
- `src/app/api/growth/clients/route.ts`: an existing workspace OWNER can onboard a client atomically with its owner membership. First-owner bootstrap still requires operator provisioning. No production test clients were created.
- `src/components/command/studio/CreateGrowthDraft.tsx` and `/command/{clients,creative,campaigns}/page.tsx`: bilingual authenticated creation controls in the existing workspace. Demo mode hides real create controls. Campaign/creative drafts are durable through the existing database and refresh into the workspace.
- `src/app/api/growth/media/route.ts` and `src/lib/growth/media.ts`: authenticate before multipart buffering; enforce declared and streamed request caps; verify allowed media signatures/structure; sanitize names, paths and client IDs; check signing paths against the authorized tenant; clean up storage after failed database writes and report cleanup failure. Images are capped at 10 MiB, MP4 at 20 MiB, multipart requests at 21 MiB. Signature checks are not full decoding or transcoding. Hosting ingress limits can be lower.
- `supabase/migrations/20261016090000_knoux_growth_media_assets.sql`: positive bounded byte sizes, matching media kind/MIME, tenant storage paths and a composite client/media FK prevent cross-tenant attachment even by future privileged writers. No bucket is created by this migration.
- `AdPreviewTheatre.tsx`: submit the expected revision, show actual save status, preserve explicit media removal, renew authorized signed URLs every four minutes and on focus, retrieve a selected asset outside the first library page, distinguish unresolved/loading media, and refuse MP4 rendering in image-only placements. All eight placements and Copy/Assets/Approval panels remain.
- `CampaignReview.tsx`: persistent draft save with conflict reporting, separate from the local review snapshot. No approval submission or publisher is claimed.
- `types.ts`, `studio.ts`, `persistence/workspace-projection.ts`: persist/rehydrate the media asset ID and destination; signed URLs remain transient.
- `tests/growth-draft-{handlers,transactions}.test.mjs`: actual shipped handler/RBAC execution with I/O stubs plus actual migration/RPC execution in PGlite PostgreSQL. These cover tenant overwrites, permissions, expired sessions, forged associations, foreign media, stale/concurrent revisions, duplicate creates, approval invalidation, channel failure rollback, privileged FK enforcement, onboarding and workspace rehydration. Media policy and cleanup tests were expanded.

## Local verification

Node `v24.21.0`. Tests were not disabled or excluded.

| Check | Exit | Evidence |
| --- | --- | --- |
| Focused security/media suites | 0 | 30 tests; PostgreSQL transaction behavior and shipped handlers |
| Final full `npm test` | 0 | 842 passed, 0 failed, 0 skipped |
| `npm run typecheck` | 0 | Final source |
| `npm run lint` plus final changed-file ESLint pass | 0 | No rule suppression |
| `npm run build` | 0 | 96 generated pages; clients/creative/campaign/media APIs included |
| `npm run audit:css-integrity` | 0 | 62 documents, 17 byte-matched HTTP 200 stylesheets, 15 route families |
| `npm run audit:dead` | 0 | Configuration hints only |
| Focused desktop Playwright `e2e/growth-studio.spec.ts` | 0 | 5 passed: synchronized edits, mobile drawer, brief, responsive geometry/axe, remaining command routes |
| `npm run audit:deps` | 1 | 6 high findings through braces/micromatch/fast-glob/ESLint/Knip; no published braces fix |
| `git diff --check` | 0 | No whitespace errors |

An initial full test invocation overlapped a build and failed production-server startup. This was corrected: the final build and full test run were sequential, and all 842 tests passed. An intermediate unused-variable/type error during cleanup hardening was repaired before final verification.

Full unit log: `%TEMP%/knoux-pr51-security-tests-20261016.log`. Playwright screenshots/traces: `e2e/.artifacts/`. CSS evidence: `.qa-css/integrity.json`. These local artifacts are retained, not claimed as live Supabase evidence.

## Delivery and remaining gates

At commit creation, remote CI for the new head has not yet run. Query PR checks against the exact pushed SHA. Old-head Sonar reported 4.6% duplication against a 3% maximum. No Sonar exclusions or quality thresholds were changed. Shared API logic removes the relevant route duplication; only the remote new-head result establishes success.

The dependency audit currently blocks integration. Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm (braces through 3.0.3, no patched version). Current Next ESLint still depends on fast-glob; blindly forcing a Knip major does not remove the Next chain. Audit was neither bypassed nor downgraded. The appropriate next step is a reviewed upstream dependency replacement/fix, followed by the unchanged gate.

No Supabase server credentials or authorized non-production project are configured in this worktree. Consequently actual Storage upload/signing, authenticated browser save/reload against Supabase, bucket privacy and real provider delivery have NOT been verified. PostgreSQL tests and storage I/O stubs are explicitly separate evidence. The full live vertical slice is NOT accepted yet.

Before rollout, an owner must authorize the target database, apply/review the ordered Growth migrations in non-production, configure the private `growth-media` bucket, bootstrap an OWNER, then run: onboard client -> create campaign -> create creative -> upload image -> save -> reload -> resolve/preview -> deny another tenant. Repeat after signed-token expiry. Verify Storage policies and Supabase advisors on that environment. Production database changes and bucket creation remain unauthorized.

Do not merge while audit or another requested gate is failing/pending. Do not assume absence of branch protection waives the user's gates. Merging main may trigger production Vercel deployment and needs the owner's deployment authorization. No merge, production migration, bucket creation, external publishing or ad spend was performed.

Continue Stage A only after PR #51 is stabilized and safely integrated; discovery/CRM/provider execution stages have not been started or represented as complete.
