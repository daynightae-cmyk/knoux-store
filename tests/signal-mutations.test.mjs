import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@/lib/supabase/server') return { url: 'data:text/javascript,' + encodeURIComponent('export async function createClient(){return globalThis.__signalClient}'), shortCircuit: true };
  return next(specifier, context);
} });
const claim = await import('../src/app/api/signal/claim/route.ts');
const report = await import('../src/app/api/signal/report/route.ts');
const phone = '+971501234567';
let calls;
function setup({ user = { id: 'test-user' }, authError = null, data = { id: 'receipt' }, error = null, throws = false } = {}) {
  calls = [];
  globalThis.__signalClient = { auth: { getUser: async () => ({ data: { user }, error: authError }) }, rpc: async (name, args) => { calls.push({ name, args }); if (throws) throw new Error('transport'); return { data, error }; } };
}
const request = (body, origin = 'https://example.test') => new Request('https://example.test/api/signal/claim', { method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.19' }, body: JSON.stringify(body) });

test('Signal authenticated writes refuse cross-site, malformed shape and invalid numbers before I/O', async () => {
  setup();
  for (const route of [claim, report]) {
    assert.equal((await route.POST(request({ query: phone }, 'https://other.test'))).status, 403);
    for (const body of [null, [], 'text']) assert.equal((await route.POST(request(body))).status, 400);
    assert.equal((await route.POST(request({ query: 'invalid', category: 'spam' }))).status, 422);
  }
  assert.equal(calls.length, 0);
});

test('Signal writes require a verified session and preserve claim verification conflicts', async () => {
  setup({ user: null });
  assert.equal((await claim.POST(request({ query: phone }))).status, 401);
  assert.equal((await report.POST(request({ query: phone, category: 'spam' }))).status, 401);
  assert.equal(calls.length, 0);
  setup({ error: { message: 'verified_phone_required' } });
  const response = await claim.POST(request({ query: phone }));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /Verify this number/);
});

test('Signal RPC receipts are required for success; outages are retryable failures', async () => {
  setup();
  const response = await claim.POST(request({ query: phone, country: 'AE' }));
  assert.equal(response.status, 200); assert.equal((await response.json()).ok, true);
  assert.equal(calls[0].name, 'signal_claim_number'); assert.equal(calls[0].args.p_phone, phone);
  for (const setupInput of [{ data: null }, { throws: true }, { error: { message: 'database unavailable' } }]) {
    setup(setupInput);
    assert.equal((await claim.POST(request({ query: phone }))).status, 503);
  }
});

test('Signal report sends only normalized categorized evidence and never confirms a missing receipt', async () => {
  setup();
  const response = await report.POST(request({ query: phone, country: 'AE', category: 'spam' }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].name, 'signal_report_reputation'); assert.equal(calls[0].args.p_category, 'spam');
  setup({ data: null });
  assert.equal((await report.POST(request({ query: phone, category: 'spam' }))).status, 503);
});
