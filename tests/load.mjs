import { register } from 'node:module';

/**
 * Test-side module loading.
 *
 * `loadTypeScript` imports an application module by path so the test executes
 * the shipped code rather than a copy of it. The resolver hook registered here
 * is what lets a test reach inside a module's own imports; see
 * `ts-resolve.mjs` for why it is a test concern rather than a source one.
 *
 * The hook is registered once per process. Registering it repeatedly is
 * harmless but pointless, and the guard keeps the registration visible at the
 * top of a test file rather than buried in a shared import.
 */
let registered = false;

function ensureResolver() {
  if (registered) return;
  registered = true;
  register('./ts-resolve.mjs', import.meta.url);
}

export async function loadTypeScript(specifier) {
  ensureResolver();
  return import(specifier);
}

/** Registers the resolver without importing anything, for files that use `import` directly. */
export function enableTypeScriptResolution() {
  ensureResolver();
}
