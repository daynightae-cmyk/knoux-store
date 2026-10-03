import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Read-only Phase A evidence integrity gate.
// Every assertion below is a claim the Phase A report is allowed to make. A failure
// means the report must change, not that the assertion should be relaxed.
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8').replace(/^\uFEFF/, ''));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ assertion: name, state: 'PASS' });
  } catch (error) {
    results.push({ assertion: name, state: 'FAIL', detail: error.message });
  }
};

const main = execFileSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' }).trim();
const catalog = read('live-structural-catalog.json');
const live = read('current-edge-functions.json');
const archived = read('live-edge-functions.json');
const bridge = read('bridge-reconciliation.json');
const donors = read('donor-semantic-review.json');
const callers = read('edge-caller-map.json');
const migrations = read('live-applied-migrations.json');
const preservation = read('preservation-recheck.json');
const summary = read('application-catalog-summary.json');
const withheldPolicies = read('withheld-policy-structure.json');
const foursquare = read('foursquare-staging-review.json');

const CATALOG_CLASSES = new Set(['UNKNOWN', 'LIVE ONLY', 'MATCHES SOURCE', 'DIVERGED', 'SECRET-DEPENDENT', 'SOURCE ONLY']);
const DONOR_DECISIONS = new Set(['PORT', 'SUPERSEDED', 'REFERENCE ONLY', 'BLOCKED', 'UNKNOWN']);
const BRIDGE_CLASSES = new Set(['MATCH', 'DIVERGED', 'UNKNOWN']);
const CANONICAL_TAXONOMY = new Set(['VERIFIED CANONICAL', 'LIVE-ONLY', 'DONOR-ONLY', 'DIVERGED', 'SUPERSEDED', 'UNVERIFIED']);

check('catalog objects carry only allowed classification values', () => {
  const offenders = catalog.objects.filter((o) => !CATALOG_CLASSES.has(o.classification)).map((o) => `${o.identity}=${o.classification}`);
  assert.equal(offenders.length, 0, `unexpected classifications: ${offenders.slice(0, 5).join(', ')}`);
  const grantOffenders = catalog.objects.flatMap((o) => (o.details.grants ?? []).filter((g) => !CATALOG_CLASSES.has(g.classification)).map((g) => `${o.identity}=${g.classification}`));
  assert.equal(grantOffenders.length, 0, `unexpected grant classifications: ${grantOffenders.slice(0, 5).join(', ')}`);
});

check('catalog comparison counts sum to the catalog and to origin/main', () => {
  const total = Object.values(catalog.comparison.counts).reduce((a, b) => a + b, 0);
  assert.equal(total, catalog.objects.length, `classification counts ${total} != ${catalog.objects.length} objects`);
  assert.equal(catalog.comparison.main, main, 'catalog was compared against a different base');
});

check('every source-only declaration is explicitly classified', () => {
  const offenders = (catalog.sourceOnly ?? []).filter((d) => d.classification !== 'SOURCE ONLY').map((d) => d.identity);
  assert.equal(offenders.length, 0, `source-only entries without classification: ${offenders.slice(0, 5).join(', ')}`);
});

check('six deployed aliases are covered by live, archived and caller evidence', () => {
  const liveSlugs = live.functions.map((f) => f.slug).sort();
  const archivedSlugs = archived.functions.map((f) => f.slug).sort();
  const callerSlugs = callers.aliases.map((a) => a.alias).sort();
  assert.equal(liveSlugs.length, 6, `expected 6 deployed aliases, observed ${liveSlugs.length}`);
  assert.deepEqual(archivedSlugs, liveSlugs, 'archived alias set differs from fresh live alias set');
  assert.deepEqual(callerSlugs, liveSlugs, 'caller map does not cover exactly the deployed aliases');
});

check('fresh live Edge Function source equals the archived deployed source', () => {
  let compared = 0;
  for (const fn of live.functions) {
    const prior = archived.functions.find((f) => f.slug === fn.slug);
    assert.ok(prior, `no archived alias for ${fn.slug}`);
    assert.equal(fn.version, prior.version, `version drift for ${fn.slug}`);
    assert.equal(fn.ezbr_sha256, prior.ezbr_sha256, `deployment bundle drift for ${fn.slug}`);
    for (const file of fn.files) {
      const before = prior.files.find((f) => f.name === file.name);
      assert.ok(before, `no archived file for ${fn.slug}/${file.name}`);
      assert.equal(sha256(Buffer.from(file.content, 'utf8')), sha256(Buffer.from(before.content, 'utf8')), `source drift for ${fn.slug}/${file.name}`);
      compared++;
    }
  }
  assert.ok(compared >= 10, `expected at least 10 archived edge files, compared ${compared}`);
});

