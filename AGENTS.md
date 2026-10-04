## Base44 dev environment

- **Run:** `docker compose -f docker-compose.base44.yml up -d` — starts the Next.js 16 dev server (Turbopack) on port 3000 from the cloned source with live reload.
- **No external credentials required to boot.** Supabase public credentials (URL + publishable key) are hardcoded as defaults in `src/lib/supabase/config.ts`. Optional integrations (contact webhook, EXA, domain registrars) degrade gracefully when unset.
- **Dev-only security header relaxation:** `src/lib/security/headers.ts` opens `frame-ancestors` to `*` and omits `X-Frame-Options` in development so the Base44 preview iframe (a different origin) can embed the app. Production keeps the strict `SAMEORIGIN` policy.
- **allowedDevOrigins:** `next.config.mjs` adds `3000-$BASE44_PUBLIC_HOST_SUFFIX` to `allowedDevOrigins` so Next.js allows the preview origin's dev asset/HMR requests. `BASE44_PUBLIC_HOST_SUFFIX` is passed via compose `environment:`.
- **Node 24** required (`.nvmrc`). The compose uses `node:24` base image with bind-mounted source; `node_modules` and `.next` are anonymous volumes to avoid host/platform conflicts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
