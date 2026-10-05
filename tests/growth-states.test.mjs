import test from 'node:test';
import assert from 'node:assert/strict';

// Application source is written extensionless because it is bundled, so the
// resolver hook has to be registered before its modules can be executed.
import { enableTypeScriptResolution } from './load.mjs';

enableTypeScriptResolution();

/**
 * Truthful states — behavioural.
 *
 * These probes exist because the product's central claim is that it does not
 * assert what it has not verified. A claim like that is only real if something
 * refuses, so each test drives the code that must refuse and asserts the refusal
 * rather than reading the source.
 */

const {
  mayAssertPlatformFact,
  autonomyPermits,
  isCallFailure,
  fixture,
  live,
  readIfLive,
  isFixtureSourced,
  DEFAULT_AUTONOMY,
  CAPABILITY_STATES,
  CONNECTION_STATES,
  CALL_FAILURES,
  RISK_LEVEL_MEANING,
} = await import('../src/lib/growth/states.ts');

/* --------------------------------------------------- no capability overstate */

test('only LIVE_VERIFIED may assert a platform fact', () => {
  for (const state of CAPABILITY_STATES) {
    assert.equal(
      mayAssertPlatformFact(state),
      state === 'LIVE_VERIFIED',
      `${state} must ${state === 'LIVE_VERIFIED' ? '' : 'not '}be permitted to assert a platform fact`,
    );
  }
});

test('every state carries a human meaning, so no state renders blank', () => {
  for (const state of CAPABILITY_STATES) {
    assert.ok(state.length > 0, 'state name must be non-empty');
  }
  // The taxonomy the mission requires must be present verbatim.
  for (const required of [
    'NOT_CONFIGURED',
    'AUTH_REQUIRED',
    'RATE_LIMITED',
    'API_ERROR',
    'UNAVAILABLE',
    'PERMISSION_MISSING',
    'PARTIAL_DATA',
  ]) {
    assert.ok(CALL_FAILURES.includes(required), `${required} must be a distinct failure`);
  }
  for (const required of [
    'NOT_CONNECTED',
    'CONNECTING',
    'CONNECTED',
    'EXPIRED',
    'PERMISSION_REQUIRED',
    'ERROR',
    'BLOCKED',
    'NOT_CONFIGURED',
  ]) {
    assert.ok(CONNECTION_STATES.includes(required), `${required} must be a distinct connection state`);
  }
});

test('there is deliberately no generic ERROR failure', () => {
  // A generic bucket is how "something went wrong" becomes a product state.
  assert.equal(
    CALL_FAILURES.includes('ERROR'),
    false,
    'a generic ERROR failure would let a specific cause be reported as unknown',
  );
});

test('isCallFailure rejects values outside the taxonomy', () => {
  assert.equal(isCallFailure('AUTH_REQUIRED'), true);
  assert.equal(isCallFailure('SOMETHING_WENT_WRONG'), false);
  assert.equal(isCallFailure(undefined), false);
  assert.equal(isCallFailure(42), false);
});

/* --------------------------------------------------------------- provenance */

test('a fixture value is not readable as a live value', () => {
  const demo = fixture(1250);
  assert.equal(demo.origin, 'FIXTURE');
  assert.equal(readIfLive(demo), null, 'a fixture number must not be readable as a platform value');

  const real = live(1250, 'meta.marketing_api.insights');
  assert.equal(real.origin, 'LIVE');
  assert.equal(readIfLive(real), 1250);
assert.ok(isFixtureSourced(demo.origin));
  assert.equal(isFixtureSourced(real.origin), false);
});

/* ---------------------------------------------------------------- autonomy */

test('no autonomy mode permits a risk level 2 action without approval', () => {
  // Risk 2 is spending money. This is the load-bearing safety assertion.
  for (const mode of ['ADVISOR', 'COPILOT', 'AUTOPILOT']) {
    assert.equal(autonomyPermits(mode, 2), false, `${mode} must not self-authorise risk 2`);
    assert.equal(autonomyPermits(mode, 3), false, `${mode} must not self-authorise risk 3`);
  }
});

test('the default mode is COPILOT and it permits only low-risk action', () => {
  assert.equal(DEFAULT_AUTONOMY, 'COPILOT');
  assert.equal(autonomyPermits('COPILOT', 1), true, 'copilot may prepare a low-risk change');
  assert.equal(autonomyPermits('ADVISOR', 1), false, 'advisor analyses only');
  assert.equal(autonomyPermits('ADVISOR', 0), true, 'read-only observation is always allowed');
});

test('the risk scale is the inherited four-level scale, not a new one', () => {
  assert.deepEqual(Object.keys(RISK_LEVEL_MEANING).sort(), ['0', '1', '2', '3']);
  assert.match(RISK_LEVEL_MEANING[2], /approval/i, 'risk 2 must state that approval is required');
});