check('bridge components use allowed values and claim no proven execution canonicality', () => {
  for (const component of bridge.components) {
    assert.ok(BRIDGE_CLASSES.has(component.classification), `bridge classification ${component.classification} for ${component.path}`);
    assert.ok(CANONICAL_TAXONOMY.has(component.canonicalExecutionRole), `canonicalExecutionRole missing or invalid for ${component.path}`);
    assert.notEqual(component.canonicalExecutionRole, 'VERIFIED CANONICAL', `${component.path} claims proven execution canonicality without deployment attestation`);
    assert.equal(component.liveDeployedSha256 ?? null, component.liveDeployedSha256 ?? null);
  }
});

check('bridge non-edge components retain missing deployment attestation', () => {
  const nonEdge = bridge.components.filter((c) => !c.path.startsWith('supabase/functions/'));
  assert.ok(nonEdge.length > 0, 'no non-edge bridge components compared');
  const overclaimed = nonEdge.filter((c) => c.liveDeployedSha256);
  assert.equal(overclaimed.length, 0, `non-edge components must not carry a live deployed hash: ${overclaimed.map((c) => c.path).join(', ')}`);
});

check('donor semantic review covers every changed file of both donors exactly once', () => {
  const expected = [];
  for (const ref of ['ff90282', '848c0eb']) {
    const full = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
    for (const file of execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', ref], { encoding: 'utf8' }).trim().split('\n')) {
      expected.push(`${full}:${file}`);
    }
  }
  const observed = donors.reviews.map((r) => `${r.donor}:${r.path}`);
  assert.equal(observed.length, 58, `donor review covers ${observed.length} candidates, expected 58`);
  assert.equal(new Set(observed).size, observed.length, 'donor review contains duplicate candidates');
  assert.deepEqual([...observed].sort(), [...expected].sort(), 'donor review candidate set does not equal the union of donor diffs');
});

check('donor decisions use only allowed values and no candidate is marked executed', () => {
  const offenders = donors.reviews.filter((r) => !DONOR_DECISIONS.has(r.decision)).map((r) => `${r.path}=${r.decision}`);
  assert.equal(offenders.length, 0, `unexpected donor decisions: ${offenders.slice(0, 5).join(', ')}`);
  assert.equal(donors.reviews.filter((r) => r.executed).length, 0, 'a donor candidate is marked executed');
  const tally = donors.reviews.reduce((acc, r) => ({ ...acc, [r.decision]: (acc[r.decision] ?? 0) + 1 }), {});
  assert.equal(Object.values(tally).reduce((a, b) => a + b, 0), 58, 'donor decision tally does not cover every candidate');
  assert.equal(tally.PORT ?? 0, 0, 'a donor candidate claims PORT without sufficient evidence');
  assert.equal(tally.UNKNOWN ?? 0, 0, 'an unclassified donor candidate remains');
});

check('migration recovery count is truthful: every recovered statement matches its recorded MD5', () => {
  let recovered = 0;
  for (const migration of migrations.migrations) {
    if (migration.safe_source === null) continue;
    assert.equal(crypto.createHash('md5').update(migration.safe_source).digest('hex'), migration.source_md5, `recovered statement fingerprint mismatch: ${migration.version}`);
    recovered++;
  }
  assert.equal(recovered, 22, `recovered statement count is ${recovered}, evidence claims 22`);
});

check('withheld migration count is truthful and stays withheld', () => {
  const withheld = migrations.migrations.filter((m) => m.safe_source === null);
  assert.equal(withheld.length, 17, `withheld migration count is ${withheld.length}, evidence claims 17`);
  assert.equal(withheld.length + 22, migrations.migrations.length, 'recovered and withheld do not partition the applied migration set');
  // Withheld means the statement text is absent; the MD5 of the applied statement is
  // retained on purpose as a non-reversible structural fingerprint.
  for (const migration of withheld) {
    assert.equal(migration.safe_source, null, `withheld migration ${migration.version} carries recoverable statement text`);
    assert.match(migration.source_md5 ?? '', /^[0-9a-f]{32}$/, `withheld migration ${migration.version} lacks a structural fingerprint`);
  }
});

