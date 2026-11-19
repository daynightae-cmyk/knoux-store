'use client';

import { useEffect, useRef, useState } from 'react';
import { listenAtmosphere, type AtmosphereCue } from './living-atmosphere';

const SOUND_PREFERENCE = 'knoux-build-sound';
type Stop = () => void;
type CueProfile = {
  priority: 'storm' | 'action' | 'result';
  duration: number;
  attack: number;
  peak: number;
  cutoff: number;
} & ({ kind: 'noise' } | { kind: 'tone'; wave: OscillatorType; pitches: readonly (readonly [number, number])[] });

const CUE_PROFILES = {
  'ambient-storm': { kind: 'noise', priority: 'storm', duration: 1.75, attack: .14, peak: .09, cutoff: 165 },
  'provider-authenticated': { kind: 'noise', priority: 'storm', duration: 1.65, attack: .035, peak: .24, cutoff: 1450 },
  'activation-storm': { kind: 'noise', priority: 'storm', duration: 1.75, attack: .14, peak: .17, cutoff: 165 },
  wake: { kind: 'tone', priority: 'action', duration: .34, attack: .035, peak: .035, cutoff: 1100, wave: 'triangle', pitches: [[0, 165], [.29, 330]] },
  'generation-start': { kind: 'tone', priority: 'action', duration: .52, attack: .04, peak: .035, cutoff: 1200, wave: 'triangle', pitches: [[0, 220], [.2, 330], [.46, 440]] },
  success: { kind: 'tone', priority: 'result', duration: .72, attack: .045, peak: .045, cutoff: 1500, wave: 'sine', pitches: [[0, 392], [.25, 523], [.64, 784]] },
  error: { kind: 'tone', priority: 'result', duration: .6, attack: .025, peak: .03, cutoff: 620, wave: 'sawtooth', pitches: [[0, 220], [.2, 174], [.53, 110]] },
  cancel: { kind: 'tone', priority: 'result', duration: .22, attack: .02, peak: .028, cutoff: 700, wave: 'triangle', pitches: [[0, 330], [.18, 220]] },
  ready: { kind: 'tone', priority: 'result', duration: .29, attack: .045, peak: .035, cutoff: 880, wave: 'sine', pitches: [[0, 330], [.25, 550]] },
  confirm: { kind: 'tone', priority: 'action', duration: .29, attack: .045, peak: .035, cutoff: 880, wave: 'sine', pitches: [[0, 450], [.25, 570]] },
  settle: { kind: 'tone', priority: 'result', duration: .29, attack: .045, peak: .035, cutoff: 880, wave: 'sine', pitches: [[0, 240], [.25, 145]] },
} satisfies Record<AtmosphereCue, CueProfile>;

function cloudBuffer(context: AudioContext, seconds: number) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  const samples = buffer.getChannelData(0);
  let drift = 0;
  const seam = Math.round(context.sampleRate * .12);
  for (let index = 0; index < samples.length; index++) {
    drift = (drift + (Math.random() * 2 - 1) * .035) / 1.035;
    samples[index] = drift * 2.5 * Math.min(1, index / seam, (samples.length - index - 1) / seam);
  }
  return buffer;
}

function ownSource(source: AudioScheduledSourceNode, nodes: AudioNode[], scheduled: boolean, onFinished: Stop): Stop {
  let released = false;
  let finished = false;
  const release = () => {
    if (released) return;
    released = true;
    source.removeEventListener('ended', ended);
    // One-shots already have a stop deadline. Disconnecting silences them
    // immediately without stopping an ended/scheduled source a second time.
    if (!scheduled && !finished) { try { source.stop(); } catch { /* Already ended or context closed. */ } }
    for (const node of nodes) node.disconnect();
    onFinished();
  };
  const ended = () => { finished = true; release(); };
  source.addEventListener('ended', ended, { once: true });
  return release;
}

