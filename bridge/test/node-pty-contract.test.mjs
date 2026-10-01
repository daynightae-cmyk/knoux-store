/**
 * node-pty dependency-contract guard.
 *
 * The bridge works around two ConPTY handle leaks in node-pty 1.1.0 by reaching
 * into private internals: `_agent.inSocket` and
 * `_agent._conoutSocketWorker._worker`. See CONPTY-HANDLES.md for the
 * measurements and the node-pty source lines.
 *
 * That creates a silent-failure risk the runtime guards cannot cover. The
 * production helpers in `src/pty/spawn.ts` are deliberately defensive: if the
 * private shape disappears they become no-ops, which is right for a running
 * bridge and useless for verification. A future node-pty release could rename or
 * restructure those internals, the helpers would quietly stop working, and the
 * original leak would return with every green test in the suite.
 *
 * So the split is deliberate:
 *
 *   runtime  — defensive. Optional chaining, existence checks, try/catch. A
 *              dependency change must never crash the bridge.
 *   this test — loud. If the contract the workaround depends on is gone, this
 *              fails with a message naming the workaround.
 *
 * Nothing in this file silently skips. Every check either passes or fails; there
 * is no `if (!agent) return`.
 *
 * Windows-only. On other platforms the ConPTY workaround does not apply — the
 * POSIX code path uses `process.kill(-pid)` and a pty(3) handle — so the suite
 * is skipped there as a whole rather than half-asserted.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { discoverProfiles } from '../dist/pty/profiles.js';
import {
  spawnPty, releaseConptyInputSocket, releaseConptyDrainWorker,
} from '../dist/pty/spawn.js';

const require = createRequire(import.meta.url);
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The exact node-pty version the ConPTY workaround was written against. */
const EXPECTED_NODE_PTY_VERSION = '1.1.0';

/**
 * Message used everywhere the contract is found broken, so the cause is never
 * ambiguous from a failure line alone.
 */
const CONTRACT_BROKEN =
  'node-pty internal compatibility contract changed; review the KNOuX ConPTY ' +
  'cleanup workaround before upgrading node-pty.';

/** Handles that are not this process's own stdio, i.e. node-pty's. */
function foreignSockets() {
  return (process._getActiveHandles?.() ?? []).filter(
    (handle) => handle?.constructor?.name === 'Socket' && handle.fd === undefined,
  );
}

/**
 * Sockets that are still writable and not destroyed.
 *
 * This is the shape the ConPTY leak had: a writable handle on the conin pipe
 * that nothing ever closed.
 */
function liveForeignSockets() {
  return foreignSockets().filter(
    (socket) => socket.destroyed !== true && socket.writable !== false,
  );
}

/**
 * Wait until the foreign handle count reaches `target` and stays there.
 *
 * node-pty closes `outSocket` from its own socket `close` event, so a sample
 * taken at a fixed delay races that teardown: the same code can read 1 on one run
 * and 0 on the next with no change in behaviour. Measured decay after `kill()` is
 * 2 → 1 → 0 over about a second, so the transient is real and a fixed sleep is
 * not a measurement.
 *
 * The target is 0 because that is the only correct steady state for this code. A
 * handle that never reaches it is the leak, which is exactly the failure these
 * tests exist to catch.
 */
