/**
 * Bridge keys and tickets — the BFF side of the ticket contract.
 *
 * The bridge and this file must agree exactly, or every ticket is refused. The
 * Ed25519 cases here are the ones that actually bit: `sign('sha256', ...)` and
 * `createVerify('sha256')` throw against an Ed25519 key, because Ed25519 hashes
 * internally and refuses an external digest. Both sides now pass `null`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateKeyPairSync, verify, randomBytes,
  createPrivateKey, createPublicKey,
} from 'node:crypto';
import { enableTypeScriptResolution, loadTypeScript } from './load.mjs';

enableTypeScriptResolution();

const keysModule = await loadTypeScript('../src/lib/build/bridge-keys.ts');
const ticketsModule = await loadTypeScript('../src/lib/build/bridge-tickets.ts');
const protocolModule = await loadTypeScript('../src/lib/build/bridge-protocol.ts');

const {
  loadBridgeKeys, signData, verifyData, verifyCompactJws,
  fingerprintPublicKey, ed25519SeedToPkcs8Pem, newJti,
} = keysModule;
const { buildTicketClaims, mintTicket, scopesForAction } = ticketsModule;
const { BRIDGE_SCOPES, isBridgeScope, validateTicketClaims } = protocolModule;

const BRIDGE_ID = 'bridge-unit-test';

/** An issuer keypair in the PEM form a deployment supplies. */
function pemIssuer() {
  return generateKeyPairSync('ed25519', {
    publicKeyEncoding: { format: 'pem', type: 'spki' },
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  });
}

/** The public key that a raw 32-byte seed encodes, in PEM form. */
function publicKeyFromSeed(seed) {
  const privateKey = createPrivateKey(ed25519SeedToPkcs8Pem(seed));
  return createPublicKey(privateKey).export({ format: 'pem', type: 'spki' }).toString();
}

/** The key descriptor shape `loadBridgeKeys` returns. */
function keyDescriptorFor(issuer) {
  return {
    publicKeyPem: issuer.publicKey,
    privateKeyPem: issuer.privateKey,
    fingerprint: fingerprintPublicKey(createPublicKey(issuer.publicKey)),
  };
}

// ---------------------------------------------------------------------------
// Key loading
// ---------------------------------------------------------------------------

test('no signing key yields null so the caller can fail closed', () => {
  assert.equal(loadBridgeKeys({}), null);
  assert.equal(loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: '' }), null);
  assert.equal(loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: '   ' }), null);
});

test('a PEM signing key loads with its public key and fingerprint', () => {
  const issuer = pemIssuer();
  const loaded = loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: issuer.privateKey });
  assert.ok(loaded, 'expected a keypair');
  assert.equal(loaded.privateKeyPem, issuer.privateKey);
  assert.equal(loaded.publicKeyPem, issuer.publicKey);
  assert.match(loaded.fingerprint, /^[0-9a-f]{64}$/);
});

test('a base64 seed loads to the keypair that seed describes', () => {
  const seed = randomBytes(32);
  const pem = ed25519SeedToPkcs8Pem(seed);
  const loaded = loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: seed.toString('base64') });
  assert.ok(loaded, 'expected a keypair from the seed');
  // The derived key must be the one the seed encodes, not a fresh key.
  assert.equal(loaded.privateKeyPem, pem);
  assert.equal(loaded.publicKeyPem, publicKeyFromSeed(seed));
});

test('the fingerprint of a seed-derived key is the fingerprint of that seed key', () => {
  const seed = randomBytes(32);
  const loaded = loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: seed.toString('base64') });
  const expected = fingerprintPublicKey(createPublicKey(publicKeyFromSeed(seed)));
  assert.equal(loaded.fingerprint, expected);
});

test('a seed of the wrong length is refused', () => {
  for (const length of [16, 31, 33, 64]) {
    const loaded = loadBridgeKeys({
      KNOUX_BRIDGE_SIGNING_KEY: randomBytes(length).toString('base64'),
    });
    assert.equal(loaded, null, `a ${length}-byte seed must be refused`);
  }
});

test('a malformed key is refused rather than half-loaded', () => {
  for (const bad of ['-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----', 'not a key at all']) {
    assert.equal(loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: bad }), null);
  }
});

test('loading the same seed twice gives the same fingerprint', () => {
  const seed = randomBytes(32).toString('base64');
  const a = loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: seed });
  const b = loadBridgeKeys({ KNOUX_BRIDGE_SIGNING_KEY: seed });
  assert.equal(a.fingerprint, b.fingerprint, 'a seed must be a stable identity');
});

test('ed25519SeedToPkcs8Pem refuses a seed that is not 32 bytes', () => {
  assert.throws(() => ed25519SeedToPkcs8Pem(randomBytes(31)), /32 bytes/);
});

