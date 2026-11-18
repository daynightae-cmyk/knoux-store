import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { root } from './helpers.mjs';

// Execute the shipped TSX and event bus, following build-os.test.mjs's loader.
// Hook/DOM shims expose effect replay and adversarial WebAudio promise ordering;
// they do not claim to simulate browser autoplay policy or audible quality.
function compile(path) {
  return ts.transpileModule(readFileSync(join(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}
const component = compile('src/components/build/dev/BuildSound.tsx');
const atmosphere = compile('src/components/build/dev/living-atmosphere.ts');

class Events {
  listeners = new Map();
  addEventListener(type, callback, options) {
    const entries = this.listeners.get(type) ?? new Map();
    entries.set(callback, options);
    this.listeners.set(type, entries);
  }
  removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
  dispatchEvent(event) {
    event.target ??= this;
    for (const [callback, options] of [...(this.listeners.get(event.type) ?? [])]) {
      if (options?.once) this.removeEventListener(event.type, callback);
      callback(event);
    }
    return true;
  }
  get listenerCount() { return [...this.listeners.values()].reduce((count, entries) => count + entries.size, 0); }
}
class DomEvent {
  constructor(type, options = {}) { Object.assign(this, { type, isTrusted: false, target: null }, options); }
}
class Pointer extends DomEvent {
  constructor(options = {}) { super('pointerdown', { button: 0, isPrimary: true, ...options }); }
}
class Keyboard extends DomEvent {
  constructor(options = {}) { super('keydown', { key: 'Enter', repeat: false, ctrlKey: false, metaKey: false, altKey: false, ...options }); }
}
class Element {
  constructor(master = false) { this.master = master; }
  closest(selector) { return selector === '[data-build-sound]' && this.master ? this : null; }
}
class Param {
  value = 0;
  changes = [];
  setValueAtTime(value, time) { this.changes.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.changes.push(['linear', value, time]); }
  exponentialRampToValueAtTime(value, time) { this.changes.push(['exponential', value, time]); }
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function flush() { for (let index = 0; index < 8; index++) await Promise.resolve(); }

function harness({ preference = 'off', resumes = [], suspends = [], storageFails = false, storageWriteFails = false, supported = true } = {}) {
  const window = new Events();
  const document = new Events();
  document.hidden = false;
  const storage = new Map([['knoux-build-sound', preference]]);
  const writes = [];
  const localStorage = {
    getItem(key) { if (storageFails) throw new Error('Storage blocked'); return storage.get(key); },
    setItem(key, value) { if (storageFails || storageWriteFails) throw new Error('Storage blocked'); storage.set(key, value); writes.push([key, value]); },
  };
  const instances = [];
  let activation = false;
  let clock = 1000;
  let support = supported;
  class Node extends Events {
    disconnects = 0;
    connections = [];
    constructor(audio, kind) { super(); this.audio = audio; this.kind = kind; audio.nodes.push(this); }
    connect(node) { this.connections.push(node); return node; }
    disconnect() {
      assert.equal(++this.disconnects, 1, `${this.kind} disconnected twice`);
      this.connections = [];
    }
  }
  class Source extends Node {
    starts = [];
    stops = [];
    stopCalls = 0;
    ended = false;
    frequency = new Param();
    start(time) { this.starts.push(time); }
    stop(time) {
      this.stopCalls++;
      assert.equal(this.ended, false, 'stop called after ended');
      assert.equal(this.stops.length, 0, 'source stopped twice');
      this.stops.push(time);
      if (time === undefined) this.end();
    }
    end() { this.ended = true; this.dispatchEvent(new DomEvent('ended')); }
  }
  class Audio {
    state = 'suspended';
    currentTime = 10;
    sampleRate = 8000;
    destination = {};
    nodes = [];
    buffers = [];
    resumeCalls = 0;
    suspendCalls = 0;
    closeCalls = 0;
    pendingResumes = [];
    pendingSuspends = [];
    constructor() {
      if (!support) throw new Error('WebAudio unavailable');
      assert.equal(activation, true, 'AudioContext constructed outside a trusted activation');
      instances.push(this);
    }
    createGain() { const node = new Node(this, 'gain'); node.gain = new Param(); return node; }
    createBiquadFilter() { const node = new Node(this, 'filter'); node.frequency = new Param(); return node; }
    createBufferSource() { return new Source(this, 'noise'); }
    createOscillator() { return new Source(this, 'tone'); }
    createBuffer(channels, length, sampleRate) {
      assert.equal(channels, 1);
      const samples = new Float32Array(length);
      const buffer = { length, sampleRate, samples, getChannelData: () => samples };
      this.buffers.push(buffer);
      return buffer;
    }
    resume() {
      assert.equal(activation, true, 'resume called without a trusted pointer/key activation');
      this.resumeCalls++;
      const mode = resumes.shift() ?? 'resolve';
      if (mode === 'throw') throw new Error('resume threw');
      if (mode === 'reject') return Promise.reject(new Error('resume rejected'));
      const work = deferred();
      this.pendingResumes.push(work);
      if (mode !== 'pending') work.resolve();
      return work.promise.then(() => {
        if (this.state !== 'closed' && mode !== 'suspended') this.state = 'running';
      });
    }
    suspend() {
      this.suspendCalls++;
      const work = deferred();
      this.pendingSuspends.push(work);
      const mode = suspends.shift() ?? 'resolve';
      if (mode === 'reject') work.reject(new Error('suspend rejected'));
      else if (mode !== 'pending') work.resolve();
      return work.promise.then(() => { if (this.state !== 'closed') this.state = 'suspended'; });
    }
    close() {
      assert.equal(++this.closeCalls, 1, 'context closed twice');
      this.state = 'closed';
      return Promise.resolve();
    }
    get tones() { return this.nodes.filter((node) => node.kind === 'tone'); }
    get noise() { return this.nodes.filter((node) => node.kind === 'noise'); }
  }

  let cursor = 0;
  let mounted = true;
  let element;
  let updates = 0;
  let lateUpdates = 0;
  const slots = [];
  const effects = [];
  const react = {
    useRef(value) { return slots[cursor++] ??= { current: value }; },
    useState(value) {
      const slot = slots[cursor++] ??= { value };
      return [slot.value, (next) => {
        if (!mounted) { lateUpdates++; return; }
        updates++;
        slot.value = typeof next === 'function' ? next(slot.value) : next;
        render();
      }];
    },
    useEffect(create) {
      const index = cursor++;
      if (slots[index]) return;
      const effect = { create, cleanup: null };
      slots[index] = effect;
      effects.push(effect);
    },
  };
  const globals = { window, document, AudioContext: Audio, PointerEvent: Pointer, KeyboardEvent: Keyboard, Element, localStorage, performance: { now: () => clock }, CustomEvent: DomEvent };
  function load(output, dependencies) {
    const loaded = { exports: {} };
    const require = (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    };
    new Function('require', 'module', 'exports', ...Object.keys(globals), output)(require, loaded, loaded.exports, ...Object.values(globals));
    return loaded.exports;
  }
  const bus = load(atmosphere, {});
  const { BuildSound } = load(component, {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    './living-atmosphere': bus,
  });
  function render() { cursor = 0; element = BuildSound(); }
  function mountEffects() { for (const effect of effects) effect.cleanup = effect.create(); }
  function unmount() {
    if (!mounted) return;
    mounted = false;
    for (const effect of effects) effect.cleanup?.();
  }
  function trusted(work) {
    activation = true;
    try { work(); } finally { activation = false; }
  }
  function button(kind = 'pointer', options = {}) {
    const props = element.props;
    const target = new Element(true);
    const gesture = kind === 'pointer' ? new Pointer({ isTrusted: true, target, ...options }) : new Keyboard({ isTrusted: true, target, ...options });
    const click = new DomEvent('click', { isTrusted: gesture.isTrusted, target });
    trusted(() => {
      if (kind === 'pointer') props.onPointerDown({ nativeEvent: gesture });
      else props.onKeyDown({ nativeEvent: gesture });
      window.dispatchEvent(gesture);
      props.onClick({ nativeEvent: click });
    });
  }
  render();
  mountEffects();
  return {
    window, document, instances, storage, writes, button, unmount,
    get props() { return element.props; },
    get updates() { return updates; },
    get lateUpdates() { return lateUpdates; },
    support(value) { support = value; },
    advance(ms) { clock += ms; },
    cue(value) { bus.cueAtmosphere(value); },
    gesture(event) { trusted(() => window.dispatchEvent(event)); },
    click(options = {}) { trusted(() => element.props.onClick({ nativeEvent: new DomEvent('click', options) })); },
    visibility(hidden) { document.hidden = hidden; document.dispatchEvent(new DomEvent('visibilitychange')); },
    replayEffects() { unmount(); mounted = true; render(); mountEffects(); },
  };
}

function envelopeOf(source) { return source.audio.nodes[source.audio.nodes.indexOf(source) - 2]; }
function filterOf(source) { return source.audio.nodes[source.audio.nodes.indexOf(source) - 1]; }
function frequencies(source) { return source.frequency.changes.map(([, value]) => value); }

const EXPECTED = {
  wake: ['triangle', [165, 330], .34, 1100, .035],
  'generation-start': ['triangle', [220, 330, 440], .52, 1200, .035],
  success: ['sine', [392, 523, 784], .72, 1500, .045],
  error: ['sawtooth', [220, 174, 110], .6, 620, .03],
  cancel: ['triangle', [330, 220], .22, 700, .028],
  ready: ['sine', [330, 550], .29, 880, .035],
  confirm: ['sine', [450, 570], .29, 880, .035],
  settle: ['sine', [240, 145], .29, 880, .035],
};

function assertTone(tone, expected) {
  const [wave, pitches, duration, cutoff, peak] = expected;
  assert.equal(tone.type, wave);
  assert.deepEqual(frequencies(tone), pitches);
  assert.deepEqual(tone.starts, [10]);
  assert.deepEqual(tone.stops, [10 + duration]);
  assert.equal(filterOf(tone).frequency.value, cutoff);
  const changes = envelopeOf(tone).gain.changes;
  assert.deepEqual(changes[0], ['set', 0, 10]);
  assert.equal(changes[1][0], 'linear');
  assert.equal(changes[1][1], peak);
  assert.deepEqual(changes[2], ['exponential', .001, 10 + duration]);
}

const ALL_CUES = [...Object.keys(EXPECTED), 'ambient-storm', 'activation-storm'];

test('persisted preference and synthetic events never create audio before a qualifying gesture', async () => {
  const h = harness({ preference: 'on' });
  for (const cue of ALL_CUES) h.cue(cue);
  h.gesture(new Pointer());
  h.gesture(new Keyboard());
  h.gesture(new Keyboard({ isTrusted: true, repeat: true }));
  h.gesture(new Keyboard({ isTrusted: true, key: 'Shift' }));
  h.gesture(new Keyboard({ isTrusted: true, ctrlKey: true }));
  h.gesture(new Pointer({ isTrusted: true, button: 2 }));
  h.gesture(new Pointer({ isTrusted: true, isPrimary: false }));
  h.click({ isTrusted: true }); // A trusted click without a pointer/key grant.
  h.button('pointer', { isTrusted: false });
  await flush();
  assert.equal(h.instances.length, 0);
  assert.equal(h.props['aria-pressed'], false);
  assert.equal(h.writes.length, 0);
  h.unmount();
});

for (const kind of ['pointer', 'Enter', ' ']) {
  test(`persisted preference restores only on a trusted ${kind} gesture`, async () => {
    const h = harness({ preference: 'on' });
    const event = kind === 'pointer' ? new Pointer({ isTrusted: true }) : new Keyboard({ isTrusted: true, key: kind });
    h.gesture(event);
    assert.equal(h.instances.length, 1);
    assert.equal(h.instances[0].resumeCalls, 1, 'resume is invoked synchronously');
    assert.equal(h.instances[0].nodes.length, 0, 'no sources until resume succeeds');
    await flush();
    assert.equal(h.instances[0].noise.length, 1);
    assertTone(h.instances[0].tones[0], EXPECTED.confirm);
    h.unmount();
  });
}

test('master is accessible, enables procedurally, and persists synchronous mute across replay', async () => {
  const h = harness();
  assert.equal(h.props.type, 'button');
  assert.equal(h.props['data-build-sound'], true);
  assert.match(h.props['aria-label'], /build sound/i);
  assert.equal(h.props.disabled, undefined);
  h.button('key', { key: ' ' });
  await flush();
  const audio = h.instances[0];
  const air = audio.noise[0];
  assert.equal(h.props['aria-pressed'], true);
  assert.equal(air.loop, true);
  assert.equal(air.buffer.length, audio.sampleRate * 7);
  assert.equal(Math.abs(air.buffer.samples[0]), 0);
  assert.equal(Math.abs(air.buffer.samples.at(-1)), 0);
  assert.ok(air.buffer.samples.every(Number.isFinite));
  assert.ok(air.buffer.samples.some((sample) => sample !== 0));
  assert.equal(audio.nodes[0].gain.value, .019);
  assert.equal(audio.nodes[2].frequency.value, 520);
  assert.equal(h.storage.get('knoux-build-sound'), 'on');
  h.button();
  assert.equal(h.props['aria-pressed'], false);
  assert.equal(h.storage.get('knoux-build-sound'), 'off');
  assert.equal(audio.closeCalls, 1);
  assert.deepEqual(air.stops, [undefined]);
  for (const node of audio.nodes) assert.equal(node.disconnects, 1);
  for (const cue of ALL_CUES) h.cue(cue);
  h.replayEffects();
  h.gesture(new Pointer({ isTrusted: true }));
  await flush();
  assert.equal(h.instances.length, 1, 'persisted mute must not restore');
  h.unmount();
  h.unmount();
  assert.equal(h.window.listenerCount, 0);
  assert.equal(h.document.listenerCount, 0);
  assert.equal(h.lateUpdates, 0);
});

test('rapid enable/mute/enable isolates late resumes and remains cancellable before await', async () => {
  const h = harness({ resumes: ['pending', 'pending'] });
  h.button();
  const old = h.instances[0];
  h.button();
  assert.equal(h.storage.get('knoux-build-sound'), 'off');
  assert.equal(old.closeCalls, 1);
  h.button();
  const current = h.instances[1];
  const updates = h.updates;
  old.pendingResumes[0].resolve();
  await flush();
  assert.equal(old.nodes.length, 0);
  assert.equal(current.nodes.length, 0);
  assert.equal(h.updates, updates);
  current.pendingResumes[0].resolve();
  await flush();
  assert.equal(current.noise.length, 1);
  assert.equal(current.tones.length, 1);
  h.unmount();
  assert.equal(current.closeCalls, 1);
  assert.equal(old.closeCalls, 1);
});

for (const outcome of ['resolve', 'reject']) {
  test(`effect cleanup/remount ignores an old resume ${outcome} even with the same React ref`, async () => {
    const h = harness({ resumes: ['pending', 'pending'] });
    h.button();
    const old = h.instances[0];
    h.replayEffects();
    assert.equal(old.closeCalls, 1);
    h.button();
    const current = h.instances[1];
    const updates = h.updates;
    const writes = h.writes.length;
    old.pendingResumes[0][outcome](new Error('old request'));
    await flush();
    assert.equal(old.nodes.length, 0);
    assert.equal(h.updates, updates);
    assert.equal(h.writes.length, writes);
    current.pendingResumes[0].resolve();
    await flush();
    assert.equal(current.noise.length, 1);
    h.unmount();
    const afterUnmount = h.updates;
    await flush();
    assert.equal(h.updates, afterUnmount);
    assert.equal(h.lateUpdates, 0);
  });
}

test('pending resume after final unmount cannot publish or start sources', async () => {
  const h = harness({ resumes: ['pending'] });
  h.button();
  const audio = h.instances[0];
  h.unmount();
  audio.pendingResumes[0].resolve();
  await flush();
  assert.equal(audio.nodes.length, 0);
  assert.equal(audio.closeCalls, 1);
  assert.equal(h.lateUpdates, 0);
  assert.equal(h.window.listenerCount, 0);
  assert.equal(h.document.listenerCount, 0);
});

test('hidden tab silences and suspends; visibility and synthetic events cannot resume', async () => {
  const h = harness();
  h.button();
  await flush();
  const audio = h.instances[0];
  h.cue('activation-storm');
  h.cue('success');
  h.visibility(true);
  await flush();
  assert.equal(audio.suspendCalls, 1);
  assert.equal(audio.state, 'suspended');
  assert.equal(h.props['aria-pressed'], true, 'master preference remains enabled while hidden');
  for (const node of audio.nodes) assert.equal(node.disconnects, 1);
  for (const cue of ALL_CUES) h.cue(cue);
  h.gesture(new Pointer({ isTrusted: true }));
  h.visibility(false);
  for (const cue of ALL_CUES) h.cue(cue);
  h.gesture(new Pointer());
  h.gesture(new Keyboard());
  await flush();
  assert.equal(audio.resumeCalls, 1);
  assert.equal(audio.noise.length, 2, 'hidden cues were not replayed');
  h.gesture(new Keyboard({ isTrusted: true }));
  await flush();
  assert.equal(audio.resumeCalls, 2);
  assert.equal(audio.noise.length, 3, 'exactly one new ambience loop');
  h.gesture(new Pointer({ isTrusted: true }));
  await flush();
  assert.equal(audio.resumeCalls, 2, 'running ambience is not duplicated');
  h.unmount();
});

test('hiding during resume retires the context before it can start audio', async () => {
  const h = harness({ resumes: ['pending'] });
  h.button();
  const old = h.instances[0];
  h.visibility(true);
  assert.equal(old.closeCalls, 1);
  old.pendingResumes[0].resolve();
  await flush();
  assert.equal(old.nodes.length, 0);
  h.visibility(false);
  assert.equal(h.instances.length, 1);
  h.gesture(new Pointer({ isTrusted: true }));
  await flush();
  assert.equal(h.instances[1].noise.length, 1);
  h.unmount();
});

test('gesture during pending suspension gets a fresh context, not an out-of-order resume', async () => {
  const h = harness({ suspends: ['pending'] });
  h.button();
  await flush();
  const old = h.instances[0];
  h.visibility(true);
  h.visibility(false);
  h.gesture(new Pointer({ isTrusted: true }));
  await flush();
  const current = h.instances[1];
  assert.equal(old.closeCalls, 1);
  assert.equal(old.resumeCalls, 1);
  assert.equal(current.state, 'running');
  old.pendingSuspends[0].resolve();
  await flush();
  assert.equal(current.state, 'running');
  assert.equal(h.props['aria-pressed'], true);
  h.unmount();
});

for (const mode of ['reject', 'throw', 'suspended']) {
  test(`unavailable resume (${mode}) remains enabled for an explicit trusted retry`, async () => {
    const h = harness({ resumes: [mode] });
    h.button();
    await flush();
    assert.equal(h.props['aria-pressed'], false);
    assert.equal(h.props.disabled, undefined);
    assert.match(h.props.children, /unavailable.*retry/i);
    assert.match(h.props['aria-label'], /retry/i);
    assert.equal(h.instances[0].closeCalls, 1);
    assert.equal(h.instances[0].nodes.length, 0);
    h.gesture(new Pointer({ isTrusted: true }));
    assert.equal(h.instances.length, 1, 'unrelated gestures do not repeatedly retry a failure');
    h.button();
    await flush();
    assert.equal(h.props['aria-pressed'], true);
    assert.equal(h.props.children, 'Sound');
    assert.equal(h.instances[1].noise.length, 1);
    h.unmount();
  });
}

test('missing WebAudio can be retried and denied storage does not break explicit mute', async () => {
  const h = harness({ supported: false, storageFails: true });
  h.button();
  assert.match(h.props.children, /unavailable/i);
  h.support(true);
  h.button();
  await flush();
  assert.equal(h.props['aria-pressed'], true);
  h.button();
  assert.equal(h.props['aria-pressed'], false);
  h.gesture(new Pointer({ isTrusted: true }));
  await flush();
  assert.equal(h.instances.length, 1);
  h.unmount();
});

test('in-memory mute wins over a persisted on preference when storage writes are denied', async () => {
  const h = harness({ preference: 'on', storageWriteFails: true });
  h.gesture(new Pointer({ isTrusted: true }));
  await flush();
  h.button();
  assert.equal(h.storage.get('knoux-build-sound'), 'on', 'the browser refused persistence');
  h.gesture(new Pointer({ isTrusted: true }));
  h.gesture(new Keyboard({ isTrusted: true }));
  await flush();
  assert.equal(h.instances.length, 1);
  assert.equal(h.props['aria-pressed'], false, 'a stale stored preference cannot undo the current mute');
  h.button();
  await flush();
  assert.equal(h.instances.length, 2, 'explicit activation still works');
  h.unmount();
});

test('browser-initiated suspension resumes on a trusted gesture without duplicating ambience', async () => {
  const h = harness();
  h.button();
  await flush();
  const audio = h.instances[0];
  audio.state = 'suspended';
  const count = audio.nodes.length;
  h.cue('success');
  assert.equal(audio.nodes.length, count);
  h.gesture(new Pointer());
  assert.equal(audio.resumeCalls, 1);
  h.gesture(new Pointer({ isTrusted: true }));
  await flush();
  assert.equal(audio.resumeCalls, 2);
  assert.equal(audio.noise.length, 1);
  h.unmount();
});

test('a failed hidden-tab suspension releases resources and permits an explicit retry', async () => {
  const h = harness({ suspends: ['reject'] });
  h.button();
  await flush();
  const audio = h.instances[0];
  h.visibility(true);
  await flush();
  assert.equal(audio.closeCalls, 1);
  assert.equal(h.props['aria-pressed'], false);
  assert.match(h.props.children, /retry/i);
  for (const node of audio.nodes) assert.equal(node.disconnects, 1);
  h.visibility(false);
  h.button();
  await flush();
  assert.equal(h.instances[1].noise.length, 1);
  h.unmount();
});

test('an unexpected natural ambience end and later cleanup never double-stop', async () => {
  const h = harness();
  h.button();
  await flush();
  const audio = h.instances[0];
  const ambience = audio.noise[0];
  ambience.end();
  ambience.end();
  assert.equal(ambience.disconnects, 1);
  assert.equal(ambience.stops.length, 0, 'naturally ended sources are not stopped again');
  h.button();
  h.unmount();
  assert.equal(ambience.stopCalls, 0, 'even a caught double-stop attempt is forbidden');
  assert.equal(audio.closeCalls, 1);
});

test('each actual procedural cue has a distinct waveform, pitch contour and bounded envelope', async () => {
  const h = harness();
  h.button();
  await flush();
  const audio = h.instances[0];
  const signatures = new Set();
  for (const [cue, expected] of Object.entries(EXPECTED)) {
    h.advance(250);
    const count = audio.tones.length;
    h.cue(cue);
    assert.equal(audio.tones.length, count + 1, cue);
    const tone = audio.tones.at(-1);
    assertTone(tone, expected);
    signatures.add(JSON.stringify([tone.type, frequencies(tone), tone.stops]));
    tone.end();
    tone.end(); // Duplicate ended notifications and later cleanup are harmless.
    assert.equal(tone.disconnects, 1);
    assert.equal(tone.listenerCount, 0);
  }
  assert.equal(signatures.size, Object.keys(EXPECTED).length);
  for (const tone of audio.tones) assert.equal(tone.stopCalls, 1, 'no duplicate or post-ended stop attempts');
  for (const [cue, peak] of [['ambient-storm', .09], ['activation-storm', .17]]) {
    h.advance(2000);
    h.cue(cue);
    const noise = audio.noise.at(-1);
    assert.notEqual(noise.loop, true);
    assert.equal(noise.buffer.length, Math.ceil(audio.sampleRate * 1.75));
    assert.equal(filterOf(noise).frequency.value, 165);
    assert.equal(envelopeOf(noise).gain.changes[1][1], peak);
    assert.deepEqual(noise.stops, [11.75]);
    noise.end();
  }
  h.unmount();
  for (const node of audio.nodes) assert.equal(node.disconnects, 1);
});

test('results bypass thunder and the 180ms throttle, and later thunder cannot interrupt them', async () => {
  const h = harness();
  h.button();
  await flush();
  const audio = h.instances[0];
  h.cue('wake');
  const actionCount = audio.tones.length;
  h.cue('confirm');
  h.cue('generation-start');
  assert.equal(audio.tones.length, actionCount, 'rapid non-result interactions stay bounded');
  h.cue('activation-storm');
  const thunder = audio.noise.at(-1);
  for (const cue of ['success', 'error', 'cancel', 'ready', 'settle']) {
    const before = audio.tones.length;
    h.cue(cue); // Same performance.now(), during the same thunder burst.
    assert.equal(audio.tones.length, before + 1, `${cue} must not be swallowed`);
    assertTone(audio.tones.at(-1), EXPECTED[cue]);
    assert.equal(thunder.disconnects, 0, 'foreground feedback keeps the procedural storm');
  }
  const result = audio.tones.at(-1);
  const noiseCount = audio.noise.length;
  h.cue('ambient-storm');
  assert.equal(audio.noise.length, noiseCount, 'ambient storm cannot replace activation thunder');
  h.advance(1800);
  h.cue('ambient-storm');
  assert.equal(audio.noise.length, noiseCount + 1);
  assert.equal(result.disconnects, 0, 'new thunder cannot stop a result');
  h.advance(200);
  h.cue('generation-start');
  assertTone(audio.tones.at(-1), EXPECTED['generation-start']);
  h.unmount();
});

test('malformed custom cues and a disarmed/synthetic master are negative controls', async () => {
  const h = harness();
  h.props.onPointerDown({ nativeEvent: new Pointer({ isTrusted: true }) });
  h.props.onBlur();
  h.click({ isTrusted: true });
  h.props.onPointerDown({ nativeEvent: new Pointer({ isTrusted: true }) });
  h.props.onPointerCancel();
  h.click({ isTrusted: true });
  assert.equal(h.instances.length, 0);
  h.button();
  await flush();
  const audio = h.instances[0];
  const count = audio.nodes.length;
  for (const cue of ['unknown', '__proto__', 'toString', null, undefined, {}]) h.cue(cue);
  assert.equal(audio.nodes.length, count);
  h.click({ isTrusted: false });
  assert.equal(h.props['aria-pressed'], true, 'synthetic click cannot change the master');
  h.unmount();
});
