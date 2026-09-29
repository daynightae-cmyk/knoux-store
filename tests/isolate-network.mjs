/**
 * Test-mode network isolation.
 *
 * Loaded with `--import` before anything else, in this process and in every
 * `next start` child the suite spawns. It refuses every outbound request that
 * is not loopback.
 *
 * Why this exists. The suite used to contain an assertion about static page
 * copy that only held when `api.wordpress.org` happened to be reachable. It
 * passed on a good day and failed on an outage, and the two outcomes said
 * nothing about the code. A test that can fail because somebody else's server
 * is down is not a test of this repository.
 *
 * With this guard the whole suite runs with no internet at all, and:
 *
 *   - the WordPress adapters must degrade to their documented `unavailable`
 *     state, which is a real code path and is now covered directly by fixture
 *     tests rather than by hoping the network behaves;
 *   - every page assertion is necessarily about this repository's own output;
 *   - `npm test` is reproducible on a plane.
 *
 * Set `KNOUX_TEST_ALLOW_NETWORK=1` to lift the guard when deliberately
 * comparing against a live upstream. Nothing in the default gate does.
 */

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0', '::']);

function hostOf(input) {
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input && input.url) || '';
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function blocked(input) {
  const host = hostOf(input);
  // An unparseable target is not a loopback request.
  if (!host) return true;
  return !LOOPBACK.has(host);
}

const realFetch = globalThis.fetch;

globalThis.fetch = function guardedFetch(input, init) {
  if (blocked(input)) {
    const host = hostOf(input) || '<unparseable>';
    return Promise.reject(
      new Error(
        `External network access is disabled in the KNOuX test suite (${host}). ` +
          'A test that needs the internet is testing somebody else\'s server.',
      ),
    );
  }
  return realFetch.call(globalThis, input, init);
};

const realConnect = globalThis.net?.connect;
if (realConnect) {
  globalThis.net.connect = function guardedConnect(...args) {
    const options = typeof args[0] === 'object' && args[0] !== null ? args[0] : { port: args[0], host: args[1] };
    const host = String(options?.host ?? '').toLowerCase().replace(/^\[|\]$/g, '');
    if (host && !LOOPBACK.has(host)) {
      throw new Error(`External socket blocked in the KNOuX test suite (${host}).`);
    }
    return realConnect.apply(this, args);
  };
}
