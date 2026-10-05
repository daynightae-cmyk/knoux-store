# Growth Phase 2 source recovery

The convergence rescan observed a live donor advancing from `ac27852f2460f323cecb89946d113c91d162924f` to `cba5710a17d65dd52f57bc5bfc0d13894e95fef0` and `1fcbfa4823a00e26aeb48144b94f1402da090c3b`. Its subsequent three modified files and two new test files are preserved in `references/growth/source-recovery/`. The original commit objects also have recovery refs and belong in the refreshed full recovery bundle. The external Agent and MCP Gateway repositories were not modified by this convergence operation.

## Accepted behavior

The donor's budget-permission correction is integrated: DESIGNER and CONTENT_CREATOR cannot view or edit budgets. A behavioral test also verifies their allowed creative access and refusal for an unassigned client. The existing public console contains explicitly labeled fixtures and provisional reasoning; configured agent credentials remain guarded by authenticated operator identity, origin validation, bounded bodies and connector refusal tests.

## Superseded execution paths, preserved source

Complete binary-capable Git patches retain both committed batches. The working fixes and both behavioral test drafts are retained separately. They are reviewable source, not executable migrations or a second request boundary.

* `src/middleware.ts` conflicts with the accepted root `proxy.ts`; installed Next.js documentation deprecates middleware in favor of proxy. The donor description that session refresh was never called contradicts the existing proxy's call to `updateSession`. Its unconditional new guards also depend on membership tables that have not been deployed and would replace the verified demo with denials.
* Principal resolution selects the most privileged role across memberships. Existing `canAccessClient` grants OWNER/MANAGER access to every client. This makes a role granted on one client authoritative on another; the resolver comment promises per-client roles but the returned principal contains no such mapping. Enabling this draft would introduce an authorization boundary that has not been proven.
* The proposed migrations use `for all` membership-only policies and authenticated SELECT/INSERT/UPDATE/DELETE grants for business tables. A VIEWER or CLIENT membership therefore authorizes direct database writes, independently of the TypeScript permission model. The v2 creative/content policies have the same issue. These drafts are retained outside `supabase/migrations` and have not been applied remotely.
* Repository selection is not connected to the recovered screen data paths. A default Supabase selection does not establish that existing fixture pages use stored data. The draft fixture selector returns before checking an empty client allowlist; its record methods do not impose a principal boundary. These are architectural references, not verified production storage.
* OAuth state verification accepts a caller-provided consumed flag; no atomic state store or callback route makes single-use/session binding true. Token exchanges permit an absent secret store, return a successful `unmanaged://` hash reference, and discard the token. That outcome cannot be reported as a persisted connection. Neither provider exchange nor a running MCP registration was exercised by convergence.

The safer accepted runtime supersedes these execution paths. Their schema, interfaces and handshake work remain fully recoverable in the canonical reference tree and bundle. A future implementation must demonstrate per-client role isolation, database write-role enforcement, atomic session-bound state consumption and a required durable secret store before activating these paths.

## Cleanup condition

The observed donor was actively changing during scans g/h/i. No cleanup may classify it as stable or remove it until its latest HEAD, tracked changes and untracked source have been rechecked and the active writer has stopped. The final private dossier records the actual stability and cleanup outcome.
