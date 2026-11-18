'use client';

import { useEffect, useRef, useState } from 'react';
import { listenAtmosphere, type AtmosphereCue } from './living-atmosphere';

const SOUND_PREFERENCE = 'knoux-build-sound';

function startAmbience(context: AudioContext) {
  const volume = context.createGain();
  volume.gain.value = .008;
  volume.connect(context.destination);
  const voices = [55, 82.41].map((frequency) => {
    const tone = context.createOscillator();
    tone.frequency.value = frequency;
    tone.connect(volume);
    tone.start();
    return tone;
  });
  return () => {
    for (const tone of voices) { tone.stop(); tone.disconnect(); }
    volume.disconnect();
  };
}

function playCue(context: AudioContext, cue: AtmosphereCue) {
  const now = context.currentTime;
  const duration = cue === 'wake' ? 1.7 : .32;
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cue === 'wake' ? 145 : 920;
  filter.connect(envelope).connect(context.destination);
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(cue === 'wake' ? .1 : .027, now + .08);
  envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
  let source: AudioScheduledSourceNode;
  if (cue === 'wake') {
    const noise = context.createBufferSource();
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let drift = 0;
    for (let index = 0; index < samples.length; index++) {
      drift = (drift + (Math.random() * 2 - 1) * .025) / 1.025;
      samples[index] = drift * 2.8;
    }
    noise.buffer = buffer;
    source = noise;
  } else {
    const tone = context.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(cue === 'ready' ? 330 : 450, now);
    tone.frequency.exponentialRampToValueAtTime(cue === 'ready' ? 550 : 570, now + .25);
    source = tone;
  }
  source.connect(filter);
  const cleanup = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  source.addEventListener('ended', cleanup, { once: true });
  source.start(now);
  source.stop(now + duration);
  return () => { source.stop(); cleanup(); };
}

export function BuildSound() {
  const [enabled, setEnabled] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const stopAmbience = useRef<(() => void) | null>(null);
  const active = useRef(false);
  const version = useRef(0);

  async function enable() {
    if (active.current) return;
    active.current = true;
    const attempt = ++version.current;
    try {
      const audio = context.current ?? (context.current = new AudioContext());
      await audio.resume();
      if (attempt !== version.current) return;
      setEnabled(true);
      setUnavailable(false);
      try { localStorage.setItem(SOUND_PREFERENCE, 'on'); } catch { /* Optional browser storage. */ }
      stopAmbience.current = startAmbience(audio);
      stop.current = playCue(audio, 'confirm');
    } catch {
      if (attempt !== version.current) return;
      active.current = false;
      setUnavailable(true);
    }
  }

  useEffect(() => {
    const restore = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-build-sound]')) return;
      try { if (localStorage.getItem(SOUND_PREFERENCE) === 'on') void enable(); } catch { /* Optional browser storage. */ }
    };
    let lastCue = -Infinity;
    const unsubscribe = listenAtmosphere((cue) => {
      const audio = context.current;
      if (!active.current || audio?.state !== 'running' || document.hidden || performance.now() - lastCue < 900) return;
      lastCue = performance.now();
      stop.current?.();
      stop.current = playCue(audio, cue);
    });
    const visibility = () => {
      const audio = context.current;
      if (!audio) return;
      if (document.hidden) {
        stop.current?.();
        stop.current = null;
        void audio.suspend().catch(() => {});
      } else if (active.current) void audio.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', restore, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      unsubscribe();
      window.removeEventListener('pointerdown', restore);
      document.removeEventListener('visibilitychange', visibility);
      active.current = false;
      version.current++;
      stop.current?.();
      stop.current = null;
      stopAmbience.current?.();
      stopAmbience.current = null;
      void context.current?.close().catch(() => {});
      context.current = null;
    };
  }, []);

  function toggle() {
    if (!active.current) {
      void enable();
      return;
    }
    active.current = false;
    version.current++;
    stop.current?.();
    stop.current = null;
    stopAmbience.current?.();
    stopAmbience.current = null;
    setEnabled(false);
    void context.current?.suspend().catch(() => {});
    try { localStorage.setItem(SOUND_PREFERENCE, 'off'); } catch { /* Optional browser storage. */ }
  }

  return <button type="button" data-build-sound aria-pressed={enabled} onClick={toggle} disabled={unavailable}>
    {unavailable ? 'Sound unavailable' : 'Sound'}
  </button>;
}
