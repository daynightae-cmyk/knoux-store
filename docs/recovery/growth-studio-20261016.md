# Growth studio recovery

Baseline: GitHub main `77a78bccf3f8623988e53d1f98506b98384c1877`.

Source: PR #46 commit `27bc130bb528cc4a509938df89b289b017f6c996`, the exact feature delta from PR #45 commit `c4ea76686871981ce5ad5de33b0ab8221c2e49e8`. Existing PR heads and their stack are unchanged. The Growth delta applies independently to current main; the broader Sentinel/provider branch is not required to run these workflows. The original historical handoff's QA claims were not imported.

Recovered behavior:

- Shared client-scoped creative revisions across Creative Studio, Campaigns and Social, with eight distinct placement previews, source comparison, copy/asset controls, zoom and expanded preview.
- Campaign brief editing and local review fingerprints that invalidate after plan or creative changes. Approval and launch remain unavailable without authorized durable boundaries.
- Editorial board with source-aware status and explicit staging into a linked creative. No posts are published or messages sent.
- Public Growth service flow with Arabic/English choice, honest demo preview, form validation, exact request review and delivery status from the existing contact endpoint.
- Top-layer native mobile navigation dialog, keyboard containment, Escape and backdrop dismissal, restored focus, scroll locking, resize cleanup and safe-area spacing. Arabic command chrome has language and direction attributes.

The port retains main's data loading, client ownership, connection evidence and campaign execution boundaries. Stored connections do not become LIVE merely because a client has persisted records. Local creative edits clear approval and refuse stale or cross-client changes. Approved asset references remain references until a real media resolver is configured.

Additional repairs beyond #46: body scroll locking and desktop-resize cleanup for the drawer, safe-area padding, `lang` on command UI, regression selectors for desktop versus mobile navigation, and an outbound network guard on the dedicated fixture QA server. Fixture selection is explicit and the browser tests cannot reach an external intake transport.

Validation: full ESLint, production build, TypeScript, 776 unit/integration tests, CSS integrity and five dedicated Chromium scenarios covering shared edits, review invalidation, client isolation, mobile keyboard behavior, Arabic/English, 360/390/768/1024/1440/1920px geometry, axe and honest unavailable delivery. Existing Command Center regression results are recorded with the execution evidence. Full repository Playwright and live provider validation remain separate acceptance work.

Rollback: revert this commit; no migration or production deployment is needed. Existing main campaign logic and original recovery sources remain available in Git and local snapshots.

Existing Command Center regression: 9/9 production Chromium tests PASS across desktop/tablet/mobile, including all 14 command routes with axe, intelligence request boundaries, client selection and report printing. CSS integrity PASS: 62 emitted documents, 16 byte-matched HTTP 200 stylesheets, 15 route families.