check('no component claims a main hash for a path absent from the pinned base tree', () => {
  const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', main], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim().split('\n'));
  const bogus = bridge.components.filter((c) => c.mainSha256 && !tracked.has(c.path)).map((c) => c.path);
  assert.equal(bogus.length, 0, `mainSha256 recorded for paths absent from ${main}: ${bogus.join(', ')}`);
  const wrongDonor = bridge.components.filter((c) => c.mainSha256 && tracked.has(c.path))
    .filter((c) => sha256(execFileSync('git', ['cat-file', 'blob', `${main}:${c.path}`], { maxBuffer: 20 * 1024 * 1024 })) !== c.mainSha256)
    .map((c) => c.path);
  assert.equal(wrongDonor.length, 0, `mainSha256 does not match the base tree blob: ${wrongDonor.join(', ')}`);
});

check('donor review main presence is derived from the base tree, not from a failed lookup', () => {
  const tracked = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', main], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim().split('\n'));
  for (const review of donors.reviews) {
    assert.equal(review.mainPresence, tracked.has(review.path) ? 'PRESENT' : 'ABSENT', `mainPresence is wrong for ${review.path}`);
    assert.equal(review.mainSha256 !== null, tracked.has(review.path), `mainSha256 presence disagrees with mainPresence for ${review.path}`);
  }
});

check('temporary staging policies are recorded only as masked structure', () => {
  assert.equal(withheldPolicies.policies.length, 2, 'expected exactly two secret-dependent staging policies');
  for (const policy of withheldPolicies.policies) {
    assert.equal(policy.details.secret_dependent, true, `${policy.identity} is not classified secret-dependent`);
    assert.equal(policy.details.expression_withheld, true, `${policy.identity} is not marked withheld`);
    assert.match(policy.details.expression_md5, /^[0-9a-f]{32}$/, `${policy.identity} lacks a structural fingerprint`);
    for (const field of ['sanitized_using', 'sanitized_with_check']) {
      const value = policy.details[field];
      if (value === null) continue;
      assert.ok(value.includes('[WITHHELD LITERAL]'), `${policy.identity}.${field} is not literal-masked`);
      assert.equal(/'[A-Za-z0-9+/=_-]{12,}'/.test(value.replace(/'\[WITHHELD LITERAL\]'/g, '')), false, `${policy.identity}.${field} still carries a long literal`);
    }
  }
});

check('no credential-class value is present in any evidence file', () => {
  const classes = [
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
    /sk-ant-[A-Za-z0-9_-]{16,}/,
    /sk-or-v1-[A-Za-z0-9]{16,}/,
    /gsk_[A-Za-z0-9]{20,}/,
    /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/,
    /AIza[0-9A-Za-z_-]{35}/,
    /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/,
    /github_pat_[A-Za-z0-9_]{50,}/,
    /\bsb_secret_[A-Za-z0-9_-]{20,}/,
    /\bsntrys_[A-Za-z0-9_-]{20,}/,
    /\b(?:e2b|sk_e2b)_[A-Za-z0-9]{20,}/,
    /\bdtn_[A-Za-z0-9]{20,}/,
    /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    /Bearer\s+[A-Za-z0-9._~+/-]{20,}=*/,
    /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s/@]+:[^@\s]{6,}@/,
  ];
  const offenders = [];
  for (const name of fs.readdirSync(here)) {
    if (!name.endsWith('.json') && !name.endsWith('.mjs')) continue;
    const text = fs.readFileSync(path.join(here, name), 'utf8');
    const decoded = name === 'bridge-donor-source.json'
      ? read(name).files.map((f) => Buffer.from(f.contentBase64, 'base64').toString('utf8')).join('\n')
      : '';
    for (const pattern of classes) {
      if (pattern.test(text)) offenders.push(`${name} (raw)`);
      if (decoded && pattern.test(decoded)) offenders.push(`${name} (decoded donor source)`);
    }
  }
  assert.equal(offenders.length, 0, `credential-class value found in: ${[...new Set(offenders)].join(', ')}`);
});