// ---------------------------------------------------------------------------
// Signing
// ---------------------------------------------------------------------------

test('signData produces a signature verifyData accepts', () => {
  const issuer = pemIssuer();
  const data = 'header.claims';
  const signature = signData(issuer.privateKey, data);
  assert.equal(verifyData(issuer.publicKey, data, signature), true);
});

test('signData is deterministic, as Ed25519 is', () => {
  const issuer = pemIssuer();
  assert.equal(signData(issuer.privateKey, 'x'), signData(issuer.privateKey, 'x'));
});

test('a signature does not verify against different data', () => {
  const issuer = pemIssuer();
  const signature = signData(issuer.privateKey, 'original');
  assert.equal(verifyData(issuer.publicKey, 'tampered', signature), false);
});

test('a signature does not verify against a different key', () => {
  const a = pemIssuer();
  const b = pemIssuer();
  const signature = signData(a.privateKey, 'data');
  assert.equal(verifyData(b.publicKey, 'data', signature), false);
});

test('verifyData returns false for junk rather than throwing', () => {
  const issuer = pemIssuer();
  assert.equal(verifyData(issuer.publicKey, 'data', 'not-base64url!!'), false);
  assert.equal(verifyData('not a key', 'data', 'AAAA'), false);
});

test('verifyCompactJws round-trips a signed token', () => {
  const issuer = pemIssuer();
  const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'KNX-TKT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ sub: 'owner-1' })).toString('base64url');
  const input = `${header}.${claims}`;
  const token = `${input}.${signData(issuer.privateKey, input)}`;

  const parsed = verifyCompactJws(issuer.publicKey, token);
  assert.ok(parsed);
  assert.equal(parsed.header.alg, 'EdDSA');
  assert.equal(parsed.claims.sub, 'owner-1');
});

test('verifyCompactJws returns null for a malformed or unsigned token', () => {
  const issuer = pemIssuer();
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ sub: 'x' })).toString('base64url');
  assert.equal(verifyCompactJws(issuer.publicKey, `${header}.${claims}.`), null);
  assert.equal(verifyCompactJws(issuer.publicKey, 'one.two'), null);
  assert.equal(verifyCompactJws(issuer.publicKey, 'a.b.c'), null);
});

test('fingerprintPublicKey is stable and key-specific', () => {
  const a = pemIssuer();
  const b = pemIssuer();
  const fpA = fingerprintPublicKey(createPublicKey(a.publicKey));
  assert.match(fpA, /^[0-9a-f]{64}$/);
  assert.equal(fingerprintPublicKey(createPublicKey(a.publicKey)), fpA);
  assert.notEqual(fingerprintPublicKey(createPublicKey(b.publicKey)), fpA);
});

test('newJti does not repeat', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(newJti());
  assert.equal(seen.size, 500);
});

// ---------------------------------------------------------------------------
// Ticket minting
// ---------------------------------------------------------------------------

test('claims carry the audience, subject and a 60 second lifetime', () => {
  const now = 1_700_000_000;
  const claims = buildTicketClaims({
    userId: 'owner-1',
    sid: 'sid-1',
    scopes: ['fs:read'],
    bridgeId: BRIDGE_ID,
    now,
  });
  assert.equal(claims.aud, BRIDGE_ID);
  assert.equal(claims.sub, 'owner-1');
  assert.equal(claims.iat, now);
  assert.equal(claims.exp, now + 60);
  assert.equal(claims.iss, 'knoux-bff');
  assert.deepEqual(claims.scope, ['fs:read']);
});

test('a requested lifetime longer than 60 seconds is clamped', () => {
  const now = 1_700_000_000;
  const claims = buildTicketClaims({
    userId: 'o', sid: 's', scopes: ['fs:read'], bridgeId: BRIDGE_ID,
    ttlSeconds: 86400, now,
  });
  assert.equal(claims.exp, now + 60, 'the lifetime ceiling must hold');
});

test('cwd and profile are omitted when not requested', () => {
  const claims = buildTicketClaims({
    userId: 'o', sid: 's', scopes: ['terminal:open'], bridgeId: BRIDGE_ID, now: 1,
  });
  assert.equal('cwd' in claims, false);
  assert.equal('profile' in claims, false);

  const withBoth = buildTicketClaims({
    userId: 'o', sid: 's', scopes: ['terminal:open'], bridgeId: BRIDGE_ID,
    cwd: '/workspace', profile: 'pwsh', now: 1,
  });
  assert.equal(withBoth.cwd, '/workspace');
  assert.equal(withBoth.profile, 'pwsh');
});

