/**
 * KNOuX field.
 *
 * The shared, lightweight environment layer: a deterministic particle universe
 * in Canvas 2D, plus the canonical KNOuX silhouette resolved out of that same
 * field.
 *
 * Two decisions matter here.
 *
 * The first is that the mark is not redrawn. It is sampled from the canonical
 * geometry through `buildMarkSamples`, the same sampler the Living Particle Mark
 * uses, so the identity that resolves on the auth route is literally the
 * homepage's mark rather than a logo authored for a login page. The auth screen
 * is moving deeper into the same universe, not into a different brand.
 *
 * The second is that the field is deterministic. Every position is derived from
 * a fixed seed, so the stars and the mark appear in the same places on every
 * load, at every width, in every build. `Math.random()` would redraw the
 * institution's own identity on each refresh.
 */

import { buildMarkSamples, MARK_VIEW_BOX, MARK_SCALE, type MarkSample } from '@/lib/knouxMark';

export type StarLayer = 'far' | 'mid' | 'near';

export type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  /** Twinkle amplitude and speed, both seeded so the field is reproducible. */
  amplitude: number;
  speed: number;
  phase: number;
  layer: StarLayer;
  /** A small minority of the field carries the KNOuX violet signal. */
  violet: boolean;
  /** Slow continuous drift, so the field is alive rather than a fixed pattern. */
  driftX: number;
  driftY: number;
};

/** Mulberry32. The same generator the Living Particle Mark samples from. */
function seeded(seed: number) {
  let state = (seed + 0x6d2b79f5) | 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

const FIELD_SEED = 0x4b4e4f58; // "KNOX"
const VIOLET_RATIO = 0.05;

const LAYER_PLAN: ReadonlyArray<{
  layer: StarLayer;
  share: number;
  radius: number;
  alpha: number;
  twinkle: number;
}> = [
  { layer: 'far', share: 0.56, radius: 0.5, alpha: 0.3, twinkle: 0.16 },
  { layer: 'mid', share: 0.33, radius: 0.85, alpha: 0.55, twinkle: 0.24 },
  { layer: 'near', share: 0.11, radius: 1.35, alpha: 0.82, twinkle: 0.3 },
];

/**
 * Builds the ambient field.
 *
 * `count` scales density only. The seed does not change, so a phone carries the
 * same field, thinned, rather than a different one.
 */
export function buildStarField(count = 170, seed = FIELD_SEED): Star[] {
  const random = seeded(seed);
  const stars: Star[] = [];

  for (const plan of LAYER_PLAN) {
    const total = Math.max(1, Math.round(count * plan.share));
    for (let index = 0; index < total; index += 1) {
      stars.push({
        x: random(),
        // Squaring the sample thins the field toward the far edge, which is what
        // makes a starfield read as plotted rather than sprayed.
        y: Math.sqrt(random()),
        radius: (plan.radius * (0.7 + random() * 0.6)) / 1.6,
        alpha: plan.alpha * (0.6 + random() * 0.4),
        amplitude: plan.twinkle * (0.5 + random()),
        // A full twinkle cycle between roughly 3.4 and 7 seconds.
        speed: 0.9 + random() * 0.95,
        phase: random() * Math.PI * 2,
        layer: plan.layer,
        violet: random() < VIOLET_RATIO,
        // Barely perceptible movement: well under a pixel per second at the
        // extremes, which is the difference between a living field and weather.
        driftX: (random() - 0.5) * 0.0016,
        driftY: (random() - 0.5) * 0.0011,
      });
    }
  }

  return stars;
}

/**
 * The canonical mark, resolved as particles.
 *
 * Home positions come straight from the canonical sampler, so this is the same
 * silhouette the Living Particle Mark builds in WebGL. Scatter positions are
 * seeded per particle, and the arrival order is the sampler's own contour bias,
 * so the mark resolves from its silhouette edge inward, exactly as it does in
 * the hero.
 */
export type MarkFieldParticle = {
  /** Where the particle belongs in the mark, in world units. */
  homeX: number;
  homeY: number;
  /** Where the particle starts, normalised to the mark's own box. */
  scatterX: number;
  scatterY: number;
  /** Offset from scatter to home, in units of the mark's height. */
  offsetX: number;
  offsetY: number;
  /** 0..1 assembly order, biased so the edge resolves first. */
  order: number;
  radius: number;
  glow: number;
  violet: boolean;
};

/** The mark's world-space height, which every offset is expressed against. */
export const MARK_WORLD_HEIGHT = MARK_VIEW_BOX.height * MARK_SCALE;

export function buildMarkField(budget: number, seed = FIELD_SEED ^ 0x51ed): MarkFieldParticle[] {
  const random = seeded(seed);
  const samples: MarkSample[] = buildMarkSamples(budget);
  const particles: MarkFieldParticle[] = [];

  for (const sample of samples) {
    // Scatter is wide enough to read as a field rather than a blur, and biased
    // upward so the particles appear to fall into the silhouette.
    const scatterX = (random() - 0.5) * 2.4;
    const scatterY = (random() - 0.5) * 2.2 - 0.5;

    particles.push({
      homeX: sample.x,
      homeY: sample.y,
      scatterX,
      scatterY,
      // Both states are expressed in the same units, so a particle is one
      // position or the other, never their sum.
      offsetX: sample.x - scatterX,
      offsetY: sample.y - scatterY,
      order: sample.delay,
      // World-unit radius, converted to pixels by the renderer against the
      // chosen mark height. Fine, so the resolved identity reads as a drawn
      // silhouette in point cloud rather than as a scatter of discs.
      radius: 0.009 + sample.contour * 0.013,
      glow: sample.glow,
      violet: sample.violet,
    });
  }

  return particles;
}
