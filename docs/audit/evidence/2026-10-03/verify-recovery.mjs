import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Read-only integrity verification. This does not execute recovered source,
// export secrets, restore files, or prove semantic/runtime parity.
const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(here, name), 'utf8'));
const digest = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const donor = read('bridge-donor-source.json');
const edge = read('live-edge-functions.json');
const parity = read('source-parity.json');
const migrations = read('live-applied-migrations.json');
let donorChecks = 0;
let edgeChecks = 0;
let migrationChecks = 0;
let localDonorChecks = 0;

for (const file of donor.files) {
  const bytes = Buffer.from(file.contentBase64, 'base64');
  assert.equal(bytes.length, file.bytes, `Donor length: ${file.path}`);
  assert.equal(digest(bytes), file.sha256, `Donor fingerprint: ${file.path}`);
  donorChecks++;
  const localPath = join(donor.donor, file.path);
  if (existsSync(localPath)) {
    assert.equal(digest(readFileSync(localPath)), file.sha256, `Donor changed since recovery: ${file.path}`);
    localDonorChecks++;
  }
}
for (const fn of edge.functions) {
  const observed = parity.functions.find((entry) => entry.slug === fn.slug);
  assert.ok(observed, `Function manifest: ${fn.slug}`);
  assert.equal(fn.version, observed.version);
  assert.equal(fn.ezbr_sha256, observed.deploymentBundleSha256);
  for (const file of fn.files) {
    const recorded = observed.files.find((entry) => entry.name === file.name);
    assert.ok(recorded, `Function file manifest: ${fn.slug}/${file.name}`);
    assert.equal(digest(Buffer.from(file.content, 'utf8')), recorded.sourceSha256);
    edgeChecks++;
  }
}
for (const migration of migrations.migrations) {
  if (migration.safe_source === null) continue;
  assert.equal(digest(migration.safe_source, 'md5'), migration.source_md5,
    `Original applied statement fingerprint: ${migration.version}`);
  migrationChecks++;
}
console.log(JSON.stringify({ donorChecks, localDonorChecks, edgeChecks, migrationChecks,
  withheldMigrations: migrations.migrations.length - migrationChecks,
  result: 'Archive integrity verified; runtime and schema parity remain unproven.' }, null, 2));
