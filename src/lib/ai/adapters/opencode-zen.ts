/**
 * Historical OpenCode Zen identity constants — not a Console V2 adapter.
 * Current Console V2 implementation is opencode-console-v2.ts, registered under
 * opencode-console-v2 with OPENCODE_CONSOLE_TOKEN. These legacy values remain
 * preserved for recovery; no legacy Zen runtime is registered or verified.
 *
 * Status: PARTIAL / UNTESTED — identity constants only. No live verification
 * claimed. No key accessed, logged, or transmitted. See acceptance gates.
 *
 * Ground truth (to be re-verified against official docs before wiring):
 * - Installed `opencode-go` adapter uses `https://api.opencode.dev/v1` with
 *   `OPENCODE_GO_API_KEY`. That binding is PRESERVED untouched.
 * - Zen Console V2 key MUST NEVER route to the Go endpoint. Zen uses its own
 *   env var `OPENCODE_ZEN_API_KEY` and its own base URL below.
 * - Task-brief URLs (`/zen/v1/models`, `/zen/go/v1/models`) are UNVERIFIED
 *   against official docs and are NOT used here. Official Zen inference base
 *   observed: `https://opencode.ai/inference/v1/` with model-specific
 *   transports (`/responses` for GPT-family, `/messages` for Claude-family).
 *   Catalog endpoint + auth scheme remain BLOCKED until verified by an
 *   authorized runtime probe — never by a mock.
 *
 * Next step (same task): implement `OpenCodeZenAdapter` against
 * `src/lib/ai/contract.ts` + `adapters/base.ts`, register `opencode-zen`
 * alongside (not over) `opencode-go` in `registry.ts`, add brand + QA
 * distinction. Saved Zen key must never mark Go connected and vice versa.
 */

export const OPENCODE_ZEN_ID = 'opencode-zen' as const;
export const OPENCODE_GO_ID = 'opencode-go' as const;

/** Zen-only credential env var. Distinct from Go on purpose. */
export const OPENCODE_ZEN_ENV = 'OPENCODE_ZEN_API_KEY' as const;
/** Go credential env var (existing binding — do not reuse for Zen). */
export const OPENCODE_GO_ENV = 'OPENCODE_GO_API_KEY' as const;

/**
 * Zen inference base (official docs). Model discovery path is intentionally
 * NOT hardcoded here until the catalog endpoint is verified by an authorized
 * probe. Any unverified operation stays BLOCKED / UNTESTED.
 */
export const OPENCODE_ZEN_BASE_URL = 'https://opencode.ai/inference/v1' as const;

/** Existing Go base (preserved, never used for Zen keys). */
export const OPENCODE_GO_BASE_URL = 'https://api.opencode.dev/v1' as const;

export const OPENCODE_ZEN_STATUS = {
  identity: 'PARTIAL' as const,
  auth: 'UNTESTED' as const,
  discovery: 'UNTESTED' as const,
  inference: 'BLOCKED' as const,
  note: 'No live provider call made. Verification requires owner-authorized runtime probe.',
} as const;
