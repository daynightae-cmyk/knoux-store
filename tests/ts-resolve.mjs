/**
 * A resolver hook for loading application TypeScript from the test runner.
 *
 * Node's ESM resolver requires a file extension. The application source does
 * not use them, because it is bundled by Turbopack with `moduleResolution:
 * "bundler"` and the whole codebase is written extensionless. So when a test
 * imports `src/lib/.../deployment.ts` directly in order to *execute* the
 * policy rather than read it, its own relative imports fail to resolve.
 *
 * This hook is the seam. It lives in the test harness only: no application
 * source is changed, no bundler behaviour is altered, and the tests are
 * exercising exactly the modules that ship.
 *
 * The alternative — adding `.ts` to every import and enabling
 * `allowImportingTsExtensions` — would put an unusual style and a compiler flag
 * into production source to serve a test concern.
 */

import { existsSync } from 'node:fs';
import { dirname, join as joinPath, resolve as resolvePath } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');

const SUFFIXES = ['', '.ts', '.tsx', '.mts', '/index.ts', '/index.tsx'];

/** `@/lib/foo` means `src/lib/foo`. */
const ALIAS_PREFIX = '@/';

/**
 * The `server-only` marker's no-op half.
 *
 * Resolved by path rather than by specifier, because the package's `exports` map
 * deliberately exposes only `.` — the two halves are selected by condition, not
 * by subpath. The main entry is located to find the package directory, and the
 * sibling `empty.js` is pointed at directly.
 */
const SERVER_ONLY_EMPTY = (() => {
  const require = createRequire(import.meta.url);
  const entry = dirname(require.resolve('server-only'));
  return pathToFileURL(joinPath(entry, 'empty.js')).href;
})();

export async function resolve(specifier, context, nextResolve) {
  // Next's package exposes server.js to Node ESM; application source uses the
  // bundler-friendly next/server spelling. Exercise the real guard in tests.
  if (specifier === 'next/server') return nextResolve('next/server.js', context);
  // `server-only` is a marker package, not a runtime dependency. It throws on
  // import unless the bundler resolved it under the `react-server` export
  // condition, which Next.js sets and a bare test runner does not.
  //
  // Without this, any test that executes a server-only module — the registrar
  // adapters, for one — dies on the marker's own error before reaching a single
  // assertion, and the only way to "fix" it would be to delete the marker from
  // production source. That would remove the guard that stops a credential
  // being imported into a client bundle, which is the one thing the marker is
  // for.
  //
  // So the marker's no-op half is selected here, which is exactly what a server
  // context does. The security property itself is asserted structurally, by a
  // test that reads the source.
  if (specifier === 'server-only') return { url: SERVER_ONLY_EMPTY, shortCircuit: true };
  try {
    return await nextResolve(specifier, context);
  } catch (cause) {
    if (specifier.startsWith('node:') || specifier.includes('node_modules')) throw cause;

    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : ROOT;
    const base = specifier.startsWith(ALIAS_PREFIX)
      ? resolvePath(ROOT, 'src', specifier.slice(ALIAS_PREFIX.length))
      : resolvePath(dirname(parentPath), specifier);

    for (const suffix of SUFFIXES) {
      const candidate = base + suffix;
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    throw cause;
  }
}
