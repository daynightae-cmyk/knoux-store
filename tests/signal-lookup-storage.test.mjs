/**
 * Signal lookup: what the endpoint says about its own storage.
 *
 * The confirmed production defect was a request that was rejected before it
 * ever reached storage answering `storage.available: true` — a claim about a
 * service the request had not touched. The contract now distinguishes a
 * storage that answered, a storage that failed, and a storage that was never
 * consulted, and the endpoint may not claim the first for the third.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTypeScript } from './load.mjs';

const { POST } = await loadTypeScript('../src/app/api/signal/lookup/route.ts');

function lookup(body, headers = {}) {
  return POST(
    new Request('https://knoux.store/api/signal/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );
}

test('a rejected number reports that storage was never consulted', async () => {
  const response = await lookup({ query: 'not-a-phone', country: 'AE' });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.storage.status, 'not_consulted');
  assert.equal(body.storage.available, undefined);
  assert.ok(body.storage.reason.length > 0);
});

test('an oversized request reports that storage was never consulted', async () => {
  const response = await lookup(
    { query: 'x'.repeat(4000) },
    { 'content-length': String(4000) },
  );
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.equal(body.storage.status, 'not_consulted');
  assert.equal(body.storage.available, undefined);
});

test('the endpoint cannot claim a storage result it never measured', () => {
  const source = readFileSync(
    new URL('../src/app/api/signal/lookup/route.ts', import.meta.url),
    'utf8',
  );
  assert.ok(
    !/storage:\s*\{\s*available/.test(source),
    'the lookup route must not report a boolean availability it did not measure',
  );
  const types = readFileSync(new URL('../src/lib/signal/types.ts', import.meta.url), 'utf8');
  assert.ok(
    /status:\s*'available'\s*\|\s*'unavailable'\s*\|\s*'not_consulted'/.test(types),
    'the storage status must be a three-way answer, not a boolean',
  );
});

test('the client renders the storage state it is told, without inventing one', () => {
  const source = readFileSync(
    new URL('../src/components/signal/SignalLookupClient.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(!/result\.storage\.available/.test(source));
  assert.ok(/result\.storage\.status === 'not_consulted'/.test(source));
});
