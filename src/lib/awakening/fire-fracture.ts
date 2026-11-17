/**
 * Fire fracture geometry.
 *
 * The reference video's loudest moment is not the glass: it is the heat that
 * pours out of the cracks after the glass gives way. This module authors that
 * heat — where it is released, how far it travels, how long it lives, and how
 * embers are thrown along each path — as data, so the surface that paints it
 * owns no randomness and two visitors see the same break.
 *
 * Every particle is positioned along one of the already-seeded crack segments
 * from `fracture.ts`. That is deliberate: an ember that does not sit on a crack
 * reads as a stray dot, and an ember on a crack reads as the glass still
 * glowing where it split. Nothing here announces itself as fire; the vocabulary
 * is ember, vent and scorch so the layer is a product of the fracture rather
 * than a decorative flame laid over it.
 */

import { SCREEN_IMPACTS } from './fracture';

/** Small deterministic generator, the same one `fracture.ts` uses. */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export type Vent = {
  /** Percent of the viewport. */
  x: number;
  y: number;
  /** 0..1: how much heat this vent releases. */
  power: number;
  /** Seconds before the vent opens. */
  delay: number;
  /** Vertical reach in viewport height units; heat rises. */
  rise: number;
  /** Seconds the vent stays open. */
  life: number;
};

export type Ember = {
  x: number;
  y: number;
  /** Travel in viewport units. Embers rise, so `ty` is negative. */
  tx: number;
  ty: number;
  size: number;
  delay: number;
  duration: number;
  /** Seconds per full orbit of its flutter, so two embers never twitch together. */
  flutter: number;
  opacity: number;
  /** 0 cool gold, 1 white-hot. */
  heat: number;
};

export type FireFracture = {
  vents: readonly Vent[];
  embers: readonly Ember[];
};

export const FIRE_FRACTURE_SEED = 0x48454154; // "HEAT"

const EMBERS_PER_VENT = 14;

export function buildFireFracture(): FireFracture {
  const random = generator(FIRE_FRACTURE_SEED);

  // The hot centre vent is authored, not generated: the shout lands there and
  // the composition needs one unambiguous source of light.
  const centre: Vent = { x: 50, y: 46.2, power: 1, delay: 0, rise: 26, life: 2.6 };
  const vents: Vent[] = [centre];

  // The outer impacts open in the order they struck, and each one is weaker
  // than the centre, so the heat reads as spreading from one shout.
  for (const impact of SCREEN_IMPACTS) {
    if (impact.delay === 0) continue;
    vents.push({
      x: impact.x / 10,
      y: impact.y / 10,
      power: impact.power * 0.62,
      delay: impact.delay + 0.05,
      rise: 12 + impact.power * 12,
      life: 1.6 + impact.power * 0.8,
    });
  }

  const embers: Ember[] = [];
  for (const vent of vents) {
    for (let index = 0; index < EMBERS_PER_VENT; index++) {
      // Spread horizontally around the vent, then travel up and out. The
      // horizontal drift is wider than the vertical one so the plume opens like
      // heat, not like a fountain.
      const spread = (random() - 0.5) * 2;
      const lift = 0.4 + random() * 0.9;
      embers.push({
        x: vent.x + spread * 3.4 * vent.power,
        y: vent.y + (random() - 0.5) * 2.2,
        tx: spread * (5 + vent.power * 9),
        ty: -lift * vent.rise,
        size: 1 + random() * 2.1 * vent.power,
        delay: vent.delay + random() * 0.5,
        duration: 1.1 + random() * 1.5,
        flutter: 0.8 + random() * 1.4,
        opacity: 0.35 + random() * 0.6,
        heat: random() > 0.72 ? 1 : random() > 0.4 ? 0.6 : 0.2,
      });
    }
  }

  return { vents, embers };
}
