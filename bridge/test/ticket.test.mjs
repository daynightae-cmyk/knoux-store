import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createPublicKey } from 'node:crypto';
import { verifyTicket, resetJtiCache, issuerFingerprint, newJti } from '../dist/ticket.js';

const BRIDGE_ID = 'bridge-under-test';
const AUD = BRIDGE_ID;

function makeIssuer() {
  return generateKeyPairSync('ed25519', {
    publicKeyEncoding: { format: 'pem', type: 'spki' },
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  });
}

/** Mint a ticket the way the BFF does. Ed25519 takes no digest argument. */
function mint(privateKeyPem, claims, headerOverrides = {}) {
  const header = { alg: 'EdDSA', typ: 'KNX-TKT', ...headerOverrides };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const input = `${headerB64}.${claimsB64}`;
  const signature = sign(null, Buffer.from(input, 'utf8'), privateKeyPem).toString('base64url');
  return `${input}.${signature}`;
}

function claims(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'knoux-bff',
    aud: AUD,
    sub: 'owner-1',
    sid: 'session-1',
    scope: ['fs:read'],
    jti: newJti(),
    iat: now,
    exp: now + 60,
    ...overrides,
  };
}

let issuer;
let issuerFingerprintHex;
let trusted;

beforeEach(() => {
  resetJtiCache();
  issuer = makeIssuer();
  issuerFingerprintHex = issuerFingerprint(issuer.publicKey);
  trusted = [issuer.publicKey];
});

test('a correctly signed, unexpired ticket verifies', () => {
  const token = mint(issuer.privateKey, claims());
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
  assert.equal(result.claims.sub, 'owner-1');
});

test('Ed25519 verification works: this is the path that was previously broken', () => {
  // Regression guard. createVerify('sha256') with an Ed25519 key throws
  // ERR_CRYPTO_UNSUPPORTED_OPERATION, which silently rejected every ticket.
  const token = mint(issuer.privateKey, claims());
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, true);
});

test('a ticket signed by an untrusted key is rejected', () => {
  const attacker = makeIssuer();
  const token = mint(attacker.privateKey, claims());
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /Signature/);
});

test('a tampered payload is rejected', () => {
  const token = mint(issuer.privateKey, claims());
  const [headerB64, , signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify(claims({ sub: 'attacker' }))).toString('base64url');
  const result = verifyTicket(`${headerB64}.${forged}.${signature}`, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
});

test('alg none is rejected even when unsigned', () => {
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'KNX-TKT' })).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims())).toString('base64url');
  const result = verifyTicket(`${headerB64}.${claimsB64}.`, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /alg\/typ/);
});

test('a forged signature of the right shape is rejected', () => {
  // A token claiming EdDSA with a correctly sized but meaningless signature.
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'KNX-TKT' })).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims())).toString('base64url');
  const forged = Buffer.alloc(64, 7).toString('base64url');
  const result = verifyTicket(`${headerB64}.${claimsB64}.${forged}`, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /Signature/);
});

test('a wrong typ header is rejected', () => {
  const token = mint(issuer.privateKey, claims(), { typ: 'JWT' });
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /alg\/typ/);
});

