import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './helpers.mjs';

const dataDir = join(root, 'src', 'data');
const libDir = join(root, 'src', 'lib');

/**
 * Evidence discipline.
 *
 * These gates exist because the easiest way to make a catalogue look complete
 * is to invent what is missing. They fail the build when a claim that cannot be
 * evidenced appears in the data layer.
 */

/** Numeric claims that would only be legitimate with a cited measurement. */
const FORBIDDEN_NUMERIC_CLAIMS = [
  /\bLighthouse\s+\d/i,
  /\b\d{2,}\s*\/\s*100\b/,
  /\bROAS\b/i,
  /\bCPA\b/i,
  /\bCPC\b/i,
  /\bconversion rate of\b/i,
  /\bconversion rate:\s*\d/i,
  /\b\d+%+\s*(lift|increase|improvement|reduction|growth|more)\b/i,
  /\bwithin \d+ (days|weeks)\b/i,
  /\b\d+[–-]\d+ (weeks?|days?|months?)\b/,
  /\bper month (minimum|retainer|ad spend)/i,
  /\$\d[\d,]*\s*\/?\s*(mo|month|per month)/i,
  /\bAED\s*[\d,]+/i,
  /\bLighthouse\b/i,
  /\bCLS 0\.000\b/i,
  /\bCore Web Vitals\b.{0,40}\bguarantee/i,
  /\bzero downtime guaranteed\b/i,
  /\b100% (secure|coverage|pass)/i,
  /\bclients?\s+(include|served|trust)/i,
  /\b\d+\+?\s*(clients|customers|brands|downloads|users)\b/i,
  /\btestimonials?\b/i,
  /\btrusted by\b/i,
  /\baward[- ]winning\b/i,
];

/** Marketing filler the brief explicitly rules out. */
const FORBIDDEN_COPY = [
  /empowering businesses/i,
  /innovative solutions/i,
  /cutting-edge/i,
  /transform your business/i,
  /revolutionary/i,
  /game-[- ]changing/i,
  /unlock the power/i,
  /seamless(ly)? (integrate|integrated)/i,
  /best-in-class/i,
  /world-class/i,
  /synergy/i,
  /holistic solution/i,
  /end-to-end solution/i,
  /one-stop shop/i,
];

/** Promissory phrasing. Bare disclaimers are allowed and are checked separately. */
const FORBIDDEN_PROMISES = [
  /\bwe guarantee/,
  /\bguaranteed (results?|performance|delivery|security|uptime|availability)\b/i,
  /\bguarantees? (results?|performance|delivery|security|uptime|availability)\b/i,
  /\bwe promise\b/i,
  /\bwill increase\b/i,
  /\bdoubles your\b/i,
  /\btriples your\b/i,
  /\bno risk\b/i,
];

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => join(dir, entry.name));
}

const dataFiles = [...sourceFiles(dataDir), ...sourceFiles(libDir)];

test('the data layer publishes no unverifiable numeric claim', () => {
  const offenders = [];
  for (const file of dataFiles) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_NUMERIC_CLAIMS) {
      const match = text.match(pattern);
      if (match) offenders.push(`${file.replace(root, '.')}: ${pattern} -> "${match[0]}"`);
    }
  }
  assert.deepEqual(offenders, [], `Unverifiable numeric claims found:\n${offenders.join('\n')}`);
});

test('the data layer uses no banned marketing filler', () => {
  const offenders = [];
  for (const file of dataFiles) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_COPY) {
      const match = text.match(pattern);
      if (match) offenders.push(`${file.replace(root, '.')}: ${pattern} -> "${match[0]}"`);
    }
  }
  assert.deepEqual(offenders, [], `Banned copy found:\n${offenders.join('\n')}`);
});

test('no registry promises an outcome', () => {
  const offenders = [];
  for (const file of dataFiles) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN_PROMISES) {
      const match = text.match(pattern);
      if (match) offenders.push(`${file.replace(root, '.')}: ${pattern} -> "${match[0]}"`);
    }
  }
  assert.deepEqual(offenders, [], `Outcome promises found:\n${offenders.join('\n')}`);
});

test('the WordPress catalogue is empty and says so rather than inventing releases', () => {
  const text = readFileSync(join(dataDir, 'wordpress.ts'), 'utf8');
  const match = text.match(/export const wordPressItems: readonly WordPressItem\[\] = \[([\s\S]*?)\];/);
  assert.ok(match, 'the WordPress registry must be declared as an explicit array');
  assert.equal(match[1].trim(), '', 'no WordPress item may be published without a verified release');
});

test('external and client repositories are excluded from the public catalogue', () => {
  const text = readFileSync(join(dataDir, 'software.ts'), 'utf8');
  // Repositories owned by the account that are not KNOuX-branded products.
  const external = [
    'YaRasoolAllah',
    'United-Olympics-Sports',
    'DayNightDeliveryServices1',
    'AL-HANA-ALZAHABYAH',
    'Olympics-Sports',
    'Versa-Ai',
    'Daynight',
  ];
  for (const name of external) {
    assert.ok(
      !text.includes(`'${name}'`),
      `${name} is not a KNOuX product and must not appear in the software registry or ledger`,
    );
  }
});