check('application summary is bound to the catalog on disk and its per-object claims still hold', () => {
  assert.equal(summary.main, main, 'application summary was derived against a different base');
  assert.equal(summary.catalogObjects, catalog.objects.length, 'application summary object count drifted from the catalog');
  assert.equal(summary.catalogObjectsSha256, sha256(Buffer.from(JSON.stringify(catalog.objects))), 'catalog fingerprint does not match the catalog on disk');
  const functions = new Map(catalog.objects.filter((o) => o.kind === 'function').map((o) => [`${o.details.schema}.${o.details.name}`, o]));
  for (const rpc of summary.publicRpcSignatures) {
    const object = functions.get(rpc.signature.replace(/\(.*/, ''));
    assert.ok(object, `RPC absent from catalog: ${rpc.signature}`);
    assert.equal(object.classification, rpc.classification, `RPC classification drift: ${rpc.signature}`);
    assert.equal(object.details.security_definer, rpc.securityDefiner, `RPC SECURITY DEFINER drift: ${rpc.signature}`);
  }
  const relations = new Map(catalog.objects.filter((o) => o.kind === 'relation').map((o) => [o.identity, o]));
  for (const table of summary.publicTableRls) {
    const object = relations.get(table.table);
    assert.ok(object, `table absent from catalog: ${table.table}`);
    assert.equal(object.classification, table.classification, `table classification drift: ${table.table}`);
    assert.equal(table.enabled, true, `${table.table} is no longer recorded as RLS enabled`);
  }
  assert.equal(summary.publicRpcSignatures.length, 36, 'public RPC signature count drifted');
  assert.equal(summary.publicTableRls.length, 32, 'public table RLS count drifted');
  assert.equal(summary.extensions.length, 7, 'installed extension count drifted');
});

check('Foursquare RPC is referenced only by audit artifacts, and that is recorded as non-proof', () => {
  const scan = read('foursquare-reference-scan.json');
  assert.ok(scan.scannedFiles > 0, 'reference scan examined no files');
  const nonAudit = scan.matches.filter((m) => !m.auditArtifact).map((m) => m.path);
  assert.equal(nonAudit.length, 0, `non-audit references to the staging RPC exist: ${nonAudit.join(', ')}`);
  assert.match(scan.conclusion, /not proof of absence/i, 'the scan no longer records its own evidentiary limit');
});

check('every donor fingerprint is unchanged since the census', () => {
  assert.ok(preservation.checked > 0, 'preservation recheck examined no files');
  assert.equal(preservation.changed.length, 0, `changed donor files: ${preservation.changed.map((c) => `${c.worktree}/${c.path}`).join(', ')}`);
  assert.equal(preservation.missing.length, 0, `missing donor files: ${preservation.missing.map((c) => `${c.worktree}/${c.path}`).join(', ')}`);
  assert.equal(preservation.checked, preservation.unchanged, 'checked and unchanged counts disagree');
  assert.equal(preservation.excludedOwner.includes('PR #30'), true, 'PR #30 ownership exclusion is not recorded');
});

check('caller identity stays UNVERIFIED for every alias', () => {
  for (const alias of callers.aliases) {
    assert.equal(alias.status, 'UNVERIFIED', `${alias.alias} claims a verified caller status`);
    assert.equal(alias.repositoryCallSites.length, 0, `${alias.alias} unexpectedly claims a main call site`);
  }
});

check('temporary Foursquare staging RPC stays BLOCKED with unresolved ownership', () => {
  assert.equal(foursquare.state, 'BLOCKED', 'Foursquare staging RPC is not marked BLOCKED');
  assert.match(foursquare.stillRequired, /UNVERIFIED/, 'continued need is not recorded as UNVERIFIED');
  assert.equal(foursquare.auth.securityDefiner, true, 'SECURITY DEFINER status is no longer recorded');
  assert.match(foursquare.actionsTaken, /[Rr]ead-only/, 'a mutation is recorded against the staging RPC');
});

check('dependency evidence keeps production clean and tooling explicitly open', () => {
  const summary = read('dependency-audit-summary.json');
  assert.equal(summary.productionAudit.total, 0, 'production audit is no longer zero advisories');
  assert.equal(summary.fullDevToolingAudit.high, 6, 'tooling audit high count is no longer 6');
  assert.equal(summary.status, 'BLOCKED', 'tooling risk is no longer recorded as open');
  assert.equal(summary.owner, 'PR #30', 'dependency ownership is no longer attributed to PR #30');
});

const failed = results.filter((r) => r.state === 'FAIL');
console.log(JSON.stringify({
  assertions: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
}, null, 2));
process.exitCode = failed.length ? 1 : 0;