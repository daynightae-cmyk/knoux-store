# KNOuX Sentinel continuation — 13 October 2026

## Authority and preservation

VERIFIED active implementation: `C:/Users/day night/.codex/worktrees/sentinel-visitor-guide`, branch `codex/sentinel-visitor-guide`. Recovered HEAD was `3ff8dfb21d87ead47ad83160c67ac242b616e388`; the branch was fast-forwarded to freshly fetched main `5bce934aaf3a020ba830288136d72419f58fdd89` after verifying no upstream overlap in the modified Sentinel/layout files. Final HEAD remains that main SHA; all Sentinel changes are **uncommitted and unstaged at the owner's explicit request**. No new PR, push, merge of a PR or production deployment.

| Location | Verified authority / disposition |
|---|---|
| `K:/Knoux Projects/KNOuX Store/Base` | Shared migration baseline, local main `9f3497480933236483a860b338dc352d1aa2931d`, 120 pending deletions. Untouched. Composer still imports missing build modules. Its Gate A baseline remains BLOCKED; this continuation does not restore those files. |
| `D:/Knoux Store` | Historical repository/common Git directory used by the active C: worktree; still exists and is not a junction. Preserve it while that worktree depends on it. |
| `K:/Knoux Projects/KNOuX Store/Worktrees/sentinel-visitor-guide-31742fe9` | Non-Git migrated source copy: the 11 checked Sentinel implementation/test files matched C: before continuation. Preserved as recovery evidence; not silently treated as a registered worktree. |
| `C:/Users/day night/.codex/worktrees/sentinel-visitor-guide` | Most complete recoverable live Git worktree, original unpublished code and evidence retained; exclusive target for this continuation. |
| `D:/KNOUX-MCP-Gateway` and `K:/Knoux Projects/KNOuX MCP Gateway/Base` | Eleven audited source/configuration files match. Both retain the earlier relay fix. No Gateway code changed during this continuation. K: is the preferred project collection; D: remains a preserved historical copy. |
| `D:/KNOUX_Agent` and `K:/Knoux Projects/KNOuX Agent/Base` | Twelve audited source/configuration files match. No Agent code changed. No Git initialization. |

R1 artifact SHA-256 verification passed for the Store all-refs bundle, Base patch and all three WT03 Sentinel artifacts under `K:/Knoux Projects/Backups/R1-Preservation/R1-20261013-055841`. R1 was not overwritten. Separate pre-edit checkpoint: `K:/Knoux Projects/Backups/Sentinel-Continuation-20261013-33ca0f8eae`, including tracked modifications, untracked implementation, Git status/refs and associated ignored QA evidence with manifests.

Migration comparison: `qa/continuation/migration-hashes.csv`. Store comparison found 5,541 identical files, 186 D-only files and one differing generated `tsconfig.tsbuildinfo`; D-only includes deleted build source and recovery-runtime material. This is a source/evidence comparison excluding Git objects, dependency trees, build outputs and major tool runtimes—not a certification of byte-identical entire disks. No files were inferred obsolete from their timestamps or deleted. k7 profile/worktrees are absent; R1 records the historical recovery gaps. Existing D: SDK/knowledge references still resolve; they are legacy dependencies, not newly broken paths. The portable relay patch now uses `relay_registry.py`, with reverse applicability verified against K:.

Visible Codex/Traycer/OpenCode processes and worktree target dirt were checked. The separate Command Center chat is active in another project. No competing Sentinel writer was observed; shared Base and other agents' sources were left untouched. Fresh GitHub: #42 and #44 MERGED externally, #43 OPEN. Their branches were not changed here.

## Living mascot correction

FIXED: the original canonical character is now the primary accessible trigger. The separate pill launcher is removed. Exactly one character lives either in its floating position or in the native dialog's sticky header. It remains visible and interactive in the modal top layer. The white/violet conversation surface and directional tail connect to the character. Closing cancels speech and stale thoughts, restores focus and returns to idle. Visibility-off deliberately substitutes a text fallback operating the same guide.

Canonical SVG interior matches the protected pre-correction source exactly: SHA-256 d42630bc894e0c24a6cdf594dd6f9ebb1ffbd65ae690d23718a3638b43d3278b. Body, face, eyes, shards and mark geometry are unchanged. Canonical assets, knoux-sentinel.ts, sentinel-capability.ts and StoreStarfield were not replaced.

