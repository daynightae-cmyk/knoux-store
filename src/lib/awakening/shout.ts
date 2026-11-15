/**
 * Choreography data for the shout.
 *
 * The stage is a rendering layer: every position, angle and delay below is
 * authored data with no entropy, so the performance is identical on every
 * visit, can be reasoned about, and stays inside a bounded CSS animation
 * budget. No React state is updated per frame.
 */

import type { AwakeningPhase } from './machine';

export type ShoutSeat = {
  /** Viewport percentage for the settled card centre. */
  x: number;
  y: number;
  rotate: number;
  /** Seconds before this card leaves the mouth. */
  delay: number;
  /** 0..1, how far the card overshoots before it settles. */
  drift: number;
};

/** Eight seats around the centre; the middle of the hall stays clear. */
export const SHOUT_CARD_SEATS: readonly ShoutSeat[] = [
  { x: 17, y: 25, rotate: -6, delay: 0.72, drift: 0.4 },
  { x: 83, y: 23, rotate: 5, delay: 0.9, drift: 0.46 },
  { x: 9, y: 55, rotate: 4, delay: 1.16, drift: 0.6 },
  { x: 91, y: 53, rotate: -5, delay: 1.3, drift: 0.55 },
  { x: 23, y: 82, rotate: -3, delay: 1.52, drift: 0.48 },
  { x: 77, y: 81, rotate: 4, delay: 1.68, drift: 0.5 },
  { x: 4, y: 38, rotate: -9, delay: 1.86, drift: 0.7 },
  { x: 96, y: 37, rotate: 8, delay: 2.02, drift: 0.68 },
];

export type ShoutWordPosition = 'left' | 'right' | 'low' | 'high' | 'break';

export type ShoutWordBeat = {
  phase: AwakeningPhase;
  /** English source; the stage translates it through the site catalogue. */
  text: string;
  position: ShoutWordPosition;
  /** Seconds after the phase opens. */
  delay: number;
};

/** The spoken blows. Each one lands on a phase boundary, never mid-frame. */
export const SHOUT_WORDS: readonly ShoutWordBeat[] = [
  { phase: 'first-emission', text: 'LOOK!', position: 'left', delay: 0.08 },
  { phase: 'cascade', text: 'AT THIS!', position: 'left', delay: 0.06 },
  { phase: 'cascade', text: 'AND THIS!', position: 'right', delay: 0.92 },
  { phase: 'cascade', text: 'AND THIS!', position: 'low', delay: 1.86 },
  { phase: 'overcharge', text: 'ALL OF IT!', position: 'high', delay: 0.12 },
  { phase: 'fracture', text: 'BREAK!', position: 'break', delay: 0.02 },
];

export function shoutWordsFor(phase: AwakeningPhase): readonly ShoutWordBeat[] {
  return SHOUT_WORDS.filter((beat) => beat.phase === phase);
}

export type ShoutSpark = {
  /** Final horizontal travel, in vw. */
  x: number;
  /** Final vertical travel, in vh. */
  y: number;
  size: number;
  duration: number;
  delay: number;
  hot: boolean;
};

function sparkField(): readonly ShoutSpark[] {
  const sparks: ShoutSpark[] = [];
  for (let index = 0; index < 30; index += 1) {
    const angle = (index / 30) * Math.PI * 2 + (index % 3) * 0.08;
    const reach = 12 + (index % 7) * 5.4;
    sparks.push({
      x: Number((Math.cos(angle) * reach).toFixed(2)),
      y: Number((Math.sin(angle) * reach * 0.72).toFixed(2)),
      size: 2 + (index % 5),
      duration: Number((0.9 + (index % 6) * 0.16).toFixed(2)),
      delay: Number(((index % 11) * 0.09).toFixed(2)),
      hot: index % 4 === 0,
    });
  }
  return sparks;
}

/** A deterministic radial field, computed once at module load. */
export const SHOUT_SPARKS: readonly ShoutSpark[] = sparkField();

export type ShoutOrb = {
  /** Horizontal seat in viewport percent. */
  x: number;
  y: number;
  size: number;
  delay: number;
};

/** The two secondary detonations that flank the Sentinel. */
export const SHOUT_ORBS: readonly ShoutOrb[] = [
  { x: 18, y: 55, size: 30, delay: 0.2 },
  { x: 82, y: 51, size: 34, delay: 1.4 },
];

/** How many real registry cards are on stage. The first five are unique. */
export const SHOUT_CARD_COUNT = SHOUT_CARD_SEATS.length;
