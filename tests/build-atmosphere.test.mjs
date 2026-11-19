import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypeScript } from './load.mjs';
const { activationPhase, seededRandom, lightningBranches, engineeringCue, cueAtmosphere, listenAtmosphere } = await loadTypeScript('../src/components/build/dev/living-atmosphere.ts');

test('activation has all four exact timing boundaries and terminates', () => {
  for (const [at, expected] of [[-1, null], [0, 'prepare'], [249, 'prepare'], [250, 'gather'], [699, 'gather'], [700, 'discharge'], [1499, 'discharge'], [1500, 'settle'], [4799, 'settle'], [4800, null]]) assert.equal(activationPhase(at), expected);
});
test('seeded storm geometry is reproducible but each event branches differently', () => {
  const first = seededRandom(), second = seededRandom();
  const a = lightningBranches(first), b = lightningBranches(first);
  assert.deepEqual(a, lightningBranches(second));
  assert.notDeepEqual(a, b);
  assert.equal(a.length, 4); assert.equal(a[0].length, 7);
  assert.ok(a.flat().every(point => point.length === 2 && point.every(n => Number.isFinite(n) && Math.abs(n) < 1)));
  assert.deepEqual(a.slice(1).map(path => path[0]), [a[0][2], a[0][3], a[0][5]]);
});
test('actual generation outcomes have distinct cues and review is not execution', () => {
  assert.equal(engineeringCue('RESOLVING'), 'wake');
  assert.equal(engineeringCue('GENERATING'), 'generation-start');
  assert.equal(engineeringCue('PLANNED'), 'success');
  assert.equal(engineeringCue('PROVIDER_BLOCKED'), 'error');
  assert.equal(engineeringCue('AGENT_UNAVAILABLE'), 'error');
  assert.equal(engineeringCue('CANCELLED'), 'cancel');
  assert.equal(engineeringCue('REVIEWING'), null);
  assert.equal(engineeringCue('UNKNOWN'), null);
});
test('rapid activation is coalesced for both consumers without swallowing results; unsubscribe works', t => {
  const oldWindow = globalThis.window;
  globalThis.window = new EventTarget();
  t.after(() => { globalThis.window = oldWindow; });
  let clock = 100000;
  t.mock.method(performance, 'now', () => clock);
  const seen = [], other = [];
  const stop = listenAtmosphere(cue => seen.push(cue));
  const stopOther = listenAtmosphere(cue => other.push(cue));
  cueAtmosphere('wake'); clock += 100; cueAtmosphere('wake'); cueAtmosphere('success'); cueAtmosphere('cancel');
  assert.deepEqual(seen, ['wake', 'success', 'cancel']); assert.deepEqual(other, seen);
  clock = 104800; cueAtmosphere('wake'); assert.equal(seen.at(-1), 'wake'); assert.equal(seen.length, 4);
  stop(); cueAtmosphere('error'); assert.equal(seen.length, 4); assert.equal(other.at(-1), 'error'); stopOther();
});
