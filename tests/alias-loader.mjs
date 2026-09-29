/**
 * Resolves the repository's `@/…` import alias for the Node test runner.
 *
 * Next.js reads the alias from tsconfig.json; `node --test` does not. Without
 * this hook, any test that imports a module which itself imports `@/…` — every
 * API route does — fails with "Cannot find package '@/lib'" before a single
 * assertion runs. The hook maps the alias onto `src/` and performs the
 * extension resolution ESM would otherwise do, so a route can be loaded and
 * executed exactly as the application loads it.
 *
 * Registered via `--import ./tests/register-loader.mjs`; see package.json.
 */

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) return nextResolve(specifier, context);

  const base = join(SRC, specifier.slice(2));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, join(base, 'index.ts')];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  // Let Node produce the standard "cannot find module" error for a typo,
  // rather than a resolver-specific one.
  return nextResolve(specifier, context);
}
