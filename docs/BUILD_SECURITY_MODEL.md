# KNOuX build security model

This document states who may see and do what in `/build`, and where each
decision is enforced in code. It exists because the boundary was previously
implicit: the policy lived inside whichever route handler happened to need it,
so two routes could disagree and nothing recorded that they had.

Every claim here is checkable against a specific file. Where the code and this
document disagree, the code is the truth and this document is the defect.

---

## The four boundaries

| Boundary      | Who                                             | Enforced by |
| ------------- | ----------------------------------------------- | ----------- |
| **PUBLIC**    | Anyone, including a `curl` with no cookies      | Route layout and `src/lib/security/headers.ts` |
| **AUTHENTICATED** | A user with a server-verified Supabase session | `src/lib/build/api-guard.ts` |
| **LOCAL BRIDGE** | A paired machine on the developer's own desk   | Not implemented; stated as absent |
| **SERVER**    | Server-side code only, never a client component | `src/lib/build/project-adapter.ts`, `src/lib/supabase/server.ts` |

The order matters. A caller is only ever evaluated top-down, and a refusal at a
higher boundary is never re-litigated at a lower one.

---

## PUBLIC

Anonymous visitors may read:

- Every marketing and editorial route: `/`, `/about`, `/creative`,
  `/engineering`, `/growth`, `/labs`, `/products`, `/solutions`, `/web`,
  `/wordpress/*`, `/work`, and their `[slug]` detail pages.
- `/contact` — the form, and `POST /api/contact` with the intake protections
  described below.
- `POST /auth/*` — Supabase sign-in, registration, password reset.
- `GET /api/wp-image?u=…` — the WordPress image proxy, under the allowlist and
  content-type policy in `src/lib/wordpress/asset-policy.ts`.
- Static assets under `/_next/static`.

Anonymous visitors may **not** read:

- Any `/api/build/*` route, in any deployment reachable over the internet. See
  AUTHENTICATED below.
- The filesystem, Git metadata, project inventory, or environment-variable
  presence of the running deployment.

Two things are deliberately public and should stay that way:

- **The 3D and canvas surfaces.** A WebGL context requires no credential and is
  not a secret. Every canvas on this site is decorative or duplicative of text
  already in the document; `accessibility.spec.ts` asserts that the essential
  state is present as text, not only on the canvas.
- **The fact that the site exists.** There is no route whose 404 vs 200
  distinction reveals deployment configuration.

### Response headers

`src/lib/security/headers.ts` builds and emits:

`Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
`X-DNS-Prefetch-Control`, `Cross-Origin-Opener-Policy`,
`Cross-Origin-Resource-Policy`, and `Strict-Transport-Security` outside
development when a canonical origin is known. `poweredByHeader` is disabled in
`next.config.mjs`.

The CSP is built from observed resource usage, not from a generic template.
`'unsafe-inline'` is present in `script-src` and that is a stated trade: the
strict alternative is a per-request nonce, which can only be attached during a
request, which would make every page dynamic and cost this site its static
generation and CDN caching. See the file's header comment for the full
reasoning. A green header check is a restriction policy, not proof of XSS
immunity.

---

## AUTHENTICATED

A caller is authenticated when `supabase.auth.getUser()` returns a user **on the
server**. The check is server-side and runs before any adapter is constructed.

| Route                       | Returns |
| --------------------------- | ------- |
| `GET /api/build/project`    | File inventory, framework, package manager, project graph |
| `GET /api/build/file?path=` | Contents of one repository-relative file |
| `GET /api/build/git`        | Branch, HEAD SHA, remotes, recent commits, changed files |
| `GET /api/build/environment`| **Presence only** of each environment variable |
| `GET /api/build/providers`  | Provider configuration state |
| `GET/POST /api/build/verify`| Allowlisted runner status, and execution when enabled |

Three properties are worth stating precisely, because each was a finding:

1. **The environment is derived once.** `resolveDeploymentEnvironment` in
   `src/lib/build/deployment.ts` is the only place an environment name is
   decided, from `KNOUX_BUILD_ENVIRONMENT` → `VERCEL_ENV` → `NODE_ENV` →
   `local`. It is never read from a request body, query parameter or header, so
   a caller cannot ask "is this local mode?" and get an answer that changes what
   the adapter does. `src/lib/build/adapter-factory.ts` is the only construction
   site for the adapter.

2. **Variable *presence* is not variable *value*.** `/api/build/environment`
   returns a boolean and a purpose string. No value is returned, no value is
   truncated-and-returned, and a `NEXT_PUBLIC_` variable is labelled `public` to
   make explicit that its presence discloses nothing. Entries whose existence is
   itself sensitive are marked `sensitive` in the route's `SIGNALS` table.

3. **File reads are contained.** `src/app/api/build/file/route.ts` rejects
   absolute paths, drive letters, NUL bytes, and any `..` segment before
   touching the disk.

Refusals are uniform: `401` with `cache-control: no-store` and a body of
`{ error, message, scope, authenticated: false }`. There is one refusal shape
for both "no session" and "the identity provider could not confirm one", because
returning two different bodies for one condition turns the response into a
signal about the server's internals.

A `local` deployment is the documented exception: a developer reading their own
checkout is anonymous by design, and requiring a sign-in there would break local
work for nothing. `KNOUX_BUILD_PUBLIC=1` is the single exact opt-out for a
deliberately anonymous demo. A **preview** deployment is *not* exempt: preview
URLs are reachable by anyone holding the link, and "only a few people have it" is
a property of distribution, not of access control.

### The verification runner

`POST /api/build/verify` requires three independent conditions:

1. a verified session (the boundary above);
2. `KNOUX_BUILD_ALLOW_VERIFY=1` on the deployment;
3. a task name from a four-item allowlist: `lint`, `typecheck`, `test`, `build`.

There is no path from the request body to `spawn`. The body selects a *name*; the
name maps to a package script the adapter builds the argument vector for. The
adapter also refuses to start a second run while one is active, so a permitted
caller still cannot fan the host out with concurrent builds.

---

## LOCAL BRIDGE

**Not implemented. This is the honest state, and the interface says so.**

A local bridge would be a paired process on a developer's own machine that the
hosted workspace could reach. The following workspace surfaces depend on one and
are therefore unconnected in every current deployment:

- `/build/powershell` — shell bridge unavailable. The hosted site cannot execute
  PowerShell. No session, no output, no prompt is shown.
- `/build/terminal` — no interactive terminal.
- Runtime process management — the deployment *is* the runtime; it cannot
  supervise processes, and the workspace says exactly that rather than showing a
  pid.

`KnouxBuildWorkspace` reports the runtime as `status: 'running'`,
`pid: null`, `blocker: 'This deployment is itself the runtime. It cannot
supervise processes.'` A configured bridge URL would not change this: a URL that
resolves is not a paired machine, and the interface distinguishes the two.

