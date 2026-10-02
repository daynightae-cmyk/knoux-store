import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';
import { loadTypeScript } from './load.mjs';

const { softwareUniverseProducts } = await loadTypeScript('../src/data/software-universe.ts');
const { resolveProductLogo } = await loadTypeScript('../src/data/product-visuals.ts');

const expected = [
  ['KNOUX ONE', 'knoux-one', '/products/knoux-one', 'knoux-one.webp', 'FE2B32B2735278EE524CDBC14EF63BB9D37F490F5E78F69B2E53D46032AC56C4'],
  ['KNOuX Forge', 'knoux-forge', '/products/kforge', 'knoux-forge.webp', '06C2FD8492D4A0C98D90B77B85881CD4B5C7C60A98317D6D9536A6F93F3BB8F6'],
  ['KNOuX Repair', 'knoux-repair', '/products/knoux-repair', 'knoux-repair.webp', 'A9A20E680F8B32C3773A413A0AE8CA30ACA4E87535E21CB4519FD084BF66653A'],
  ['KNOuX SmartOrganizer', 'knoux-smartorganizer', '/products/knoux-smartorganizer', 'knoux-smartorganizer.webp', '8A1307994E21989D7DF855CE82DCEBA2EA9E55EA77ECEAC5BE89872E7A0AA2AC'],
  ['KNOuX REC', 'knoux-rec', '/products/knoux-rec', 'knoux-rec.webp', '546F91F26A7E1C45DBC7AD36D1670D10FA602D5B5709EB52263A83710174AF33'],
  ['KNOuX Player X', 'knoux-player-x', '/products/knoux-x', 'knoux-player-x.webp', '3F0D6234C2EEF0DEB008C23B4FE5190BB5032798D5FC23D97AE71281A8E7E088'],
  ['KNOuX Clipboard AI', 'knoux-clipboard-ai', '/products/knoux-clipboard-ai', 'knoux-clipboard-ai.webp', '92318CB0566432B72DCAD20460B3088A63DDBB6CB97CFD808596A105278F36A6'],
  ['KNOuX Signal', 'knoux-signal', '/signal', 'knoux-signal.webp', '3706E2B3A552E14722FCD2A0BD1DC7DEF820A60DD4195B1AA86595CEC16E17FE'],
  ['KNOuX Quill', 'knoux-quill', '/labs#lab-quill', 'knoux-quill.webp', 'F8B0603A372085F5F8A5DEFF883DA1EAD0D5A45BF6FA540606CBCA926E098F02'],
  ['KNOuX Crypt', 'knoux-crypt', '/labs#lab-crypt', 'knoux-crypt.webp', '0802254B7E8C0DE90008C23D4A19FAF0930781FD3530D7F0A83D25FF4FBBC3B4'],
];

test('software universe publishes exactly the recovered ten-product identity set in order', () => {
  assert.equal(softwareUniverseProducts.length, 10);
  assert.deepEqual(
    softwareUniverseProducts.map((product) => [product.name, product.id, product.route, product.image.split('/').pop()]),
    expected.map(([name, id, route, file]) => [name, id, route, file]),
  );
  assert.equal(new Set(softwareUniverseProducts.map((product) => product.id)).size, 10);
  assert.equal(new Set(softwareUniverseProducts.map((product) => product.image)).size, 10);
});

test('all ten recovered WebP assets retain their authoritative SHA-256 bytes', () => {
  for (const [, , , file, expectedHash] of expected) {
    const bytes = readFileSync(join(root, 'public', 'knoux-universe', file));
    const actual = createHash('sha256').update(bytes).digest('hex').toUpperCase();
    assert.equal(actual, expectedHash, file + ' must match the recovered asset exactly');
  }
});

test('every canonical product dossier resolves to its recovered real logo without fallback', () => {
  const dossierSlugs = [
    'knoux-one',
    'kforge',
    'knoux-repair',
    'knoux-smartorganizer',
    'knoux-rec',
    'knoux-x',
    'knoux-clipboard-ai',
  ];
  for (const slug of dossierSlugs) {
    const logo = resolveProductLogo(slug);
    assert.ok(logo, slug + ' must resolve a real recovered logo');
    assert.match(logo, /^\/knoux-universe\/.+\.webp$/);
  }
});

test('Signal and research identities route to their truthful existing surfaces', () => {
  const signal = softwareUniverseProducts.find((product) => product.id === 'knoux-signal');
  const quill = softwareUniverseProducts.find((product) => product.id === 'knoux-quill');
  const crypt = softwareUniverseProducts.find((product) => product.id === 'knoux-crypt');
  assert.equal(signal?.route, '/signal');
  assert.equal(signal?.kind, 'signal');
  assert.equal(quill?.route, '/labs#lab-quill');
  assert.equal(crypt?.route, '/labs#lab-crypt');
  assert.equal(quill?.kind, 'research');
  assert.equal(crypt?.kind, 'research');
});
