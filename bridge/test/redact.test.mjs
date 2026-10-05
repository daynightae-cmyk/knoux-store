import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactString, redactError, redactObject, containsSecret } from '../dist/redact.js';

/**
 * Redaction — behavioural.
 *
 * Every case below asserts on what the shipped function returns, not on whether
 * the source mentions a keyword. The previous implementation satisfied a
 * source-text check while `Authorization: Bearer …` and every bare JWT passed
 * through into the audit log untouched, so the property is asserted the only
 * way it can be trusted: by executing the redactor.
 */

/** Real credential shapes this system can actually encounter. */
const LEAKS = [
  ['META_APP_SECRET=super-secret-value', 'super-secret-value'],
  ['GOOGLE_CLIENT_SECRET: another-secret', 'another-secret'],
  ['CLIENT_SECRET=abc123def456', 'abc123def456'],
  ['ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij', 'eyJhbGciOiJIUzI1NiJ9'],
  ['REFRESH_TOKEN=rt-1234567890abcdef', 'rt-1234567890abcdef'],
  ['DB_PASSWORD=hunter2secret', 'hunter2secret'],
  ['API_KEY=sk-proj-1234567890', 'sk-proj-1234567890'],
  ['AUTHORIZATION=Bearer abc123def456ghi789', 'abc123def456ghi789'],
  ['Authorization: Bearer abc123def456ghi789', 'abc123def456ghi789'],
  ['SUPABASE_SERVICE_ROLE_KEY=sbp_1234567890abcdefghij', 'sbp_1234567890abcdefghij'],
  ['webhook secret whsec_abcdefghijklmnop', 'whsec_abcdefghijklmnop'],
  ['x-api-key: 12345abcdef0123456789abcdef', '12345abcdef0123456789abcdef'],
  ['KNOUX_AGENT_TOKEN=knx_9f8e7d6c5b4a3210', 'knx_9f8e7d6c5b4a3210'],
  ['KNOUX_CONTROL_PLANE_ENROLLMENT_TOKEN=abc123def456ghi', 'abc123def456ghi'],
];

/** Values whose *shape* is a credential, with no label anywhere in the text. */
const UNLABELLED = [
  ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij', 'eyJhbGciOiJIUzI1NiJ9'],
  ['EAABwzLixnjYBO7ZBqtwf1Bs8kZB1a1FQh1EJZ1m0ZC2nL', 'EAABwzLixnjYBO7ZBqtwf1Bs8kZB1a1FQh1EJZ1m0ZC2nL'],
  ['Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghij', 'eyJhbGciOiJIUzI1NiJ9'],
];

test('a labelled credential value never survives redaction', () => {
  for (const [input, secret] of LEAKS) {
    const out = redactString(input);
    assert.ok(!out.includes(secret), `leaked ${secret} from ${input} -> ${out}`);
    assert.match(out, /REDACTED/);
  }
});

test('an unlabelled credential is still redacted by its shape', () => {
  for (const [input, secret] of UNLABELLED) {
    const out = redactString(input);
    assert.ok(!out.includes(secret), `leaked ${secret} -> ${out}`);
  }
});

test('an underscore inside a credential label does not hide the value', () => {
  // The regression that motivated this file: `\b` does not fire inside
  // `META_APP_SECRET`, because an underscore is a word character.
  assert.ok(!redactString('META_APP_SECRET=super-secret-value').includes('super-secret-value'));
  assert.ok(!redactString('a=b; SUPABASE_SERVICE_ROLE_KEY=sbp_leaked_value').includes('sbp_leaked_value'));
});

test('ordinary audit prose is preserved byte-for-byte', () => {
  const prose = [
    'Budget changed from AED 750.00 to AED 800.00 after the client asked for 7 days.',
    'Campaign cmp_0192c3 for client cl_helix moved from DRAFT to APPROVED.',
    'Meta reported 1204 impressions and 61 link clicks for the week ending 2026-10-02.',
    'Operator approved the AED 45000.00 Q4 launch plan on 2026-10-04.',
    'The workspace owner changed the Google Ads customer id to 482-119-7735.',
  ];
  for (const detail of prose) {
    assert.equal(redactString(detail), detail, `redaction rewrote useful prose: ${detail}`);
  }
});

test('redactError reaches the message of a thrown error', () => {
  const err = new Error('connect failed: META_APP_SECRET=super-secret-value');
  assert.ok(!redactError(err).includes('super-secret-value'));
  assert.ok(!redactError('plain string TOKEN=abc123def456').includes('abc123def456'));
});

test('a field whose name is a credential is redacted whatever it holds', () => {
  const out = redactObject({
    detail: 'META_APP_SECRET=super-secret-value',
    accessToken: 'a value that does not look like a token at all',
    nested: { password: 'hunter2secret', note: 'unchanged' },
    count: 3,
  });
  assert.equal(out.accessToken, '[REDACTED]', 'a key named accessToken must not be pattern-matched');
  assert.equal(out.nested.password, '[REDACTED]');
  assert.equal(out.nested.note, 'unchanged');
  assert.equal(out.count, 3);
  assert.ok(!JSON.stringify(out).includes('super-secret-value'));
  assert.ok(!JSON.stringify(out).includes('hunter2secret'));
});

test('containsSecret recognises a credential label and ignores prose', () => {
  assert.equal(containsSecret('META_APP_SECRET'), true);
  assert.equal(containsSecret('authorization'), true);
  assert.equal(containsSecret('Budget changed from AED 750.00 to AED 800.00'), false);
});