async function waitForNoForeignSockets(label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let peak = 0;

  while (Date.now() < deadline) {
    const count = foreignSockets().length;
    if (count > peak) peak = count;

    // Require two consecutive clean samples, so a momentary dip mid-teardown is
    // not mistaken for the settled state.
    if (count === 0) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (foreignSockets().length === 0) return peak;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(
    `${foreignSockets().length} foreign socket(s) still open ${timeoutMs}ms after ${label} ` +
    `(peak ${peak}): ${JSON.stringify(foreignSockets().map((s) => ({ fd: s._handle?.fd, readyState: s.readyState })))}. ` +
    CONTRACT_BROKEN,
  );
}

/** The ConPTY drain worker's MessagePort, if the pty still has one. */
function workerMessagePorts() {
  return (process._getActiveHandles?.() ?? []).filter(
    (handle) => handle?.constructor?.name === 'MessagePort',
  );
}

/**
 * The node-pty process behind a PtyInstance.
 *
 * This is exactly the value `spawnPty` passes to the release helpers, so the
 * helper assertions exercise the same object production does. Each returns null
 * when the path is absent, and every caller asserts on that null — no test
 * treats a missing field as a pass.
 */
function nativeOf(ptyInstance) {
  return ptyInstance?.native ?? null;
}

function agentOf(ptyInstance) {
  return nativeOf(ptyInstance)?._agent ?? null;
}

function inSocketOf(ptyInstance) {
  return agentOf(ptyInstance)?.inSocket ?? null;
}

function drainWorkerOf(ptyInstance) {
  return agentOf(ptyInstance)?._conoutSocketWorker?._worker ?? null;
}

/**
 * Await a condition, polling. Used instead of a fixed sleep wherever the point
 * is "the lifecycle reached a state", so the assertions do not race the spawn.
 */
async function waitFor(predicate, { timeoutMs = 10_000, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${label} after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// Windows-only: the workaround is ConPTY-specific. Skipped as a unit elsewhere.
describe('node-pty ConPTY compatibility contract', { skip: process.platform !== 'win32' ? 'ConPTY workaround applies to Windows only' : false }, () => {
  let root;
  let profile;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'knx-contract-'));
    profile = discoverProfiles().find((p) => p.id === 'cmd')
      ?? discoverProfiles()[0];
    assert.ok(profile, CONTRACT_BROKEN);
  });

  after(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Declared and installed version
  // -------------------------------------------------------------------------

  test('the declared node-pty range is an exact pin', () => {
    const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
    const declared = manifest.dependencies?.['node-pty'];

    assert.equal(
      declared,
      EXPECTED_NODE_PTY_VERSION,
      `node-pty must be pinned exactly to ${EXPECTED_NODE_PTY_VERSION} because the ConPTY ` +
      `cleanup workaround depends on that version's private internals; found "${declared}". ` +
      CONTRACT_BROKEN,
    );
  });

  test('the installed node-pty is the version the workaround was written for', () => {
    const installed = require('node-pty/package.json').version;

    assert.equal(
      installed,
      EXPECTED_NODE_PTY_VERSION,
      `installed node-pty is ${installed}, but the ConPTY cleanup workaround was written ` +
      `against ${EXPECTED_NODE_PTY_VERSION}. ${CONTRACT_BROKEN}`,
    );
  });

  test('the lockfile resolves node-pty to the same version as the manifest', () => {
    const lock = JSON.parse(readFileSync(join(packageRoot, 'package-lock.json'), 'utf8'));
    const resolved = lock.packages?.['node_modules/node-pty']?.version;

    assert.equal(
      resolved,
      EXPECTED_NODE_PTY_VERSION,
      `the lockfile resolves node-pty to ${resolved}, which does not match the pinned ` +
      `${EXPECTED_NODE_PTY_VERSION}. Re-run npm install. ${CONTRACT_BROKEN}`,
    );
  });

  // -------------------------------------------------------------------------
  // The private shape the workaround depends on
  // -------------------------------------------------------------------------

  test('a live pty exposes _agent, the path the workaround walks', async () => {
    const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: 'contract' });

    try {
      // Lifecycle-aware: `_agent` is assigned during construction, but asserting
      // on a pty that has not finished spawning would race it.
      const agent = await waitFor(() => agentOf(pty), { label: '_agent to exist' });

      assert.equal(
        typeof agent,
        'object',
        `pty._agent is ${typeof agent}, expected an object. ${CONTRACT_BROKEN}`,
      );
    } finally {
      pty.kill();
    }
  });

  test('a live pty exposes _agent.inSocket with a destroy method', async () => {
    const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: 'contract' });

    try {
      const socket = await waitFor(() => inSocketOf(pty), { label: '_agent.inSocket to exist' });

      assert.equal(
        typeof socket.destroy,
        'function',
        '_agent.inSocket has no destroy(); releaseConptyInputSocket would silently no-op. ' +
        CONTRACT_BROKEN,
      );
      // The socket is constructed from an fd on the ConPTY conin pipe, so it is
      // writable. A readable socket would mean the shape changed.
      assert.equal(
        socket.writable,
        true,
        `_agent.inSocket is not writable (writable=${socket.writable}); the leak being ` +
        `guarded is an open write handle on the conin pipe. ${CONTRACT_BROKEN}`,
      );
      assert.equal(
        socket.destroyed,
        false,
        `_agent.inSocket is already destroyed at spawn, which is not the state the ` +
        `workaround was written for. ${CONTRACT_BROKEN}`,
      );
    } finally {
      pty.kill();
    }
  });

  test('a live pty exposes _agent._conoutSocketWorker._worker with terminate()', async () => {
    const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: 'contract' });

    try {
      const worker = await waitFor(() => drainWorkerOf(pty), {
        label: '_agent._conoutSocketWorker._worker to exist',
      });

      // The worker is a real Worker thread: node-pty builds it to drain the
      // ConPTY output pipe off the main thread.
      assert.equal(
        worker.constructor?.name,
        'Worker',
        `_conoutSocketWorker._worker is a ${worker.constructor?.name}, not a Worker. ` +
        `${CONTRACT_BROKEN}`,
      );
      assert.equal(
        typeof worker.terminate,
        'function',
        '_conoutSocketWorker._worker has no terminate(); releaseConptyDrainWorker would ' +
        `silently no-op and worker threads would leak. ${CONTRACT_BROKEN}`,
      );
      assert.equal(
        typeof worker.threadId,
        'number',
        '_conoutSocketWorker._worker has no threadId, so it is not a Worker; ' +
        `${CONTRACT_BROKEN}`,
      );
    } finally {
      pty.kill();
    }
  });

  // -------------------------------------------------------------------------
  // The workaround still releases what it claims to
  // -------------------------------------------------------------------------

  test('releaseConptyInputSocket reports releasing a live input socket', async () => {
    const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: 'contract' });

    try {
      const socket = await waitFor(() => inSocketOf(pty), { label: '_agent.inSocket to exist' });
      assert.equal(socket.destroyed, false, `${CONTRACT_BROKEN} socket already destroyed before kill`);

      const released = releaseConptyInputSocket(nativeOf(pty));

      assert.equal(
        released,
        true,
        'releaseConptyInputSocket returned false for a live input socket; the helper ' +
        `and the private shape have diverged. ${CONTRACT_BROKEN}`,
      );
      assert.equal(socket.destroyed, true, 'the socket was not actually destroyed');
    } finally {
      pty.kill();
    }
  });

  test('releaseConptyDrainWorker reports releasing a live drain worker', async () => {
    const portsBefore = workerMessagePorts().length;
    const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: 'contract' });

    try {
      await waitFor(() => drainWorkerOf(pty), { label: 'drain worker to exist' });
      // The live worker is what holds a MessagePort; without this the count
      // assertion below could pass for the wrong reason.
      await waitFor(() => workerMessagePorts().length > portsBefore, {
        label: 'the drain worker MessagePort to appear',
      });

      const released = releaseConptyDrainWorker(nativeOf(pty));

      assert.equal(
        released,
        true,
        'releaseConptyDrainWorker returned false for a live drain worker; the helper ' +
        `and the private shape have diverged. ${CONTRACT_BROKEN}`,
      );

      await waitFor(() => workerMessagePorts().length <= portsBefore, {
        label: 'the worker MessagePort to be released',
      });
    } finally {
      pty.kill();
    }
  });

  test('a released input socket leaves no handle behind', async () => {
    const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: 'contract' });

    try {
      await waitFor(() => inSocketOf(pty), { label: '_agent.inSocket to exist' });
      releaseConptyInputSocket(nativeOf(pty));

      // A destroyed socket leaves the handle list on its own tick.
      await waitFor(() => inSocketOf(pty).destroyed === true, { label: 'socket destruction' });
    } finally {
      pty.kill();
    }

    await waitForNoForeignSockets('the released input socket');

    assert.equal(
      liveForeignSockets().length,
      0,
      'a destroyed input socket must not remain as a writable foreign handle. ' +
      CONTRACT_BROKEN,
    );
  });

  // -------------------------------------------------------------------------
  // The leak does not come back
  // -------------------------------------------------------------------------

  test('six sequential sessions leave no accumulating foreign socket', async () => {
    // The historical failure was 1 → 2 → 3 → 4 surviving writable sockets, one
    // per session and never released. This is the regression proof: after N
    // sessions the steady-state count must be 0, not N.
    //
    // The count is taken after the handle set settles rather than at a fixed
    // delay. node-pty closes `outSocket` from its own close event, so a sample
    // taken mid-teardown can read 1 with no leak present; the accumulating bug
    // shows up regardless of when it is sampled.
    const sessions = 6;
    const peaksPerSession = [];

    for (let i = 1; i <= sessions; i++) {
      const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: `leak-${i}` });
      pty.onData(() => {});
      pty.onExit(() => {});

      // Use it: a pty spawned and killed immediately would not exercise the same
      // socket state as one that has carried output.
      await new Promise((resolve) => setTimeout(resolve, 250));

      pty.kill();

      // Each session must return to zero before the next one starts. That is what
      // distinguishes a closed handle from an accumulating one: the historical
      // leak never returned to zero, so the second session began from 1, the third
      // from 2. waitForNoForeignSockets throws if it does not.
      const peak = await waitForNoForeignSockets(`session ${i} cleanup`);
      peaksPerSession.push(peak);
    }

    const survivors = liveForeignSockets();

    assert.equal(
      survivors.length,
      0,
      `after ${sessions} spawn/kill cycles, ${survivors.length} writable foreign socket(s) ` +
      `survive: ${JSON.stringify(survivors.map((s) => s._handle?.fd))}. Peaks per session: ` +
      `${JSON.stringify(peaksPerSession)}. The ConPTY socket leak has returned. ` +
      CONTRACT_BROKEN,
    );
  });

  test('a session that exits on its own is cleaned up through onExit', async () => {
    // Self-exit never reaches kill(), so the onExit wrapper is the only thing
    // that releases these handles. This is the path where the MessagePort leak
    // appeared.
    const portsBefore = workerMessagePorts().length;

    const pty = spawnPty({ profile, cwd: root, cols: 80, rows: 24, sessionId: 'self-exit' });
    const exited = new Promise((resolve) => pty.onExit(() => resolve()));

    await new Promise((resolve) => setTimeout(resolve, 400));
    pty.write('exit\r\n');

    await exited;

    // ConoutConnection.dispose() schedules its own 1s cleanup; the workaround
    // closes the port immediately, so the count should not grow.
    await waitFor(
      () => workerMessagePorts().length <= portsBefore,
      { timeoutMs: 6000, label: 'the drain worker port to be released' },
    );
  });
});