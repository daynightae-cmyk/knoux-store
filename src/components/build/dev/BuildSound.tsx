'use client';

import { useEffect, useRef, useState } from 'react';
import { listenAtmosphere, type AtmosphereCue } from './living-atmosphere';

const SOUND_PREFERENCE = 'knoux-build-sound';

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

function startAmbience(context: AudioContext) {
  const volume = context.createGain();
  volume.gain.value = .019;
  volume.connect(context.destination);
  const air = context.createBufferSource();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  air.buffer = cloudBuffer(context, 7);
  air.loop = true;
  air.connect(filter).connect(volume);
  air.start();
  return () => {
    air.stop();
    air.disconnect();
    filter.disconnect();
    volume.disconnect();
  };
}

function playCue(context: AudioContext, cue: AtmosphereCue) {
  const now = context.currentTime;
  const storm = cue === 'ambient-storm' || cue === 'activation-storm';
  const duration = storm ? 1.75 : .29;
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = storm ? 165 : 880;
  filter.connect(envelope).connect(context.destination);
  envelope.gain.setValueAtTime(0, now);
  const peak = cue === 'activation-storm' ? .17 : storm ? .09 : .035;
  envelope.gain.linearRampToValueAtTime(peak, now + (storm ? .14 : .045));
  envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
  let source: AudioScheduledSourceNode;
  if (storm) {
    const noise = context.createBufferSource();
    noise.buffer = cloudBuffer(context, duration);
    source = noise;
  } else {
    const tone = context.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(cue === 'settle' ? 240 : cue === 'ready' ? 330 : 450, now);
    tone.frequency.exponentialRampToValueAtTime(cue === 'settle' ? 145 : cue === 'ready' ? 550 : 570, now + .25);
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
      if (!active.current || attempt !== version.current || context.current !== audio) return;
      setEnabled(true);
      setUnavailable(false);
      try { localStorage.setItem(SOUND_PREFERENCE, 'on'); } catch { /* Optional browser storage. */ }
      stopAmbience.current = startAmbience(audio);
      stop.current = playCue(audio, 'confirm');
    } catch {
      if (!active.current || attempt !== version.current) return;
      active.current = false;
      setUnavailable(true);
    }
  }

  useEffect(() => {
    const restore = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && (event.repeat || (event.key !== 'Enter' && event.key !== ' '))) return;
      if (event.target instanceof Element && event.target.closest('[data-build-sound]')) return;
      try { if (localStorage.getItem(SOUND_PREFERENCE) === 'on') void enable(); } catch { /* Optional browser storage. */ }
    };
    let lastCue = -Infinity;
    let stormUntil = -Infinity;
    const unsubscribe = listenAtmosphere((cue) => {
      const audio = context.current;
      const now = performance.now();
      const storm = cue === 'activation-storm' || cue === 'ambient-storm';
      if (!active.current || audio?.state !== 'running' || document.hidden || (!storm && now < stormUntil) || (!storm && now - lastCue < 180)) return;
      lastCue = now;
      if (storm) stormUntil = now + 1700;
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
    window.addEventListener('keydown', restore);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      unsubscribe();
      window.removeEventListener('pointerdown', restore);
      window.removeEventListener('keydown', restore);
      document.removeEventListener('visibilitychange', visibility);
      active.current = false;
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
