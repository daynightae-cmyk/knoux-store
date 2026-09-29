import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * A production server for the test suite to talk to.
 *
 * Two things are centralised here that used to be duplicated per test file,
 * and both are properties the suite depends on:
 *
 *   - the server is a *production* build (`next start`), not a dev server, so
 *     the assertions are about what a visitor actually receives;
 *   - it runs with the network isolation guard loaded, so a page render
 *     cannot silently depend on a third-party API being up.
 *
 * The guard is passed through `NODE_OPTIONS` rather than imported, because the
 * server is a separate process and the point is that *it* cannot reach the
 * internet either.
 */

const here = dirname(fileURLToPath(import.meta.url));

export const NETWORK_GUARD = join(here, 'isolate-network.mjs');

export function serverEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  // A `file://` URL, not a path: on Windows an absolute path is parsed as a
  // URL with a `d:` scheme and the preload silently refuses to load.
  const preload = `--import ${pathToFileURL(NETWORK_GUARD).href}`;
  env.NODE_OPTIONS = env.NODE_OPTIONS ? `${env.NODE_OPTIONS} ${preload}` : preload;
  return env;
}

export function startServer({ port, env = {} }) {
  const child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'],
    { env: serverEnv(env), stdio: 'ignore', cwd: join(here, '..') },
  );
  return child;
}

export async function waitForServer(child, origin, { attempts = 200, delayMs = 150 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Production server exited with ${child.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      /* still starting */
    }
    await new Promise((done) => setTimeout(done, delayMs));
  }
  throw new Error('Production server did not start in time');
}

/** Strips markup so an assertion is about the sentence a visitor reads. */
export function visibleText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
