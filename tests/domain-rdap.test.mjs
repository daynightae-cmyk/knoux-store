import test from 'node:test';
import assert from 'node:assert/strict';
import { enableTypeScriptResolution } from './load.mjs';
enableTypeScriptResolution();
const { checkRegistration } = await import('../src/lib/domain/rdap.ts');
const registry = { services: [[['com'], ['https://rdap.example.test/']]] };
function fixture(reply) {
  return async url => url === 'https://data.iana.org/rdap/dns.json' ? Response.json(registry) : reply(url);
}
test('RDAP uses IANA routing, validates identity, and never offers purchase or prices', async () => {
  const rows = await checkRegistration(['example.com', 'missing.com', 'example.ae'], fixture(url => {
    if (url.endsWith('missing.com')) return Response.json({ errorCode: 404 }, { status: 404 });
    assert.equal(url, 'https://rdap.example.test/domain/example.com');
    return Response.json({ objectClassName: 'domain', ldhName: 'EXAMPLE.COM' });
  }));
  assert.deepEqual(rows.map(row => row.state), ['registered', 'no-record', 'unsupported']);
  for (const row of rows) { assert.equal(row.registration, null); assert.equal(row.renewal, null); assert.equal(row.premium, false); }
});
test('timeouts, malformed responses, mismatched identities, rate limits and HTML 404s are not no-record results', async () => {
  for (const reply of [
    () => { throw new Error('timeout'); },
    () => Response.json({ errorCode: 429 }, { status: 429 }),
    () => new Response('not found', { status: 404 }),
    () => Response.json({}, { status: 404 }),
    () => Response.json({ objectClassName: 'domain', ldhName: 'other.com' }),
    () => Response.json({}),
  ]) assert.equal((await checkRegistration(['example.com'], fixture(reply)))[0].state, 'error');
  const failed = await checkRegistration(['example.com'], async () => { throw new Error('IANA unavailable'); });
  assert.equal(failed[0].state, 'error');
});
