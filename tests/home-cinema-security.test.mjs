import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentSecurityPolicy, buildSecurityHeaders } from '../src/lib/security/headers.ts';

test('only the official KNOuX film is added to the frame policy', () => {
  const policy = buildContentSecurityPolicy({ isDevelopment: false });
  assert.equal(policy.split('; ').find(s => s.startsWith('frame-src ')), "frame-src 'self' https://www.youtube-nocookie.com/embed/NOhO02YeGg4");
  assert.match(policy, /frame-ancestors 'self'/);
  assert.match(policy, /object-src 'none'/);
  const permissions = buildSecurityHeaders({ isDevelopment: false }).find(h => h.key === 'Permissions-Policy').value;
  assert.match(permissions, /autoplay=\(self "https:\/\/www\.youtube-nocookie\.com"\)/);
  assert.match(permissions, /fullscreen=\(self "https:\/\/www\.youtube-nocookie\.com"\)/);
  assert.doesNotMatch(policy, /frame-src[^;]*\*/);
  assert.equal((policy.match(/youtube-nocookie\.com/g) ?? []).length, 1);
  assert.match(permissions, /camera=\(\)/);
  assert.match(permissions, /microphone=\(\)/);
});