test('a ticket for another audience is rejected', () => {
  const token = mint(issuer.privateKey, claims({ aud: 'some-other-bridge' }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /Audience/);
});

test('an expired ticket is rejected', () => {
  const now = Math.floor(Date.now() / 1000);
  const token = mint(issuer.privateKey, claims({ iat: now - 600, exp: now - 300 }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /expired/);
});

test('a ticket whose lifetime exceeds the ceiling is rejected', () => {
  const now = Math.floor(Date.now() / 1000);
  // A long-lived ticket would let a captured one stay usable indefinitely.
  const token = mint(issuer.privateKey, claims({ iat: now, exp: now + 86400 }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /lifetime/);
});

test('a correctly minted 60s ticket is accepted, not rejected as future', () => {
  // Regression guard: an earlier implementation rejected any exp greater than
  // now, which refused every legitimately minted ticket.
  const now = Math.floor(Date.now() / 1000);
  const token = mint(issuer.privateKey, claims({ iat: now, exp: now + 60 }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
});

test('a ticket issued in the future beyond skew is rejected', () => {
  const now = Math.floor(Date.now() / 1000);
  const token = mint(issuer.privateKey, claims({ iat: now + 600, exp: now + 660 }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /future/);
});

test('small clock skew is tolerated', () => {
  const now = Math.floor(Date.now() / 1000);
  const token = mint(issuer.privateKey, claims({ iat: now - 3, exp: now - 2 }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
});

test('a ticket missing the required scope is rejected', () => {
  const token = mint(issuer.privateKey, claims({ scope: ['fs:read'] }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:write');
  assert.equal(result.ok, false);
  assert.match(result.reason, /scope/);
});

test('a ticket with extra scopes still satisfies a required one', () => {
  const token = mint(issuer.privateKey, claims({ scope: ['fs:read', 'fs:write', 'fs:delete'] }));
  assert.equal(verifyTicket(token, trusted, BRIDGE_ID, 'fs:write').ok, true);
});

test('a replayed ticket is rejected on second use', () => {
  const token = mint(issuer.privateKey, claims());
  assert.equal(verifyTicket(token, trusted, BRIDGE_ID, 'fs:read').ok, true);
  const replay = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(replay.ok, false);
  assert.match(replay.reason, /replayed/);
});

test('the error code is generic while the reason is specific', () => {
  const token = mint(issuer.privateKey, claims({ aud: 'wrong' }));
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.error, 'invalid-ticket');
  assert.notEqual(result.reason, result.error);
});

test('a token over the size limit is rejected before parsing', () => {
  const huge = 'a'.repeat(5000) + '.b.c';
  const result = verifyTicket(huge, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /size/);
});

test('a malformed token is rejected', () => {
  for (const token of ['not-a-token', 'a.b', 'a.b.c.d', '...', '']) {
    const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
    assert.equal(result.ok, false, `expected ${JSON.stringify(token)} to be rejected`);
  }
});

test('non-base64url segments are rejected', () => {
  const result = verifyTicket('!!!.???.***', trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
});

test('a kid naming an untrusted issuer is rejected before signature checking', () => {
  const token = mint(issuer.privateKey, claims(), { kid: 'deadbeefdeadbeef' });
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /kid/);
});

test('a matching kid still verifies', () => {
  const token = mint(issuer.privateKey, claims(), { kid: issuerFingerprintHex.slice(0, 16) });
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, true, result.ok ? '' : result.reason);
});

test('a ticket with no issuer is rejected', () => {
  const token = mint(issuer.privateKey, { ...claims(), iss: '' });
  const result = verifyTicket(token, trusted, BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
  assert.match(result.reason, /issuer/);
});

test('verification against an empty trust store always fails', () => {
  const token = mint(issuer.privateKey, claims());
  const result = verifyTicket(token, [], BRIDGE_ID, 'fs:read');
  assert.equal(result.ok, false);
});

test('a second trusted issuer is accepted without breaking the first', () => {
  const second = makeIssuer();
  const bothTrusted = [...trusted, second.publicKey];
  const tokenFromSecond = mint(second.privateKey, claims());
  assert.equal(verifyTicket(tokenFromSecond, bothTrusted, BRIDGE_ID, 'fs:read').ok, true);
  assert.equal(verifyTicket(tokenFromSecond, trusted, BRIDGE_ID, 'fs:read').ok, false);
});

test('issuerFingerprint is stable and matches the BFF derivation over SPKI DER', async () => {
  // The BFF computes the same value with createPublicKey(pem).export({der, spki}).
  // Both sides must agree, because `kid` is compared against this.
  assert.match(issuerFingerprintHex, /^[0-9a-f]{64}$/);
  assert.equal(issuerFingerprint(createPublicKey(issuer.publicKey)), issuerFingerprintHex);

  const { createHash } = await import('node:crypto');
  const der = createPublicKey(issuer.publicKey).export({ format: 'der', type: 'spki' });
  assert.equal(issuerFingerprintHex, createHash('sha256').update(der).digest('hex'));
});