function startAmbience(context: AudioContext): Stop {
  const volume = context.createGain();
  const air = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const stop = ownSource(air, [air, filter, volume], false, () => {});
  try {
    volume.gain.value = .019;
    volume.connect(context.destination);
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    air.buffer = cloudBuffer(context, 7);
    air.loop = true;
    air.connect(filter).connect(volume);
    air.start();
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}

function cueSource(context: AudioContext, profile: CueProfile, now: number): AudioScheduledSourceNode {
  if (profile.kind === 'noise') {
    const noise = context.createBufferSource();
    noise.buffer = cloudBuffer(context, profile.duration);
    return noise;
  }
  const tone = context.createOscillator();
  tone.type = profile.wave;
  const [[offset, frequency], ...changes] = profile.pitches;
  tone.frequency.setValueAtTime(frequency, now + offset);
  for (const [time, pitch] of changes) tone.frequency.exponentialRampToValueAtTime(pitch, now + time);
  return tone;
}

function playCue(context: AudioContext, profile: CueProfile, onFinished: Stop): Stop {
  const now = context.currentTime;
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  const source = cueSource(context, profile, now);
  const stop = ownSource(source, [source, filter, envelope], true, onFinished);
  try {
    filter.type = 'lowpass';
    filter.frequency.value = profile.cutoff;
    source.connect(filter).connect(envelope).connect(context.destination);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(profile.peak, now + profile.attack);
    envelope.gain.exponentialRampToValueAtTime(.001, now + profile.duration);
    source.start(now);
    source.stop(now + profile.duration);
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}

function isGesture(event: Event): event is PointerEvent | KeyboardEvent {
  if (!event.isTrusted) return false;
  if (event instanceof PointerEvent) return event.type === 'pointerdown' && event.button === 0 && event.isPrimary;
  return event instanceof KeyboardEvent && event.type === 'keydown' && !event.repeat &&
    !event.ctrlKey && !event.metaKey && !event.altKey && (event.key === 'Enter' || event.key === ' ');
}

function preference() {
  try { return localStorage.getItem(SOUND_PREFERENCE) === 'on'; } catch { return false; }
}

function savePreference(enabled: boolean) {
  try { localStorage.setItem(SOUND_PREFERENCE, enabled ? 'on' : 'off'); } catch { /* Optional browser storage. */ }
}

type SoundStatus = { enabled: boolean; unavailable: boolean };
type AudioSession = {
  audio: AudioContext;
  ambience: Stop | null;
  foreground: Stop | null;
  storm: Stop | null;
  pending: boolean;
  suspending: boolean;
  disposed: boolean;
};

function silence(session: AudioSession) {
  for (const lane of ['foreground', 'storm', 'ambience'] as const) {
    const stop = session[lane];
    session[lane] = null;
    stop?.();
  }
}

function disposeSession(session: AudioSession) {
  if (session.disposed) return;
  session.disposed = true;
  silence(session);
  void session.audio.close().catch(() => {});
}

function createSoundController(update: (status: SoundStatus) => void) {
  let session: AudioSession | null = null;
  let disposed = false;
  let wanted = false;
  let unavailable = false;
  let mayRestore = true;
  let revision = 0;
  let armed: Event | null = null;
  let lastAction = -Infinity;
  let activationUntil = -Infinity;
  const publish = () => { if (!disposed) update({ enabled: wanted, unavailable }); };

  function play(owned: AudioSession, profile: CueProfile) {
    const lane = profile.priority === 'storm' ? 'storm' : 'foreground';
    owned[lane]?.();
    let stop: Stop | null = null;
    stop = playCue(owned.audio, profile, () => { if (owned[lane] === stop) owned[lane] = null; });
    owned[lane] = stop;
  }

  function fail(owned: AudioSession | null) {
    if (disposed || session !== owned) return;
    session = null;
    if (owned) disposeSession(owned);
    wanted = false;
    unavailable = true;
    publish();
  }

  function enable(event: Event) {
    if (disposed || document.hidden || !isGesture(event) || session?.pending) return;
    wanted = true;
    unavailable = false;
    lastAction = -Infinity;
    activationUntil = -Infinity;
    const attempt = ++revision;
    try {
      // Never reuse a context with a pending suspension or an abandoned resume.
      if (session?.suspending || session?.audio.state === 'closed') {
        disposeSession(session);
        session = null;
      }
      session ??= { audio: new AudioContext(), ambience: null, foreground: null, storm: null, pending: false, suspending: false, disposed: false };
      const owned = session;
      owned.pending = true;
      savePreference(true);
      publish();
      // This call stays synchronous with the trusted pointer/key activation.
      void owned.audio.resume().then(() => {
        if (disposed || attempt !== revision || session !== owned || !wanted || document.hidden) return;
        owned.pending = false;
        if (owned.audio.state !== 'running') { fail(owned); return; }
        owned.ambience ??= startAmbience(owned.audio);
        play(owned, CUE_PROFILES.confirm);
      }).catch(() => {
        if (attempt === revision) fail(owned);
      });
    } catch {
      fail(session);
    }
  }

  function toggle(event: Event) {
    const gesture = armed;
    armed = null;
    if (disposed || !event.isTrusted) return;
    if (!wanted) { if (gesture) enable(gesture); return; }
    wanted = false;
    unavailable = false;
    mayRestore = false;
    revision++;
    const owned = session;
    session = null;
    if (owned) disposeSession(owned);
    savePreference(false);
    publish();
  }

  function restore(event: Event) {
    if (disposed || document.hidden || !isGesture(event)) return;
    if (event.target instanceof Element && event.target.closest('[data-build-sound]')) return;
    if (wanted) {
      if (!session?.pending && (!session?.ambience || session.audio.state !== 'running')) enable(event);
    } else if (mayRestore && !unavailable && preference()) enable(event);
  }

  function visibility() {
    armed = null;
    if (!document.hidden || !session) return;
    revision++;
    const owned = session;
    silence(owned);
    if (owned.pending) {
      session = null;
      disposeSession(owned);
      return;
    }
    owned.suspending = true;
    void owned.audio.suspend().catch(() => {
      if (session === owned) fail(owned);
    }).finally(() => { owned.suspending = false; });
    // Visibility alone is not a gesture: the next trusted activation resumes.
  }

  function cue(cue: AtmosphereCue) {
    const owned = session;
    if (!wanted || !owned?.ambience || owned.audio.state !== 'running' || document.hidden) return;
    if (typeof cue !== 'string' || !Object.hasOwn(CUE_PROFILES, cue)) return;
    const profile: CueProfile = CUE_PROFILES[cue];
    const now = performance.now();
    if (profile.priority === 'action' && now - lastAction < 180) return;
    if (cue === 'ambient-storm' && now < activationUntil) return;
    if (profile.priority === 'action') lastAction = now;
    if (cue === 'activation-storm' || cue === 'provider-authenticated') activationUntil = now + profile.duration * 1000;
    // Results bypass interaction throttling; thunder has its own voice and
    // cannot interrupt or suppress success, error, cancellation or readiness.
    try { play(owned, profile); } catch { fail(owned); }
  }

  return {
    arm: (event: Event) => { armed = isGesture(event) && !document.hidden ? event : null; },
    disarm: () => { armed = null; },
    toggle, restore, visibility, cue,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      revision++;
      wanted = false;
      armed = null;
      const owned = session;
      session = null;
      if (owned) disposeSession(owned);
    },
  };
}

export function BuildSound() {
  const [status, setStatus] = useState<SoundStatus>({ enabled: false, unavailable: false });
  const controller = useRef<ReturnType<typeof createSoundController> | null>(null);

  useEffect(() => {
    // Each effect lifetime owns its async work, including Strict Mode replay.
    const controls = createSoundController(setStatus);
    controller.current = controls;
    const unsubscribe = listenAtmosphere(controls.cue);
    window.addEventListener('pointerdown', controls.restore, { passive: true });
    window.addEventListener('keydown', controls.restore);
    document.addEventListener('visibilitychange', controls.visibility);
    return () => {
      controller.current = null;
      unsubscribe();
      window.removeEventListener('pointerdown', controls.restore);
      window.removeEventListener('keydown', controls.restore);
      document.removeEventListener('visibilitychange', controls.visibility);
      controls.dispose();
    };
  }, []);

  return <button type="button" data-build-sound aria-pressed={status.enabled}
    aria-label={status.unavailable ? 'Sound unavailable. Retry build sound' : 'Build sound'}
    title={status.enabled ? 'Mute build sound' : 'Enable build sound'}
    onPointerDown={(event) => controller.current?.arm(event.nativeEvent)}
    onKeyDown={(event) => controller.current?.arm(event.nativeEvent)}
    onPointerCancel={() => controller.current?.disarm()}
    onBlur={() => controller.current?.disarm()}
    onClick={(event) => controller.current?.toggle(event.nativeEvent)}>
    {status.unavailable ? 'Sound unavailable · Retry' : 'Sound'}
  </button>;
}
