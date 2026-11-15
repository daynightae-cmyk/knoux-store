/**
 * Original synthesized score for KNOuX: THE AWAKENING.
 *
 * There is no audio file and no third-party composition. Everything is
 * generated locally by the Web Audio API after a real user gesture. The class
 * is deliberately defensive: a browser without Web Audio, a blocked context or
 * a suspended autoplay policy degrades to a silent experience rather than an
 * error.
 *
 * The view owns one instance, calls `unlock()` from the activation handler and
 * `dispose()` when the overlay closes, so oscillators, buffers and the context
 * do not outlive the scene.
 */

import type { AwakeningPhase } from './machine';

type ActiveNode = OscillatorNode | AudioBufferSourceNode;

const MASTER_GAIN = 0.5;
const CUE_GAIN = 0.075;

export class AwakeningAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly active = new Set<ActiveNode>();
  private muted = false;
  private utterance: SpeechSynthesisUtterance | null = null;

  get isMuted(): boolean {
    return this.muted;
  }

  /** True once a real context exists and has been asked to run. */
  get isUnlocked(): boolean {
    return this.context !== null;
  }

  /**
   * Must be called synchronously inside a user gesture. Returns false when the
   * platform cannot provide Web Audio; the visual sequence continues.
   */
  unlock(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
      return true;
    }

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;

    try {
      const context = new Ctor();
      const master = context.createGain();
      master.gain.value = this.muted ? 0 : MASTER_GAIN;
      master.connect(context.destination);
      this.context = context;
      this.master = master;
      if (context.state === 'suspended') void context.resume().catch(() => undefined);
      return true;
    } catch {
      this.context = null;
      this.master = null;
      return false;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopSpeaking();
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_GAIN, now + 0.08);
  }

  /**
   * Speak one authored line through the platform voice. This is the part a
   * visitor hears as the Sentinel's voice; captions remain the accessible
   * record and are always present. A browser without speech synthesis, or one
   * that only ships a default voice, still gets the performance silently.
   */
  speak(
    text: string,
    locale: string,
    options: { pitch?: number; rate?: number } = {},
  ): boolean {
    if (this.muted || !text.trim()) return false;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.volume = 1;
      utterance.rate = options.rate ?? 1.02;
      utterance.pitch = options.pitch ?? 0.78;

      const voices = synth.getVoices();
      const exact = voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase());
      const base = locale.split('-')[0]?.toLowerCase() ?? locale.toLowerCase();
      const language = voices.find((voice) => voice.lang.toLowerCase().startsWith(base));
      const local = voices.find((voice) => voice.localService);
      const voice = exact ?? language ?? local;
      if (voice) utterance.voice = voice;

      this.utterance = utterance;
      synth.speak(utterance);
      return true;
    } catch {
      this.utterance = null;
      return false;
    }
  }

  /** Stop the current line immediately. Safe when nothing is speaking. */
  stopSpeaking(): void {
    this.utterance = null;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // A browser that refuses cancellation is already silent.
    }
  }

  /**
   * Schedule the authored cue for a phase. Cues are short, span at most 1.7 s
   * and share one master gain, so the score is bounded by construction.
   */
  cue(phase: AwakeningPhase): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || this.muted) return;
    if (context.state === 'suspended') void context.resume().catch(() => undefined);

    const start = context.currentTime + 0.015;
    switch (phase) {
      case 'ignition':
        this.tone(context, master, { frequency: 55, endFrequency: 55, start, duration: 1.05, gain: 0.045, type: 'sine' });
        this.tone(context, master, { frequency: 110, endFrequency: 82, start: start + 0.12, duration: 0.9, gain: 0.026, type: 'triangle' });
        break;
      case 'awakening':
        this.tone(context, master, { frequency: 196, endFrequency: 196, start, duration: 0.5, gain: 0.04, type: 'triangle' });
        this.tone(context, master, { frequency: 293.66, endFrequency: 293.66, start: start + 0.42, duration: 0.7, gain: 0.034, type: 'sine' });
        break;
      case 'first-emission':
        this.tone(context, master, { frequency: 587.33, endFrequency: 587.33, start, duration: 0.45, gain: 0.04, type: 'sine' });
        this.tone(context, master, { frequency: 1174.66, endFrequency: 1174.66, start, duration: 0.28, gain: 0.012, type: 'sine' });
        break;
      case 'cascade':
        [392, 493.88, 587.33].forEach((frequency, index) => {
          this.tone(context, master, {
            frequency,
            endFrequency: frequency,
            start: start + index * 0.17,
            duration: 0.42,
            gain: 0.033,
            type: 'triangle',
          });
        });
        break;
      case 'overcharge':
        this.tone(context, master, { frequency: 98, endFrequency: 392, start, duration: 0.95, gain: 0.05, type: 'triangle' });
        this.tone(context, master, { frequency: 196, endFrequency: 784, start: start + 0.18, duration: 0.7, gain: 0.018, type: 'sine' });
        break;
      case 'fracture':
        this.noise(context, master, { start, duration: 0.32, gain: 0.032, cutoff: 880 });
        this.tone(context, master, { frequency: 73.42, endFrequency: 48, start, duration: 0.36, gain: 0.045, type: 'sine' });
        break;
      case 'revelation':
        [261.63, 392, 523.25].forEach((frequency, index) => {
          this.tone(context, master, {
            frequency,
            endFrequency: frequency,
            start: start + index * 0.035,
            duration: 1.65,
            gain: 0.024,
            type: 'sine',
          });
        });
        break;
      default:
        break;
    }
  }

  private tone(
    context: AudioContext,
    master: GainNode,
    input: {
      frequency: number;
      endFrequency: number;
      start: number;
      duration: number;
      gain: number;
      type: OscillatorType;
    },
  ): void {
    try {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = input.type;
      oscillator.frequency.setValueAtTime(input.frequency, input.start);
      if (input.endFrequency !== input.frequency) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, input.endFrequency), input.start + input.duration);
      }
      envelope.gain.setValueAtTime(0.0001, input.start);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, input.gain * CUE_GAIN), input.start + 0.04);
      envelope.gain.exponentialRampToValueAtTime(0.0001, input.start + input.duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(input.start);
      oscillator.stop(input.start + input.duration + 0.03);
      this.track(oscillator);
    } catch {
      // A browser that refuses a node should not interrupt the visual scene.
    }
  }

  private noise(
    context: AudioContext,
    master: GainNode,
    input: { start: number; duration: number; gain: number; cutoff: number },
  ): void {
    try {
      const length = Math.max(1, Math.floor(context.sampleRate * input.duration));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      // Deterministic noise. No Math.random, no ambient entropy.
      let state = 0x9e3779b9;
      for (let index = 0; index < length; index += 1) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        data[index] = (state / 4294967296) * 2 - 1;
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = input.cutoff;
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0.0001, input.start);
      envelope.gain.exponentialRampToValueAtTime(input.gain * CUE_GAIN, input.start + 0.015);
      envelope.gain.exponentialRampToValueAtTime(0.0001, input.start + input.duration);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      source.start(input.start);
      source.stop(input.start + input.duration + 0.02);
      this.track(source);
    } catch {
      // Same contract as `tone`.
    }
  }

  private track(node: ActiveNode): void {
    this.active.add(node);
    node.addEventListener('ended', () => this.active.delete(node), { once: true });
  }

  dispose(): void {
    this.stopSpeaking();
    for (const node of this.active) {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
    }
    this.active.clear();
    const context = this.context;
    this.context = null;
    this.master = null;
    if (context) void context.close().catch(() => undefined);
  }
}
