/**
 * The bridge's own copies of its public types must not drift from the bridge
 * service's. A mismatch here means the BFF would reject or misread a real
 * response — a runtime failure with no compile-time warning, because the two
 * sides are separate packages.
 *
 * Rather than importing across the boundary (which would make the web build
 * depend on node-pty and a compiled bridge), the shared declarations are parsed
 * from both sources and compared.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTypeScript } from './load.mjs';
import { root, codeOnly } from './helpers.mjs';

const bridgeProtocol = readFileSync(join(root, 'bridge', 'src', 'protocol.ts'), 'utf8');
const bffProtocol = readFileSync(join(root, 'src', 'lib', 'build', 'bridge-protocol.ts'), 'utf8');

const bff = await loadTypeScript('../src/lib/build/bridge-protocol.ts');

/** Extract the members of an exported string-literal union. */
function scopeList(source) {
  const match = source.match(/BRIDGE_SCOPES\s*=\s*\[([\s\S]*?)\]\s+as const/);
  assert.ok(match, 'BRIDGE_SCOPES must be a const array in both files');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/** Extract the members of an exported string-literal union type. */
function unionMembers(source, typeName) {
  const match = source.match(new RegExp(`export type ${typeName} =([\\s\\S]*?);`));
  assert.ok(match, `${typeName} must be a union type in both files`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('the scope set is identical on both sides', () => {
  assert.deepEqual(scopeList(bffProtocol), scopeList(bridgeProtocol));
});

test('the scope set is the same order on both sides', () => {
  // Order is not semantically required, but a stable order keeps a diff between
  // the two files meaningful instead of showing a whole-list change.
  assert.equal(scopeList(bffProtocol).join(','), scopeList(bridgeProtocol).join(','));
});

test('the shell profile set is identical on both sides', () => {
  assert.deepEqual(unionMembers(bffProtocol, 'ShellProfile'), unionMembers(bridgeProtocol, 'ShellProfile'));
});

test('the terminal client frame union matches', () => {
  const strip = (source) => {
    const match = source.match(/export type TerminalClientFrame =([\s\S]*?);/);
    assert.ok(match, 'TerminalClientFrame must be declared in both files');
    return [...match[1].matchAll(/\{\s*t:\s*'([^']+)'/g)].map((m) => m[1]);
  };
  assert.deepEqual(strip(bffProtocol), strip(bridgeProtocol));
});

test('the terminal server frame union matches', () => {
  const strip = (source) => {
    const match = source.match(/export type TerminalServerFrame =([\s\S]*?);/);
    assert.ok(match, 'TerminalServerFrame must be declared in both files');
    return [...match[1].matchAll(/\{\s*t:\s*'([^']+)'/g)].map((m) => m[1]);
  };
  assert.deepEqual(strip(bffProtocol), strip(bridgeProtocol));
});

test('the metrics shape matches, including which fields are nullable', () => {
  const fields = (source) => {
    const match = source.match(/export interface MetricsSample \{([\s\S]*?)\n\}/);
    assert.ok(match, 'MetricsSample must be declared in both files');
    const out = new Map();
    for (const line of match[1].split('\n')) {
      const field = line.match(/^\s*(\w+)(\??):\s*(.+?);$/);
      if (field) out.set(field[1], field[3].replace(/\s*\| null/g, '| null'));
    }
    return out;
  };

  const bffFields = fields(bffProtocol);
  const bridgeFields = fields(bridgeProtocol);

  assert.deepEqual([...bffFields.keys()], [...bridgeFields.keys()], 'field names must match');
  for (const [name, type] of bffFields) {
    const bffNullable = type.includes('| null');
    const bridgeNullable = bridgeFields.get(name).includes('| null');
    assert.equal(bffNullable, bridgeNullable,
      `${name} must be nullable on both sides — a BFF that assumes a number where the bridge sends null is a crash at runtime`);
  }
});

test('a field typed as a plain number on one side and nullable on the other is a defect', () => {
  // Asserted explicitly so the failure reads as the bug it is, rather than as a
  // generic shape mismatch.
  const bridgeNullable = /cpuPercent\??:\s*number\s*\|\s*null/.test(bridgeProtocol);
  const bffNullable = /cpuPercent\??:\s*number\s*\|\s*null/.test(bffProtocol);
  assert.equal(bridgeNullable, bffNullable);

  const bridgeNet = /networkRxBytesPerSec\??:\s*number\s*\|\s*null/.test(bridgeProtocol);
  const bffNet = /networkRxBytesPerSec\??:\s*number\s*\|\s*null/.test(bffProtocol);
  assert.equal(bridgeNet, bffNet, 'network rates are null when unmeasurable on both sides');
});

test('the handshake field set matches', () => {
  const fields = (source) => {
    const match = source.match(/export interface Handshake \{([\s\S]*?)\n\}/);
    assert.ok(match, 'Handshake must be declared in both files');
    return [...match[1].split('\n')]
      .map((line) => line.match(/^\s*(\w+)\??:/))
      .filter(Boolean)
      .map((m) => m[1]);
  };
  assert.deepEqual(fields(bffProtocol), fields(bridgeProtocol));
});

test('validateTicketClaims agrees on a well-formed claim set', () => {
  const claims = {
    iss: 'knoux-bff',
    aud: 'bridge-1',
    sub: 'owner-1',
    sid: 'sid-1',
    scope: ['fs:read'],
    jti: 'jti-1',
    iat: 1,
    exp: 61,
  };
  assert.ok(bff.validateTicketClaims(claims));
  assert.equal(bff.validateTicketClaims({ ...claims, scope: ['nonsense'] }), null);
});

test('validateHandshake accepts what the bridge actually sends', () => {
  const handshake = {
    bridgeId: 'bridge-1',
    version: '0.1.0',
    hostname: 'host',
    platform: 'win32',
    arch: 'x64',
    nodeVersion: 'v24.0.0',
    user: 'me',
    elevated: false,
    root: '/w',
    profiles: [],
    capabilities: {},
    maxSessions: 3,
    idleTimeoutMinutes: 30,
    maxLifetimeHours: 8,
    scrollbackBytes: 1,
    detachTtlMinutes: 10,
    allowlistedTasks: {},
    processProfiles: {},
    powershellVersion: null,
    executionPolicy: null,
    measuredAt: '2026-01-01T00:00:00.000Z',
  };
  assert.ok(bff.validateHandshake(handshake));
  assert.equal(bff.validateHandshake({ ...handshake, profiles: 'none' }), null);
  assert.equal(bff.validateHandshake(null), null);
});

test('neither protocol file imports anything', () => {
  // They are the shared contract; an import would make one side depend on the
  // other's toolchain.
  for (const [name, source] of [['bridge', bridgeProtocol], ['bff', bffProtocol]]) {
    const imports = codeOnly(source).match(/^\s*import\s.*$/gm) ?? [];
    assert.deepEqual(imports, [], `${name} protocol must have no imports`);
  }
});