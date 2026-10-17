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
- `supabase/migrations/20261016090000_knoux_growth_media_assets.sql`: positive bounded byte sizes, matching media kind/MIME, exact first-segment tenant storage paths (without SQL LIKE wildcard ambiguity) and a composite client/media FK prevent cross-tenant attachment even by future privileged writers. No bucket is created by this migration.
- `AdPreviewTheatre.tsx`: submit the expected revision, show actual save status, preserve explicit media removal, renew authorized signed URLs every four minutes and on focus, retrieve a selected asset outside the first library page, distinguish unresolved/loading media, and refuse MP4 rendering in image-only placements. All eight placements and Copy/Assets/Approval panels remain. Library refresh errors are separate from upload/save errors, and a background refresh cannot clear an in-flight save state. Successful upload+record persistence remains a success with UNRESOLVED delivery if URL signing fails.
- `BrandProfileEditor.tsx`, client PATCH and the service-only profile transaction: authorized owners/managers edit client identity and bilingual brand rules with an expected revision. Draft campaign approvals are invalidated atomically. Approved/live campaigns or reviewed creatives prevent profile edits until their review workflow permits changes. The pending migration revokes direct authenticated client writes, preventing browser bypass of approval invalidation. Onboarding remains OWNER-only.
- `CampaignReview.tsx`: persistent draft save with conflict reporting, separate from the local review snapshot. No approval submission or publisher is claimed.
- `types.ts`, `studio.ts`, `persistence/workspace-projection.ts`: persist/rehydrate the media asset ID and destination; signed URLs remain transient.
- `tests/growth-draft-{handlers,transactions}.test.mjs`: actual shipped handler/RBAC execution with I/O stubs plus actual migration/RPC execution in PGlite PostgreSQL. These cover tenant overwrites, permissions, expired sessions, forged associations, foreign media, stale/concurrent revisions, duplicate creates, approval invalidation, channel failure rollback, privileged FK enforcement, onboarding and workspace rehydration. Follow-up tests execute as service_role itself, reject direct browser profile mutations, prove pending approvals survive failed channel/audit operations, and cover brand profile revision/tenant/review enforcement. Media policy and cleanup tests were expanded.

## Local verification

Node `v24.21.0`. Tests were not disabled or excluded.

| Check | Exit | Evidence |
| --- | --- | --- |
| Focused security/media suites | 0 | 37 tests across the final focused files; PostgreSQL transaction behavior and shipped handlers |
| Final full `npm test` | 0 | 849 passed, 0 failed, 0 skipped |
| `npm run typecheck` | 0 | Final source |
| `npm run lint` plus final changed-file ESLint pass | 0 | No rule suppression |
| `npm run build` | 0 | 96 generated pages; clients/creative/campaign/media APIs included |
| `npm run audit:css-integrity` | 0 | 62 documents, 17 byte-matched HTTP 200 stylesheets, 15 route families |
| `npm run audit:dead` | 0 | Configuration hints only |
| Focused desktop Playwright `e2e/growth-studio.spec.ts` | 0 | 5 passed: synchronized edits, mobile drawer, brief, responsive geometry/axe, remaining command routes |
| `npm audit --omit=dev --audit-level=high` | 0 | Zero production vulnerabilities |
| `npm run audit:deps` | 1 | 6 high development-tooling findings through braces/micromatch/fast-glob/ESLint/Knip; no published braces fix. Existing CI treats this as informational; the workflow was not changed. |
| `git diff --check` | 0 | No whitespace errors |

An initial full test invocation overlapped a build and failed production-server startup. This was corrected: the final build and full test run were sequential, and all 849 tests passed. An intermediate unused-variable/type error during cleanup hardening was repaired before final verification.

Full unit log: `%TEMP%/knoux-pr51-security-tests-20261016.log`. Playwright screenshots/traces: `e2e/.artifacts/`. CSS evidence: `.qa-css/integrity.json`. These local artifacts are retained, not claimed as live Supabase evidence.

## Delivery and remaining gates

The first recovery head `d0b4f22a4c90aefbb2f34709d78f108ff6068df3` passed remote SonarCloud (0.0% new-code duplication, 3% unchanged limit, quality gate OK), CodeQL, the combined verification job, Vercel Preview and the V4 visual matrix. Its comprehensive route/accessibility job was still running before this follow-up. New-head checks must be read again after pushing the follow-up; prior-head success is not acceptance evidence. No Sonar exclusions, audit thresholds, CI failure handling or test exclusions were changed.

The full development-tooling audit still reports https://github.com/advisories/GHSA-vfj7-8cjw-p6xm (braces through 3.0.3, no patched version). Production audit is clean. Current Next ESLint still depends on fast-glob; blindly forcing a Knip major does not remove the Next chain. The pre-existing workflow uses continue-on-error for the tooling audit, while enforcing the production audit. This corrects the first checkpoint's overly broad description of this advisory as a required-CI blocker. The advisory remains disclosed and unresolved.

## Authorized local verification fallback

The owner explicitly confirmed the connected KKNOUX STORE project is production and prohibited schema, Storage, policy or data changes. They authorized an isolated local runtime if Docker was available, otherwise PGlite and isolated storage/API tests. No paid cloud resource or unrelated project may be used.

- Supabase CLI: `npx --yes supabase --version` returned `2.121.0`; `start --help` was read.
- Docker: not found in PATH or the standard Docker Desktop/Chocolatey binary paths. No Docker service or engine pipe was present. A local Supabase container runtime cannot be established with the available tooling; no runtime installation or cloud resource was attempted.
- The authorized fallback executes the ordered migration SQL and transaction functions in PGlite PostgreSQL, including invoker execution as service_role, browser grant refusals, FK/tenant constraints, optimistic revisions, approval invalidation, concurrent saves, idempotency and rollback.
- Actual shipped handlers execute with isolated auth/storage/database I/O adapters, covering upload bytes, cleanup, signed resolution ownership and expired sessions. Stored rows rehydrate through the actual workspace projection and Studio edit initialization.
- Production-build HTTP proof: unauthenticated media read 401, creative write 401, private Studio 307 to `/login?next=/command`, exit 0.
- Read-only connector inspection of production verified existing Growth column/constraint compatibility and service-role CRUD privileges. Existing browser client write grants confirmed the need for the pending revocation. The media table, new draft RPCs and growth-media bucket are absent; there is no development branch. No remote write was performed.

**Real Supabase Storage integration: NOT RUNTIME VERIFIED.** No authorized local/non-production Storage runtime or server credentials are available. Upload/signing/expiry and the authenticated browser save/reload vertical slice against real Supabase remain unverified. The full live vertical slice is NOT accepted. PostgreSQL and isolated I/O evidence must not be represented as production or real Supabase Storage proof.

Before rollout, an owner must authorize the target database, apply/review the ordered Growth migrations in non-production, configure the private `growth-media` bucket, bootstrap an OWNER, then run: onboard client -> create campaign -> create creative -> upload image -> save -> reload -> resolve/preview -> deny another tenant. Repeat after signed-token expiry. Verify Storage policies and Supabase advisors on that environment. Production database changes and bucket creation remain unauthorized.

Do not merge while a required check is failing/pending; disclose the existing informational tooling audit separately. Do not assume absence of branch protection waives the user's gates. Merging main may trigger production Vercel deployment and needs the owner's deployment authorization. No merge, production migration, bucket creation, external publishing or ad spend was performed.

Continue Stage A only after PR #51 is stabilized and safely integrated; discovery/CRM/provider execution stages have not been started or represented as complete.