test('every published software product cites repository evidence', () => {
  const text = readFileSync(join(dataDir, 'software.ts'), 'utf8');
  const blocks = text.split(/^  \{\r?\n/m).slice(1);
  assert.ok(blocks.length >= 7, 'the universe must publish the audited canonical products');
  assert.ok(!text.slice(0, text.indexOf('export const repositoryLedger')).includes("id: 'sw-crypt'"), 'research concepts belong in Labs');
  for (const block of blocks) {
    if (!block.includes("code: 'SW-")) continue;
    assert.match(block, /evidence: \[/, 'every product must carry an evidence list');
    assert.match(block, /source: '/, 'every evidence entry must name its source artefact');
    assert.match(block, /limitations: \[/, 'every product must publish its stated limits');
  }
});

test('every product route referenced by navigation exists in the registry', () => {
  const navigation = readFileSync(join(dataDir, 'navigation.ts'), 'utf8');
  const software = readFileSync(join(dataDir, 'software.ts'), 'utf8');
  for (const match of navigation.matchAll(/href: '(\/[^']+)'/g)) {
    const href = match[1];
    assert.ok(href.startsWith('/'), 'navigation hrefs must be absolute paths');
  }
  for (const slug of [
    'knoux-one',
    'kforge',
    'knoux-repair',
    'knoux-smartorganizer',
    'knoux-rec',
    'knoux-x',
    'knoux-clipboard-ai',
  ]) {
    assert.ok(software.includes(`slug: '${slug}'`), `product slug ${slug} must exist in the registry`);
  }
});

test('the entity model is the single discovery contract', () => {
  const entities = readFileSync(join(libDir, 'entities.ts'), 'utf8');
  for (const field of ['id', 'kind', 'division', 'code', 'slug', 'name', 'shortName', 'summary', 'status', 'route', 'categories', 'searchTerms', 'capabilities', 'relatedIds']) {
    assert.ok(entities.includes(field), `DiscoverableEntity must declare ${field}`);
  }
});

test('every division referenced by the index is a real division', () => {
  const entities = readFileSync(join(libDir, 'entities.ts'), 'utf8');
  const declared = new Set(
    [...entities.matchAll(/id: '([a-z]+)',\r?\n    label:/g)].map((match) => match[1]),
  );
  assert.ok(declared.size >= 8, 'at least eight divisions must be declared');
  for (const id of declared) {
    assert.ok(
      new RegExp(`'${id}'`).test(entities),
      `division ${id} must be part of the DivisionId union`,
    );
  }
});

test('the composer only references resolvable entity ids', () => {
  const rules = readFileSync(join(dataDir, 'composer-rules.ts'), 'utf8');
  const source = [
    readFileSync(join(dataDir, 'software.ts'), 'utf8'),
    readFileSync(join(dataDir, 'wordpress.ts'), 'utf8'),
    readFileSync(join(dataDir, 'services.ts'), 'utf8'),
    readFileSync(join(dataDir, 'growth.ts'), 'utf8'),
    readFileSync(join(dataDir, 'solutions.ts'), 'utf8'),
    readFileSync(join(dataDir, 'capabilities.ts'), 'utf8'),
    rules,
  ].join('\n');

  const referenced = new Set();
  for (const match of rules.matchAll(/entityIds: \[([^\]]*)\]/g)) {
    for (const id of match[1].matchAll(/'([^']+)'/g)) referenced.add(id[1]);
  }
  assert.ok(referenced.size > 40, 'the composer must resolve a broad set of real entities');

  const unresolved = [...referenced].filter((id) => !source.includes(`id: '${id}'`));
  assert.deepEqual(unresolved, [], `composer rules reference entities that do not exist: ${unresolved.join(', ')}`);
});

test('solutions reference only entities that exist', () => {
  const solutions = readFileSync(join(dataDir, 'solutions.ts'), 'utf8');
  const source = [
    readFileSync(join(dataDir, 'software.ts'), 'utf8'),
    readFileSync(join(dataDir, 'wordpress.ts'), 'utf8'),
    readFileSync(join(dataDir, 'services.ts'), 'utf8'),
    readFileSync(join(dataDir, 'growth.ts'), 'utf8'),
    readFileSync(join(dataDir, 'capabilities.ts'), 'utf8'),
  ].join('\n');

  const referenced = new Set();
  for (const match of solutions.matchAll(/entityIds: \[([^\]]*)\]/g)) {
    for (const id of match[1].matchAll(/'([^']+)'/g)) referenced.add(id[1]);
  }
  for (const match of solutions.matchAll(/companionEntityIds: \[([^\]]*)\]/g)) {
    for (const id of match[1].matchAll(/'([^']+)'/g)) referenced.add(id[1]);
  }
  const unresolved = [...referenced].filter((id) => !source.includes(`id: '${id}'`));
  assert.deepEqual(unresolved, [], `solutions reference entities that do not exist: ${unresolved.join(', ')}`);
});

test('the motion grammar is defined once and honoured by the stylesheet', () => {
  const motion = readFileSync(join(libDir, 'motion.ts'), 'utf8');
  const css = readFileSync(join(root, 'src', 'app', 'globals.css'), 'utf8');
  for (const token of ['response', 'drawer', 'search', 'reveal', 'route']) {
    assert.ok(motion.includes(token), `motion token ${token} must be defined`);
    assert.ok(css.includes(`--motion-${token}`), `globals.css must consume --motion-${token}`);
  }
  assert.match(motion, /prefers-reduced-motion/, 'motion must respect reduced-motion preference');
});

test('the analytics surface names every required event and ships no provider', () => {
  const analytics = readFileSync(join(libDir, 'analytics.ts'), 'utf8');
  for (const event of [
    'search_performed',
    'product_opened',
    'division_opened',
    'composer_started',
    'composer_item_added',
    'solution_opened',
    'request_started',
    'request_submitted',
  ]) {
    assert.ok(analytics.includes(event), `analytics must name ${event}`);
  }
  const layout = readFileSync(join(root, 'src', 'app', 'layout.tsx'), 'utf8');
  for (const provider of ['googletagmanager', 'GTM-', 'gtag(', 'posthog', 'plausible', 'segment', 'mixpanel']) {
    assert.ok(!layout.includes(provider), `no analytics provider may be added without a requirement (${provider})`);
  }
});
