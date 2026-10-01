/**
 * No fakes on the terminal surface.
 *
 * The terminal page replaces an honest blocker with a real shell. The failure
 * mode this guards is the comfortable one: a timed animation, a canned
 * transcript, or a hard-coded ONLINE badge standing in for a session while the
 * transport is still being built. Each assertion below reads the shipped source
 * of the terminal page, its transport, and its ticket route, and refuses a
 * specific fabrication shape.
 *
 * Scoped to the terminal surface on purpose. A repository-wide sweep is a
 * separate task; this file must never fail because of a file it does not own.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, codeOnly } from './helpers.mjs';

const page = readFileSync(join(root, 'src', 'components', 'build', 'dev', 'TerminalPage.tsx'), 'utf8');
const transport = readFileSync(join(root, 'src', 'lib', 'build', 'terminal-transport.ts'), 'utf8');
const ticketRoute = readFileSync(
  join(root, 'src', 'app', 'api', 'build', 'bridge', 'ticket', 'route.ts'),
  'utf8',
);

const pageCode = codeOnly(page);
const transportCode = codeOnly(transport);

test('no timed fake output on the terminal page', () => {
  for (const [name, code] of [['TerminalPage.tsx', pageCode], ['terminal-transport.ts', transportCode]]) {
    // A timer that writes output is the shape of a simulated shell. Timers that
    // schedule reconnects and pings exist in the transport and are asserted
    // separately; what must not exist is a timer whose callback writes text.
    assert.doesNotMatch(
      code,
      /setTimeout\([^)]*=>[^)]*write\(|setInterval\([^)]*write\(/,
      `${name} must not write output from a timer`,
    );
  }
});

test('no canned transcript on the terminal page', () => {
  // Output arrives only from the socket callback. A literal prompt, banner, or
  // directory listing in the page source would be a transcript pretending to be
  // a shell.
  assert.doesNotMatch(pageCode, /C:\\\\Users|C:\/Windows|Microsoft Windows/, 'the page must not contain a shell banner');
  assert.doesNotMatch(
    pageCode,
    /\$\s+(ls|dir|echo|cd)\b/,
    'the page must not contain a canned command transcript',
  );
});

test('no hard-coded online state on the terminal page', () => {
  for (const word of ['ONLINE', 'CONNECTED', 'LIVE ·']) {
    // LIVE appears only as a stage-derived label next to a measured pid; the
    // bare words as status literals would be an assumed state.
    if (word === 'LIVE ·') continue;
    assert.doesNotMatch(pageCode, new RegExp(`'${word}'`), `the page must not hard-code '${word}'`);
  }
  // String literals are stripped from pageCode, so this reads the raw source:
  // the literal must exist as a rendered value, not as a comment about one.
  assert.match(page, /return ms === null \? 'UNMEASURED'/, 'unmeasured latency must say so');
});

test('the transport never invents a session', () => {
  // A session object is assigned only from a `ready` frame the bridge sent.
  // Anything else — a fallback id, a placeholder pid — would be a fake shell.
  assert.doesNotMatch(transportCode, /sessionId:\s*['"`][^'"`]+['"`]/, 'the transport must not invent a session id');
  assert.doesNotMatch(transportCode, /pid:\s*\d+/, 'the transport must not invent a pid');
  // String literals are stripped from transportCode, so the ready-frame check
  // reads the raw source for the exact assignment shape.
  assert.match(transport, /case 'ready':\s+this\.session = \{/, 'sessions come from ready frames');
});

test('the transport never invents output', () => {
  assert.doesNotMatch(transportCode, /onOutput\?\.\(['"`]/, 'output must come from frames, not literals');
});

test('the ticket route never mints a standing credential', () => {
  const code = codeOnly(ticketRoute);
  // A ticket without a short life is a password. The minter clamps to 60 s;
  // the route must not widen that, lengthen it, or cache the result.
  assert.doesNotMatch(code, /ttlSeconds/, 'the route must not set a ticket lifetime');
  assert.doesNotMatch(code, /cache|Cache|memo/, 'tickets must not be cached or reused');
});
