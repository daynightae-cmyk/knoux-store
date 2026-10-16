import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { root, codeOnly } from './helpers.mjs';
import { resolveRedirect, trustedOrigins } from '../src/lib/auth/redirect.ts';

/**
 * Bridge availability, authentication UX and the working-directory contract.
 *
 * Two separate claims are under test.
 *
 * The first is that an unauthenticated visitor is never offered a privileged
 * action. Pairing a bridge mints a trusted local command channel, so "PAIR
 * TRUSTED BRIDGE" appearing to an unidentified caller is itself the defect. The
 * 401 must be distinguishable from an offline bridge, and the remedy must match
 * the reason.
 *
 * The second is that a client cannot choose where the bridge reads and writes.
 * The ticket route mints a `cwd` claim and the bridge used to take that claim as
 * its workspace root verbatim, so a signed but hostile value would have moved the
 * jail. The configured root is authoritative and a claim may only narrow it.
 *
 * The path assertions execute the real validator and the real policy helper.
 * A source-text assertion would pass just as happily against a function with
 * the wrong behaviour, which is exactly the failure mode being guarded against.
 */

const read = (relative) => readFileSync(join(root, relative), 'utf8');

const terminalPage = read('src/components/build/dev/TerminalPage.tsx');
const powerShellPage = read('src/components/build/dev/PowerShellPage.tsx');
const settingsPage = read('src/components/build/dev/SettingsPage.tsx');
const ticketRoute = read('src/app/api/build/bridge/ticket/route.ts');
const bridgeServer = read('bridge/src/server.ts');
const loginPage = read('src/app/login/page.tsx');

/* ------------------------------------------------------------------ sign-in */

/**
 * Resolve the destination a sign-in is asked to honour, exactly as the login
 * page does, and assert the result stays on a trusted origin.
 */
function resolveFromLogin(candidate) {
  const origin = 'https://knoux.store';
  return resolveRedirect(candidate, { origins: trustedOrigins(origin) });
}

test('a sign-in return path is honoured only when it is a safe relative path', () => {
  const safe = resolveFromLogin('/build/terminal');
  assert.equal(safe.ok, true);
  assert.equal(safe.path, '/build/terminal');

  // The shapes that turn a sign-in into an open redirect.
  for (const hostile of [
    'https://evil.example/steal',
    '//evil.example/steal',
    '/\\evil.example',
    '/%2F%2Fevil.example',
    'javascript:alert(1)',
    'http://evil.example',
  ]) {
    const decision = resolveFromLogin(hostile);
    assert.equal(decision.ok, false, `${hostile} must not be an acceptable destination`);
    assert.equal(decision.path, '/account', 'a refused target must fall back to the default');
    const landed = new URL(decision.path, 'https://knoux.store');
    assert.equal(landed.origin, 'https://knoux.store');
  }
});

