import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../dist/pty/session.js';
import { DEFAULT_LIMITS } from '../dist/policy.js';

const LIMITS = { ...DEFAULT_LIMITS, maxSessions: 3, idleTimeoutMinutes: 30, detachTtlMinutes: 10 };

const PROFILE = { id: 'cmd', path: 'cmd.exe', version: 'unknown', args: [] };

/** A fake PTY. It records what the session asked the process to do. */
function fakePty(pid = 4242) {
  const state = { written: [], resizes: [], killed: false, killSignals: [] };
  return {
    state,
    pty: {
      pid,
      write: (data) => { state.written.push(data); },
      resize: (cols, rows) => { state.resizes.push([cols, rows]); },
      pause: () => {},
      resume: () => {},
      kill: (signal) => { state.killed = true; state.killSignals.push(signal ?? 'default'); },
      onData: () => {},
      onExit: () => {},
    },
  };
}

function manager(limits = LIMITS, ended = []) {
  return new SessionManager({ limits, onSessionEnd: (s) => ended.push(s) });
}

test('a new session starts attached and reports its pid', () => {
  const { pty } = fakePty(1234);
  const m = manager();
  const result = m.create(PROFILE, '/workspace', pty);
  assert.equal(result.ok, true);
  const session = result.session;
  assert.equal(session.pid, 1234);
  assert.equal(session.detachedAt, null);
  assert.equal(session.attachments, 1);
  assert.equal(session.seq, 0);
  m.dispose();
});

test('maxSessions is enforced by refusing, not by killing someone else', () => {
  const ended = [];
  const m = manager({ ...LIMITS, maxSessions: 2 }, ended);
  const a = fakePty(1), b = fakePty(2), c = fakePty(3);
  assert.equal(m.create(PROFILE, '/w', a.pty).ok, true);
  assert.equal(m.create(PROFILE, '/w', b.pty).ok, true);

  const third = m.create(PROFILE, '/w', c.pty);
  assert.equal(third.ok, false);
  assert.match(third.reason, /maximum/i);
  // No session was destroyed to make room.
  assert.equal(ended.length, 0);
  assert.equal(a.state.killed, false);
  assert.equal(b.state.killed, false);
  m.dispose();
});

test('output gets a monotonic seq and lands in the scrollback ring', () => {
  const { pty } = fakePty();
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);

  const first = m.appendOutput(session.id, 'a');
  const second = m.appendOutput(session.id, 'b');
  assert.equal(first.seq, 1);
  assert.equal(second.seq, 2);
  assert.equal(m.replay(session.id, 0).length, 2);
  m.dispose();
});

test('replay returns only frames after the requested seq', () => {
  const { pty } = fakePty();
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);
  m.appendOutput(session.id, 'one');
  m.appendOutput(session.id, 'two');
  m.appendOutput(session.id, 'three');

  assert.equal(m.replay(session.id, 0).length, 3);
  assert.equal(m.replay(session.id, 1).length, 2);
  assert.equal(m.replay(session.id, 2).length, 1);
  assert.equal(m.replay(session.id, 3).length, 0);
  m.dispose();
});

test('the scrollback ring is bounded by bytes and drops the oldest first', () => {
  const { pty } = fakePty();
  const m = manager({ ...LIMITS, scrollbackBytes: 100 });
  const { session } = m.create(PROFILE, '/w', pty);

  for (let i = 0; i < 20; i++) m.appendOutput(session.id, 'x'.repeat(20));

  const replayed = m.replay(session.id, 0);
  assert.ok(replayed.length <= 6, `ring held ${replayed.length} frames for a 100-byte budget`);
  assert.equal(session.scrollbackBytes <= 100, true);
  // The most recent output is the one retained.
  assert.equal(replayed[replayed.length - 1].seq, session.seq);
  m.dispose();
});

test('acknowledge tracks the highest confirmed seq and never moves backwards', () => {
  const { pty } = fakePty();
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);
  m.appendOutput(session.id, 'a');
  m.appendOutput(session.id, 'b');

  m.acknowledge(session.id, 2);
  assert.equal(session.ackedSeq, 2);
  m.acknowledge(session.id, 1);
  assert.equal(session.ackedSeq, 2);
  m.dispose();
});