test('a minted ticket verifies against the issuer public key', () => {
  const issuer = pemIssuer();
  const keys = keyDescriptorFor(issuer);
  const token = mintTicket(
    { userId: 'owner-1', sid: 'sid-1', scopes: ['fs:read'], bridgeId: BRIDGE_ID },
    keys,
  );

  const [headerB64, claimsB64] = token.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  assert.equal(header.alg, 'EdDSA');
  assert.equal(header.typ, 'KNX-TKT');
  assert.equal(header.kid, keys.fingerprint.slice(0, 16));

  // The signature covers exactly header.payload.
  assert.equal(
    verify(null, Buffer.from(`${headerB64}.${claimsB64}`, 'utf8'), issuer.publicKey,
      Buffer.from(token.split('.')[2], 'base64url')),
    true,
  );

  const parsed = verifyCompactJws(issuer.publicKey, token);
  assert.ok(parsed);
  assert.deepEqual(parsed.claims.scope, ['fs:read']);
  assert.equal(validateTicketClaims(parsed.claims)?.aud, BRIDGE_ID);
});

test('each minted ticket has its own jti', () => {
  const issuer = pemIssuer();
  const keys = { publicKeyPem: issuer.publicKey, privateKeyPem: issuer.privateKey, fingerprint: 'a'.repeat(64) };
  const jtis = new Set();
  for (let i = 0; i < 100; i++) {
    const claims = buildTicketClaims({
      userId: 'o', sid: 's', scopes: ['fs:read'], bridgeId: BRIDGE_ID,
    });
    jtis.add(claims.jti);
  }
  assert.equal(jtis.size, 100);
  // And the signed forms differ too.
  const tokens = new Set();
  for (let i = 0; i < 20; i++) {
    tokens.add(mintTicket({ userId: 'o', sid: 's', scopes: ['fs:read'], bridgeId: BRIDGE_ID }, keys));
  }
  assert.equal(tokens.size, 20);
});

// ---------------------------------------------------------------------------
// Scopes
// ---------------------------------------------------------------------------

test('every declared scope is recognised by isBridgeScope', () => {
  for (const scope of BRIDGE_SCOPES) assert.equal(isBridgeScope(scope), true);
  for (const bogus of ['', 'fs:everything', 'terminal:open ', 'FS:READ', null, 42, {}]) {
    assert.equal(isBridgeScope(bogus), false, `expected ${JSON.stringify(bogus)} to be rejected`);
  }
});

test('a write action carries the read scope it depends on', () => {
  for (const action of ['fs:write', 'fs:delete', 'git:write', 'proc:manage']) {
    const scopes = scopesForAction(action);
    assert.ok(scopes.includes('fs:read') || scopes.includes('git:read') || scopes.includes('proc:list'),
      `${action} must include a read scope`);
  }
});

test('a terminal action includes the input scope it needs', () => {
  assert.deepEqual(scopesForAction('terminal:open'), ['terminal:open', 'terminal:input']);
});

test('an unknown action falls back to the least privilege', () => {
  assert.deepEqual(scopesForAction('nonsense'), ['fs:read']);
});

test('every scope a mapping returns is a real scope', () => {
  for (const action of ['terminal:open', 'fs:read', 'fs:write', 'fs:delete', 'git:read', 'git:write', 'exec:run', 'proc:list', 'proc:manage', 'metrics:read', 'logs:read']) {
    for (const scope of scopesForAction(action)) {
      assert.ok(BRIDGE_SCOPES.includes(scope), `${action} produced unknown scope ${scope}`);
    }
  }
});

test('no action grants command.arbitrary-equivalent access', () => {
  // There is no scope for arbitrary commands at all, which is the point.
  const all = BRIDGE_SCOPES.join(' ');
  assert.doesNotMatch(all, /arbitrary|exec:any|shell/);
});

// ---------------------------------------------------------------------------
// Claims validation
// ---------------------------------------------------------------------------

test('validateTicketClaims accepts a well-formed claim set', () => {
  const claims = buildTicketClaims({
    userId: 'o', sid: 's', scopes: ['fs:read'], bridgeId: BRIDGE_ID, now: 1,
  });
  assert.ok(validateTicketClaims(claims));
});

test('validateTicketClaims rejects malformed claim sets', () => {
  const base = buildTicketClaims({
    userId: 'o', sid: 's', scopes: ['fs:read'], bridgeId: BRIDGE_ID, now: 1,
  });
  const cases = [
    { ...base, iss: 5 },
    { ...base, aud: null },
    { ...base, sub: undefined },
    { ...base, sid: 7 },
    { ...base, jti: {} },
    { ...base, iat: 'now' },
    { ...base, exp: 'later' },
    { ...base, scope: 'fs:read' },
    { ...base, scope: ['fs:invented'] },
    null,
    'a string',
    42,
  ];
  for (const claims of cases) {
    assert.equal(validateTicketClaims(claims), null, `expected ${JSON.stringify(claims)} to be rejected`);
  }
});