- Bounded spring, safe pointer offset, viewport clamping, proximity freeze for clicking and edge return. Existing blink, breathing, shards and semantic reactions remain. Frames stop on settlement; hidden, sleeping, quiet and reduced modes pause motion. Mobile docks a stable 64×80 character, ignores touch-following; expanded character is 72×90 with identical SVG proportions.
- Idle, attentive, thinking, visual speaking, guiding, expanded and quiet phases; sleeping retains the existing closed-eye state. Preparing hint describes deterministic presentation, not model reasoning.
- Catalog-only bilingual route/link/workflow hints: one-second dwell, priority for meaningful route transitions, 30-second per-route cooldown, no repeated page/entry pair, 12-second expiry and suppression after three dismissals. Generation tickets prevent dismissed thoughts reappearing. Sensitive controls and active typing suppress prompting.
- Bubble/panel share the selected published entry and current language. Current-page explanations, local search, public source navigation, visible-section reading and opt-in browser speech remain available.
- Persistent language, sound allowance, tips, reduced animation, quiet and visibility settings plus reset. Quiet preserves the mascot while suppressing prompts/speech. No microphone or autoplay.
- Native modal focus containment, keyboard wrap, close/fallback focus restoration, responsive RTL/LTR and a sticky visible character as the guide scrolls.

This is accurately labeled a deterministic published-site guide, not conversational AI. Actual audible voice quality remains UNTESTED; speech controls use a deterministic browser probe.

New protected pre-correction checkpoint: K:/Knoux Projects/Backups/Sentinel-Living-Correction-20261013-a2621bebea. All 243 source/evidence hashes were independently rechecked with zero failures. Status, patch, tracked dirt, untracked source and ignored QA evidence are included. R1 and earlier checkpoints were not overwritten.

## Public/private boundary and Gateway audit

VERIFIED visitor capability: `published_catalog` only. The GET endpoint projects the existing entity/division registries, rejects query-based tool requests/cross-origin browser reads/declared bodies, bounds URL length, and applies reused per-process limits of 30 caller reads and 300 total reads per minute. These are not distributed or authenticated-person quotas. Anonymous requests cannot choose a provider, tool, URL or command. Audit metadata reports source and zero provider/private-tool calls without transcripts or secrets. There is no AI execution endpoint, private Gateway import or desktop-tool connection.

VERIFIED retained relay fix: ownership is checked before consuming the pending command. Four offline tests pass independently against D: and K:, covering wrong machine, invalid session, replaced-session rejection, replay rejection, atomic single settlement and sensitive-key redaction. K: relay SHA-256: `C4144BEE7D1882A383628CE39BCF3E8D9F7E80AD1740BEEF3D500D5EA6C95443`.

BLOCKED/UNRESOLVED private-runtime findings:

- Cloud Run ingress/IAM reads each exited **1**: no active gcloud account. Authorized service identities and deployed authentication are not verified; no login, IAM change or deployment was attempted.
- Gateway registration lacks an application authentication guard in inspected source and relies on deployment protection. Caller-claimed machine/tool metadata is not proof of owner identity. These trust assumptions must be reviewed before expanding private relay access.
- `sanitize` redacts sensitive keys but can retain secrets embedded in ordinary string values. No claim of complete result sanitation. The Gateway also reads a request body before its final size check when Content-Length is absent.
- Repair Agent remains specialized for Windows. Its MCP filter exposes only `gateway_status`; the three Gateway tools are registered, but the 21 declared Growth tools are not registered by server.py and live provider adapters remain unimplemented.
- Agent knowledge callback rereads local/GCS artifacts before model calls and appends their contents. Live GCS loading, latency/cost, provider availability and ADK health are UNTESTED. Legacy D: SDK/knowledge paths still exist; future relocation requires explicit environment configuration.

