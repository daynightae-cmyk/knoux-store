# KNOuX Growth — Historical M0 Baseline

This is the original implementation checkpoint. Current recovery evidence is in SECURITY-RECOVERY-20261016.md; the route matrix below is historical.

**Date:** 2026-10-16 · **Branch:** `codex/growth-operating-studio-20261016`
**Starting main SHA:** `fe7fda8aa4e2fd43526ef395c1ec7dff98b77c4c` (PR #48 merged)
**Worktree:** `K:/Knoux Projects/_Integration/worktrees/growth-os-20261016` (clean, detached → branched)
**Protected:** local `Base` tree untouched · PR #50 branch untouched · Signal dataset untouched

## Verified reality (from origin/main, not assumptions)

- Next.js `^16.3.8` · React 19 · TS `~5.9` · Supabase SSR/js.
- Growth routes: `/growth`, `/growth/[slug]`, `/command` + 13 sub-routes (creative, campaigns, social, clients, leads, communities, connections, google, analytics, reports, intelligence, automations, settings).
- Migrations present: `20261005090000` v1, `20261005091000` v2, `20261007100000` write-boundaries, `20261007110000` durable-oauth. Production application blocked — no migration run here (owner authorization required).
- Auth: Supabase Auth + `resolvePrincipal`/`guardGrowth` + RBAC (`OWNER…VIEWER`) + RLS membership-tenancy. `growthAuthEnforced()` false by default; layout serves FIXTURE demo with explicit `DEMO` labels.
- Missing write path: studio edits + campaign plans are `useState`-local; `CampaignReview`/`AdPreviewTheatre` show "write endpoint unavailable"; `PlacementPreview` shows `EMPTY ASSET SLOT` — references never resolve to media URLs.
- API present: `capabilities`, `connections/[platform]`, `intelligence/probe`, `oauth/[provider]/start|callback`. Missing: client CRUD, creative/campaign drafts, media upload/resolve, discovery import, CRM writes, WhatsApp, reports export.
- Tests: 776 unit/integration claimed by recovery doc; targeted suites present (`growth-studio`, `growth-workspace-runtime`, `growth-campaigns`, `growth-migrations`, `growth-write-boundaries`, `growth-auth-*`).

## Route matrix

| Route | Status | Notes |
|---|---|---|
| `/growth`, `/growth/[slug]` | PARTIAL | Bilingual public experience exists; enquiry via contact endpoint. No private-data leak. |
| `/command`, `/command/creative` | VISUAL_ONLY | 8 placements render; media slot empty; edits local-only; no save. |
| `/command/campaigns` | PARTIAL | Lifecycle table + fingerprint invalidation real in TS; approval/persist blocked (no write endpoint). |
| `/command/social`, `/command/google` | VISUAL_ONLY | Preview theatre reuse; no publishing. |
| `/command/clients` | BACKEND_PRESENT_EMPTY | Read path via repository; create/edit UI absent; zero-prod-rows expected. |
| `/command/leads` | BACKEND_PRESENT_EMPTY | Schema + read path; capture/pipeline writes absent. |
| `/command/communities` | BACKEND_PRESENT_EMPTY | Curated-directory model enforced by schema absence; import flow absent. |
| `/command/connections` | EXTERNAL_CONFIGURATION_REQUIRED | Durable OAuth infra + truthful states; no provider secrets in env. |
| `/command/analytics`, `/command/reports` | DEMO_ONLY | Fixture rows with provenance; empty-live shows "no data" correctly. |
| `/command/intelligence` | EXTERNAL_CONFIGURATION_REQUIRED | Router + local fallback labelled degraded; agent endpoint absent. |
| `/command/automations` | VISUAL_ONLY | Advisory-only action kinds; no scheduler/executor. |
| `/command/settings` | PARTIAL | Autonomy/policy display; no mutation path. |

## First implementation task (Phase 1 vertical slice)

**REAL CLIENT → REAL MEDIA → REAL PREVIEW → REAL SAVED CAMPAIGN** decomposed as:

1. `20261016090000_knoux_growth_media_assets` — additive `knoux_growth_media_assets` table (client-scoped, RLS via memberships, signed-URL metadata, license/provenance columns) + storage-bucket SQL (operator creates `growth-media` private bucket; migration holds policies only).
2. `src/lib/growth/media.ts` — validation (MIME allowlist jpeg/png/webp/mp4, 10MB image / 100MB video caps, safe filename, hex-color irrelevant) + resolver contract (`assetRef → signed URL | EMPTY | EXPIRED`).
3. `src/app/api/growth/media/route.ts` — POST (guard `creative.create`, upload to private bucket via service role, insert asset row), GET (guard `creative.view`, list + signed URLs, tenant-scoped).
4. `src/app/api/growth/creatives/route.ts` + `src/app/api/growth/campaigns/route.ts` — guarded draft persistence (service-role writes, RLS-aligned, idempotency key, approval invalidation on relevant-field change).
5. `AdPreviewTheatre` — render resolved `<img>` when `mediaUrl` present; keep honest `EMPTY ASSET SLOT` otherwise; upload control with progress/retry.
6. Tests: `tests/growth-media-assets.test.mjs` (validation, tenant refusal, fingerprint invalidation incl. media change) + migration presence test extension.

## Supabase connection

Composio `supabase` toolkit: auth link issued, awaiting operator completion. No production reads/writes performed until Active. Link: [Connect supabase](https://connect.composio.dev/link/lk_pBjXtPsi9wvy)
