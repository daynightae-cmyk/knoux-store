import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const { publicRequestOrigin, checkRequestOrigin } = await loadTypeScript('../src/lib/contact/intake-guard.ts');

test('proxy-rewritten internal origin cannot refuse the legitimate browser origin', () => {
  for (const [host, proto] of [['127.0.0.1:3313', 'http'], ['knoux.store', 'https']]) {
    const request = new Request('http://localhost:3000/api/build/ai/prepare', { headers: { 'x-forwarded-host': host, 'x-forwarded-proto': proto, origin: `${proto}://${host}`, 'sec-fetch-site': 'same-origin' } });
    assert.equal(checkRequestOrigin(request.headers, new URL(request.url).origin).ok, false);
    assert.equal(checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok, true);
  }
});

test('proxy-aware browser boundary still refuses cross-site requests and malformed forwarded hosts', () => {
  const request = new Request('http://localhost:3000/api', { headers: { host: 'knoux.store', origin: 'https://evil.test', 'sec-fetch-site': 'cross-site' } });
  assert.equal(checkRequestOrigin(request.headers, publicRequestOrigin(request)).ok, false);
  for (const host of ['evil.test@knoux.store', 'knoux.store/path', 'knoux.store,evil.test']) {
    assert.equal(publicRequestOrigin(new Request('http://localhost:3000/api', { headers: { 'x-forwarded-host': host } })), 'http://localhost:3000');
  }
});