Future visitor-agent integration must use a distinct identity, the existing server-side Provider OS/Gemini adapter and a typed PUBLIC_READ allowlist, never the Repair toolset. Require verified model discovery/pricing, distributed session/global quotas, bounded input/output tokens, timeout/cancellation, source-constrained answers and secret-free audit metadata before enabling generation. Use public catalog snapshots rather than injecting private Repair knowledge. [ADK tool filtering](https://github.com/google/adk-docs/blob/main/docs/tools-custom/mcp-tools.md) constrains model-visible tools; [Cloud Run authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service) separately requires service identity and a matching ID-token audience. Neither a client tool filter nor successful offline tests proves deployed authorization.

## Exact scope and evidence

Twenty-one intended files (including this report):

```text
src/app/layout.tsx
src/app/api/sentinel/catalog/route.ts
src/components/identity/KnouxSentinel.tsx
src/components/identity/knoux-sentinel.css
src/components/identity/SentinelGuideLauncher.tsx
src/components/identity/SentinelGuidePanel.tsx
src/components/identity/SentinelGuide.module.css
src/components/identity/sentinel-preferences.ts
src/components/identity/sentinel-motion.ts
src/components/identity/sentinel-presence.ts
src/lib/sentinel/guide.ts
src/lib/sentinel/visible-section.ts
src/lib/sentinel/context.ts
tests/knoux-sentinel.test.mjs
tests/sentinel-guide.test.mjs
e2e/sentinel-guide.spec.ts
e2e/sentinel-capture.mjs
e2e/sentinel-living-capture.mjs
security/sentinel/test_relay_ownership.py
security/sentinel/relay-ownership.patch
docs/sentinel-continuation-20261013.md
```

VERIFIED final exit codes **0**: production build (qa-living-build-delivery.log), TypeScript (qa-living-types-delivery.log), lint (qa-living-lint-delivery.log; zero errors, two counter-ref cleanup warnings), all **775 unit tests** (qa-living-unit-delivery.log), all **30 browser tests** (qa-living-browser-delivery.log; the original 24 plus six new contextual/privacy checks), CSS integrity (qa-living-css-delivery.log: 62 documents, 15 byte-matched HTTP-200 stylesheets, 15 route families), genuine screenshots/budget capture (qa-living-capture-delivery.log) and recorded interaction capture (qa-living-motion-delivery.log). Four offline ownership tests against each Gateway copy exit 0 (qa-living-relay-D.log / qa-living-relay-K.log). No deployed authorization is implied.

Responsive browser checks use 1440×900, 820×1180 and 390×844. They verify one character/starfield, keyboard containment/restoration, quiet/language/visibility persistence, no autoplay/microphone, safe links, no private requests, hidden/private-section filtering, no overflow or page-control blocking, reduced/background motion and stable page geometry. Sampled dialog Axe reports have zero violations. The two lint warnings concern deliberately mutable generation counters used to invalidate late callbacks; they are not reported as a clean zero-warning lint.

Before this correction: qa/sentinel/complete-final-after-1791869885815 contains the genuine rejected disconnected launcher/panel at all three sizes, preserved in the new checkpoint. Earlier migration before evidence remains at qa/sentinel/recovered-before-continuation-1791868919341.

Final home screenshots and budget report: qa/sentinel/living-delivery-after-1791893569860. Desktop startup JavaScript: **1,773,654 bytes / 1,732.08 KiB**; tablet/mobile: **1,650,219 bytes / 1,611.54 KiB**, below the unchanged 1,800 KiB budget. All three report zero overflow/errors and exactly one mascot/starfield.

Full interaction evidence: qa/sentinel/living-motion-1791893435578/report.json, with source root, HEAD, build ID and owned-server provenance. Genuine stages per size: idle, pointer (desktop/tablet), English bubble, connected English/Arabic panel, settings/quiet, Arabic route bubble, returned idle and deliberate published-link hover. Visually reviewed final desktop settled panel, tablet panel/bubble, mobile bubble/panel/quiet and extracted motion frames. The settled desktop snapshot is 1440-expanded-en-settled.png; other filenames use their width and stage, such as 390-expanded-ar.png and 390-settings-quiet.png.

Recorded clips in that directory:

- Desktop: page@8211788752ff107cf9b45f77a0cb0c77.webm
- Tablet: page@c20f63ba6ab7f931f8bffbea16214370.webm
- Mobile: page@4c9280a54f009f4dc15900a26f5c0d46.webm

Unique unpublished supplemental files include these QA directories/logs and the recovery/review manifests; they are not application assets and should not be copied into public/static output. A scoped source patch and hash manifest are retained under qa/continuation/living-owner-review-20261013.

Preserved diagnostic runs caught mobile CSS hiding, source-test assumptions after hook extraction, a route/hover hint timing race and startup before build completion. They are not counted as final passes. Private cloud authorization remains BLOCKED. Actual audible voice quality and comprehensive screen-reader listening remain UNTESTED. Motion was exercised on the actual Intel i5-4570, four logical processors and approximately 12 GB RAM Windows workstation; functional settlement/background/layout checks are not a certified GPU/FPS benchmark.

## Safe integration and next step

Shared K: Base has concurrent repair changes: final observed status was 131 deleted, 6 modified and 3 untracked entries. No files there were edited or built by this isolated correction. Its baseline status is not certified here. The **isolated complete Store checkout** builds successfully; those statuses must not be conflated.

Review the scoped patch and source manifest in `qa/continuation`, then integrate only in a clean worktree based on the verified main SHA (or deliberately reconcile a newer main). Do not apply the patch blindly to shared Base, copy QA snapshots into the website or publish private Python backups. The active worktree's common Git directory still depends on historical D:; migrate that registration separately after preservation/ownership review. No unapproved identity or commit was used.

OWNER_APPROVAL_REQUIRED: approve the shown living mascot experience and explicitly authorize committing the reviewed public Sentinel scope with an approved Git author identity, followed by integration into a clean checkout of verified latest main. No approval is assumed for merging, deployment, copying into dirty K: Base or enabling private Gateway execution. The portable relay patch is preserved audit evidence; both copies already contain the fix, so do not apply it again.

ONE next safe action: owner reviews the final desktop/mobile clips and screenshots and approves the public integration scope and Git identity. Until then, keep all changes uncommitted.

Local preview command, using the existing production build:
Set-Location -LiteralPath 'C:\Users\day night\.codex\worktrees\sentinel-visitor-guide'
npm.cmd run start -- --hostname 127.0.0.1 --port 4552

Open http://127.0.0.1:4552/engineering. If the review server is running, open it instead of launching another process.