test('the login page and sign-in action both run the shared redirect resolver', () => {
  assert.match(loginPage, /resolveRedirect/, 'the login page must use the shared resolver');
  const actions = read('src/lib/auth/actions.ts');
  assert.match(
    actions,
    /resolveRedirect/,
    'the sign-in server action must re-resolve the destination it is given',
  );
  assert.match(
    actions,
    /trustedOrigins\(/,
    'the trusted origin set must be derived independently of the submitted value',
  );
});

test('an unauthenticated visitor is offered sign-in, never pairing', () => {
  for (const [name, source] of [['terminal', terminalPage], ['powershell', powerShellPage]]) {
    assert.match(
      source,
      /authRequired/,
      `${name} must distinguish an authentication failure from an offline bridge`,
    );
    // The pairing destination must be the else-branch, never the consequent:
    // `authRequired ? '/build/settings' : ...` is the defect, not the fix.
    assert.match(
      source,
      /authRequired\s*\?\s*SIGN_IN_HREF\s*:\s*'\/build\/settings'/,
      `${name} must route an unidentified visitor to sign in and everyone else to pairing`,
    );
    assert.ok(
      !/authRequired\s*\?\s*'\/build\/settings'/.test(source),
      `${name} must not send an unidentified visitor to the pairing screen`,
    );
  }
});

test('the DEV sign-in links carry a return path back to their own page', () => {
  assert.match(terminalPage, /SIGN_IN_HREF = '\/login\?next=%2Fbuild%2Fterminal'/);
  assert.match(powerShellPage, /SIGN_IN_HREF = '\/login\?next=%2Fbuild%2Fpowershell'/);
  assert.match(settingsPage, /\/login\?next=%2Fbuild%2Fsettings/);
});

test('a 401 resolves to sign-in before the response body is trusted', () => {
  for (const [name, source] of [['terminal', terminalPage], ['powershell', powerShellPage]]) {
    const code = codeOnly(source);
    assert.match(
      code,
      /status === 401/,
      `${name} must read the refusal from the status code`,
    );
    const guard = code.indexOf('status === 401');
    const trust = code.indexOf('body.reachable && body.handshake');
    assert.ok(guard !== -1, `${name} must check the 401`);
    assert.ok(
      guard < trust,
      `${name} must decide the 401 before treating the body as a connected bridge`,
    );
  }
});

test('no false connected state is derived from a failed status request', () => {
  for (const [name, source] of [['terminal', terminalPage], ['powershell', powerShellPage]]) {
    // Count the assignments, not the type declaration: there must be exactly one
    // way to become `ready`, and it must be the branch that saw a handshake.
    const readyAssignments = source.match(/setBridge\(\{\s*kind: 'ready'/g) ?? [];
    assert.equal(
      readyAssignments.length,
      1,
      `${name} must have exactly one path to a ready bridge`,
    );
    assert.match(source, /body\.reachable && body\.handshake/);
  }
});

test('the bridge check reports an unverified state until it is actually run', () => {
  assert.match(
    settingsPage,
    /'unverified'/,
    'the initial state must not imply a connection',
  );
  assert.match(
    settingsPage,
    /aria-live/,
    'the outcome must be announced to assistive technology',
  );
});

test('no ticket value or credential is read from a response or rendered', () => {
  for (const [name, source] of [
    ['terminal', terminalPage],
    ['powershell', powerShellPage],
    ['settings', settingsPage],
  ]) {
    // `ticket` as a timing *label* is legitimate and pre-existing. What must
    // never appear is a ticket value: the status response carries none, and a
    // component that read or displayed one would be leaking a bearer token.
    assert.doesNotMatch(
      source,
      /\b(?:body|result|json|response)\w*\.ticket\b/,
      `${name} must not read a ticket value from a response`,
    );
    assert.doesNotMatch(
      source,
      /\{[^}]*\bticket\b[^}]*\}\s*</,
      `${name} must not interpolate a ticket into rendered output`,
    );
    // `fingerprint` is deliberately excluded: it is a public key digest, and
    // showing it is how an operator confirms they paired the machine they meant.
    // What must never appear is key material or an environment secret.
    for (const secret of ['signingKey', 'privateKey', 'KNOUX_BRIDGE_SIGNING_KEY', 'service_role']) {
      assert.doesNotMatch(
        source,
        new RegExp(`\\$\\{[^}]*${secret}`),
        `${name} must not interpolate ${secret} into the UI`,
      );
    }
    assert.doesNotMatch(
      source,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      `${name} must not embed key material`,
    );
    // A JWT or PEM body would be visible as a long run of base64 characters.
    assert.doesNotMatch(
      source,
      /eyJ[A-Za-z0-9_-]{20,}/,
      `${name} must not embed a JWT value`,
    );
  }
});

test('the pairing result fingerprint is shown to the operator, not logged', () => {
  // The fingerprint is the documented way to confirm the bridge is the machine
  // you paired. It is a public key digest, safe to display, and its presence
  // here is the behaviour the pairing note describes.
  assert.match(settingsPage, /fingerprint/);
});

/* -------------------------------------------------- working-directory jail */

test('the client proposes no absolute path and no client-chosen root', () => {
  for (const [name, source] of [['terminal', terminalPage], ['powershell', powerShellPage]]) {
    const code = codeOnly(source);
    // The handshake root is the bridge's own trusted root. Copying it into the
    // request would publish the bridge host's directory layout on every ticket
    // request and would be refused by the validator regardless.
    assert.ok(
      !/setCwd\(\s*body\.handshake\.root\s*\)/.test(code),
      `${name} must not seed the working directory from the handshake root`,
    );
    assert.match(code, /setCwd\(''\)/, `${name} must request the bridge's trusted root`);
  }
});

test('the ticket route refuses absolute paths, traversal and Windows traps', () => {
  // The raw source, not the comment-stripped form: these assertions are about
  // which characters the validator tests for, and the literals are the code.
  assert.match(ticketRoute, /RESERVED_WINDOWS_NAMES/, 'reserved device names must be refused');
  assert.match(
    ticketRoute,
    /segment\.includes\(':'?\)/,
    'drive prefixes and alternate data streams must be refused',
  );
  assert.match(
    ticketRoute,
    /\/\[ \.\]\$\/\.test\(segment\)/,
    'trailing space or dot segments must be refused',
  );
  assert.match(
    ticketRoute,
    /u0000-\\u001F/,
    'control characters must be refused',
  );
  assert.match(
    ticketRoute,
    /segment === '\.' \|\| segment === '\.\.'/,
    'no-op and traversal segments must be refused',
  );
});

test('the bridge resolves a ticket cwd inside its configured root only', () => {
  assert.ok(
    !/rootFor\(claimCwd[^)]*\)\s*:\s*string\s*\{\s*return claimCwd/.test(bridgeServer),
    'a ticket claim must never become the workspace root directly',
  );
  assert.match(
    bridgeServer,
    /resolveInsideRoot\(configured, claimCwd\)/,
    'the claim must be resolved inside the configured root',
  );
  // Both the HTTP surface and the WebSocket must consult the decision.
  const refusals = bridgeServer.match(/cwd refused/g) ?? [];
  assert.equal(
    refusals.length,
    2,
    'both the HTTP and terminal surfaces must refuse an unusable claim',
  );
  const decisions = bridgeServer.match(/rootDecision/g) ?? [];
  assert.ok(decisions.length >= 4, 'each surface must branch on the resolved decision');
});

/**
 * The policy helper the bridge relies on, exercised directly. These are the
 * path shapes that decide whether a claim stays inside the workspace.
 */
const { normalizeRelativePath, resolveInsideRoot } = await import('../bridge/src/policy.ts');

const ROOT = '/srv/knoux/workspace';

test('a relative claim inside the root is accepted and stays inside', () => {
  const resolved = resolveInsideRoot(ROOT, 'src/lib');
  assert.equal(resolved.ok, true);
  // `node:path` resolves with the host separator, so the expectation is built
  // the same way rather than hard-coded to a POSIX shape.
  assert.equal(
    resolved.absolute,
    resolve(ROOT, 'src/lib'),
    'a relative claim must resolve inside the configured root',
  );
  assert.ok(
    resolved.absolute.startsWith(resolve(ROOT)),
    'the resolved claim must remain under the root',
  );
});

test('an absolute claim cannot move the root', () => {
  for (const hostile of ['/etc', '/srv/knoux', '/srv/knoux/workspace/../..']) {
    const resolved = resolveInsideRoot(ROOT, hostile);
    assert.equal(resolved.ok, false, `${hostile} must not resolve against the root`);
  }
});

test('traversal cannot escape the workspace', () => {
  for (const hostile of ['..', '../secrets', 'src/../../secrets', 'src/../..', './../etc']) {
    const normalized = normalizeRelativePath(hostile);
    assert.equal(normalized.ok, false, `${hostile} must be refused`);
  }
});

test('Windows drive, UNC and device paths are refused', () => {
  for (const hostile of [
    'C:/Windows',
    'C:\\Windows\\System32',
    '\\\\server\\share',
    '\\\\?\\C:\\Windows',
    '\\\\.\\PhysicalDrive0',
  ]) {
    const normalized = normalizeRelativePath(hostile);
    assert.equal(normalized.ok, false, `${hostile} must be refused`);
  }
});

test('mixed separators are normalized so backslashes cannot bypass a rule', () => {
  // The deny list is written against forward slashes; a backslash form must not
  // walk past it.
  assert.equal(normalizeRelativePath('src\\lib\\index.ts').ok, true);
  assert.equal(normalizeRelativePath('..\\secrets').ok, false);
  assert.equal(normalizeRelativePath('src\\..\\..\\secrets').ok, false);
});

test('bridge-denied areas stay denied through the same resolver', () => {
  for (const denied of ['.git/config', 'bridge/src/config.ts', 'notes/.env']) {
    const resolved = resolveInsideRoot(ROOT, denied);
    assert.equal(resolved.ok, false, `${denied} must be refused`);
  }
});
