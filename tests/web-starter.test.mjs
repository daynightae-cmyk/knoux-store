import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const { starterIdentity, starterDocument } = await loadTypeScript('../src/lib/web/starter.ts');
const system = { slug: 'corporate', title: 'Corporate site', tagline: 'Your introduction', category: 'site', artefacts: ['Navigation', 'Contact'] };

test('standalone web starters escape edited content and reject CSS injection', () => {
  const identity = starterIdentity(system, { name: '<script>alert(1)</script>', description: '" onload="alert(1)', accent: 'red;}</style><script>' });
  const html = starterDocument(system, identity, 'rtl');
  assert.equal(identity.accent, '#9c6bff');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script\b|onload\s*=\s*"alert/i);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /default-src 'none'/);
  assert.match(html, /href="#details"/);
  assert.match(html, /Navigation/);
});

test('starter normalization bounds persisted content and preserves intentional empty edits', () => {
  assert.equal(starterIdentity(system, { name: '' }).name, '');
  assert.equal(starterIdentity(system, { name: 'x'.repeat(200) }).name.length, 80);
  assert.equal(starterIdentity(system, { description: 'x'.repeat(800) }).description.length, 500);
  assert.deepEqual(starterIdentity(system), { name: system.title, description: system.tagline, accent: '#9c6bff' });
});

test('downloaded starters retain Urdu language and contrasting action text for extreme accents', () => {
  assert.match(starterDocument(system, starterIdentity(system, { accent: '#090513' }), 'rtl', 'ur'), /lang="ur" dir="rtl"/);
  assert.match(starterDocument(system, starterIdentity(system, { accent: '#000000' })), /color:#ffffff;font-weight:700/);
  assert.match(starterDocument(system, starterIdentity(system, { accent: '#ffffff' })), /color:#000000;font-weight:700/);
});