test('input reaches the pty and is counted', () => {
  const { pty, state } = fakePty();
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);

  assert.equal(m.write(session.id, 'ls\r'), true);
  assert.deepEqual(state.written, ['ls\r']);
  assert.equal(session.bytesIn, 3);
  m.dispose();
});

test('resize is clamped to a usable terminal geometry', () => {
  const { pty, state } = fakePty();
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);

  m.resize(session.id, 5000, 9000);
  assert.deepEqual(state.resizes[0], [500, 200]);
  m.resize(session.id, 1, 1);
  assert.deepEqual(state.resizes[1], [20, 5]);
  m.dispose();
});

test('detach keeps the session and its pty alive for resume', () => {
  const { pty, state } = fakePty();
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);

  m.detach(session.id);
  assert.notEqual(session.detachedAt, null);
  assert.equal(m.get(session.id).id, session.id);
  assert.equal(state.killed, false);

  // Output produced while detached is still captured, so resume can replay it.
  m.appendOutput(session.id, 'while detached');
  m.attach(session.id);
  assert.equal(session.detachedAt, null);
  assert.equal(session.attachments, 2);
  assert.equal(m.replay(session.id, 0).length, 1);
  m.dispose();
});

test('kill ends the session, kills the pty and reports the reason', () => {
  const { pty, state } = fakePty();
  const ended = [];
  const m = manager(LIMITS, ended);
  const { session } = m.create(PROFILE, '/w', pty);

  m.kill(session.id, 'client-close');
  assert.equal(state.killed, true);
  assert.equal(m.get(session.id), undefined);
  assert.equal(ended.length, 1);
  assert.equal(ended[0].killReason, 'client-close');

  // Killing again is a no-op rather than a double report.
  m.kill(session.id, 'client-close');
  assert.equal(ended.length, 1);
  m.dispose();
});

test('writing to a dead session returns false instead of throwing', () => {
  const { pty } = fakePty();
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);
  m.kill(session.id, 'test');

  assert.equal(m.write(session.id, 'x'), false);
  assert.equal(m.resize(session.id, 80, 24), false);
  assert.equal(m.appendOutput(session.id, 'x'), null);
  assert.deepEqual(m.replay(session.id, 0), []);
  m.dispose();
});

test('a pty that throws on write ends the session rather than leaking it', () => {
  const state = { killed: false };
  const brokenPty = {
    pid: 99,
    write: () => { throw new Error('pipe closed'); },
    resize: () => {},
    pause: () => {},
    resume: () => {},
    kill: () => { state.killed = true; },
    onData: () => {},
    onExit: () => {},
  };
  const ended = [];
  const m = manager(LIMITS, ended);
  const { session } = m.create(PROFILE, '/w', brokenPty);

  assert.equal(m.write(session.id, 'x'), false);
  assert.equal(state.killed, true);
  assert.equal(ended[0]?.killReason, 'write-failed');
  m.dispose();
});

test('killAll ends every session', () => {
  const ended = [];
  const m = manager(LIMITS, ended);
  m.create(PROFILE, '/w', fakePty(1).pty);
  m.create(PROFILE, '/w', fakePty(2).pty);

  m.killAll('shutdown');
  assert.equal(m.all().length, 0);
  assert.equal(ended.length, 2);
  m.dispose();
});

test('describe reports state without leaking output content', () => {
  const { pty } = fakePty(777);
  const m = manager();
  const { session } = m.create(PROFILE, '/w', pty);
  m.appendOutput(session.id, 'secret output that must not appear');

  const [entry] = m.describe();
  assert.equal(entry.id, session.id);
  assert.equal(entry.pid, 777);
  assert.equal(entry.profile, 'cmd');
  assert.equal(entry.detached, false);
  assert.equal(JSON.stringify(entry).includes('secret output'), false);
  m.dispose();
});