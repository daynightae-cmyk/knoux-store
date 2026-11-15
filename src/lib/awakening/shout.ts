/**
 * Choreography data for the shout.
 *
 * The stage is a rendering layer: every position, angle and delay below is
 * authored data with no entropy, so the performance is identical on every
 * visit, can be reasoned about, and stays inside a bounded CSS animation
 * budget. No React state is updated per frame.
 */

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
