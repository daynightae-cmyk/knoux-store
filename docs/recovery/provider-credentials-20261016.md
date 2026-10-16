# Provider credential recovery

Baseline: current GitHub main `77a78bccf3f8623988e53d1f98506b98384c1877`.

Source: selected provider credential-flow and connection-label improvements from PR #45 commit `c4ea76686871981ce5ad5de33b0ab8221c2e49e8`, `src/components/build/providers/ProviderCenter.tsx` and `src/lib/ai/provider-os/connection-label.ts`. These improvements are applied to current main without importing unrelated companion, locale, new provider transport or historical QA code.

Changes:

- A synchronous in-flight ref guards commands before React commits the busy state. Duplicate form submissions cannot send duplicate credential writes.
- A successful credential save clears the password field. A failed save keeps the unsaved value in component state only, so a transient failure does not destroy the operator's input. Unrelated operations no longer clear it.
- Provider selection and successful workspace changes clear the credential draft and its edit/rotation metadata. No secret enters local/session storage or display text.
- Connection labels distinguish unconfigured, saved/untested, disabled, failed, blocked, budget and verified connection evidence. Compared with the source label, blocked/unavailable/unconfigured facts now override retained authentication/discovery success. Generation and streaming remain independent facts.

Verification executes the real label implementation, Provider OS runtime/tenancy/encryption tests and SQL policy tests. Production browser contracts simulate a refused save and synchronous double submission, verify one write, preserve the unsaved field, check storage/display non-disclosure, and confirm clearing across provider switches. Existing Provider OS tests cover successful replacement and invalidated connection facts. Browser fixtures are explicitly marked and establish UI contracts only; no real credential or provider is exercised.

No adapter endpoint, production SQL, server authority or billing behavior is changed. Revert this commit independently to roll back.

PASS: full ESLint, TypeScript, production build, 772 unit/integration tests, 20 focused provider/SQL/tenancy/encryption checks, CSS integrity (62 documents, 16 byte-matched stylesheets, 15 route families), and 3 new production Chromium contracts across desktop/tablet/mobile. The existing exact-viewport Provider OS regression is tracked separately in the execution report. The initial mobile contract locator was corrected to open the visible provider summary rather than query a hidden navigation role.