Adding a bridge would change the security model, not just the product. A local
bridge is an execution surface reachable from the internet, and it would need
pairing, mutual authentication, and an explicit approval step. None of that
exists, so nothing in the product pretends it does.

---

## SERVER

Only server-side code may read these, and none of them are ever serialised to a
client component:

| Value | Used by | Never leaves |
| ----- | ------- | ------------ |
| `SUPABASE_SERVICE_ROLE_KEY` | server client only | the server |
| Provider API keys | server-side calls only | the server |
| `DATABASE_URL` | server-side connections | the server |
| Contact webhook URL | `POST /api/contact` forwarding | the server |
| `process.env` generally | `resolveDeploymentEnvironment` | the server |

The workspace adapter (`src/lib/build/project-adapter.ts`) is read-only *by
construction*: there is no `writeFile`, no `deleteFile` and no arbitrary command
execution anywhere in the file, so `capabilities()` reporting `false` is not a
policy that could later be bypassed — the code to bypass it does not exist. Git
reads use `spawn` with a fixed argument array and never a shell string.

The permission engine (`src/lib/build/permissions.ts`) is pure and takes only
the proposed action, so a caller cannot obtain approval by constructing a
different object than the one it displays. A control in the UI is not a security
boundary; the decision is reproducible on the server from the action itself.

### Abuse protection on the one public POST

`POST /api/contact` is the only public write surface. It is protected by, in
order of cost to a legitimate caller:

1. **Origin** — a cross-site `Origin`, or a `Sec-Fetch-Site` that says the
   request came from elsewhere, is refused before the body is read. The
   comparison is against the *public* origin derived from forwarded headers
   (`publicOrigin` in the route), not `request.url`, which behind a proxy is the
   internal origin and would refuse every legitimate submission.
2. **Size** — a declared length above the ceiling is refused before a byte is
   read, and the cap is enforced again on the bytes that actually arrive, so a
   client that under-reports `content-length` is still bounded.
3. **Rate** — a per-address ceiling.
4. **Honeypot** — retained; a bot submission is accepted silently so it does not
   learn the rule.

No CAPTCHA and no third-party bot service is introduced. Both would be a new
external dependency, a new failure mode and a new privacy surface. If abuse is
observed, the extension point is a documented opt-in token check.

Delivery requires `CONTACT_WEBHOOK_URL`. Without it the endpoint returns `503`
and `delivered: false`. It never claims a message was received.

---

## What is deliberately not protected

Stated so that the absence is a decision rather than an oversight:

- **Content.** The site's copy, structure and visual system are public. There is
  no premium tier and no gated content.
- **3D surfaces.** No credential is required to render a canvas.
- **Search and the command palette.** They query public content.
- **`/build` page shells.** The routes render for anonymous visitors so the
  workspace can *say* it is locked. Hiding the route in the browser would be
  client-side security; the data behind it is what the boundary protects, and
  that boundary is server-side.

---

## Verification

Each boundary above is asserted by an executable test, not by this document:

| Claim | Test |
| ----- | ---- |
| `/api/build/*` refuses anonymous callers | `tests/security-boundary.test.mjs`, `e2e/api-boundary.spec.ts` |
| The environment cannot be spoofed from a request | `tests/security-boundary.test.mjs` |
| OAuth cannot redirect off-origin | `tests/security-redirect.test.mjs` |
| Contact intake refuses cross-site, oversized and flooded requests | `e2e/api-boundary.spec.ts`, `tests/security-boundary.test.mjs` |
| The image proxy refuses non-allowlisted hosts, SVG, and oversized bodies | `tests/asset-policy.test.mjs`, `e2e/api-boundary.spec.ts` |
| Response headers are present and the policy is built from real usage | `tests/security-boundary.test.mjs` |

Run the whole set with `npm test`. The browser-verified set is
`npm run test:e2e`.
