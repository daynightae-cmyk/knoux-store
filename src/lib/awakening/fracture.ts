/**
 * Deterministic fracture geometry.
 *
 * The fracture is an SVG layer painted above the scene, never a mutation of the
 * page: no node is removed, no route changes, no scroll position is touched and
 * the layer is permanently `pointer-events: none`. The same seed always draws
 * the same cracks, so the moment is authored rather than rolled at runtime.
 */

/** Small deterministic generator. No entropy, so every visitor sees the same break. */
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

function draw(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * The shout is aimed at the screen, not at the scene card. This geometry is a
 * wider, multi-impact web drawn in a 1000 x 1000 field: seven star impacts,
 * long radial cracks with branches, three concentric shock rings and a shower
 * of glass shards. It is seeded, bounded and rendered by CSS/SVG only.
 */

export type ScreenImpact = {
  x: number;
  y: number;
  /** Seconds before this impact flashes inside the fracture phase. */
  delay: number;
  /** 0..1, drives ring count and flash size. */
  power: number;
};

export type ScreenCrack = {
  d: string;
  width: number;
  opacity: number;
  delay: number;
  /** Index into `SCREEN_IMPACTS`, used to colour the hot centre. */
  impact: number;
};

export type ScreenRing = {
  d: string;
  width: number;
  opacity: number;
  delay: number;
  impact: number;
};

export type ScreenShard = {
  /** Start position in percent of the viewport. */
  x: number;
  y: number;
  /** Finished position, in viewport units, relative to the start. */
  tx: number;
  ty: number;
  size: number;
  rotate: number;
  delay: number;
  opacity: number;
  /** 0..4 selects one of the authored clipped silhouettes. */
  variant: number;
};

export type ScreenFracture = {
  impacts: readonly ScreenImpact[];
  cracks: readonly ScreenCrack[];
  rings: readonly ScreenRing[];
  shards: readonly ScreenShard[];
};

export const SCREEN_FRACTURE_SEED = 0x53484f55; // "SHOU"

export const SCREEN_IMPACTS: readonly ScreenImpact[] = [
  { x: 500, y: 462, delay: 0, power: 1 },
  { x: 118, y: 168, delay: 0.08, power: 0.86 },
  { x: 884, y: 148, delay: 0.14, power: 0.78 },
  { x: 84, y: 742, delay: 0.2, power: 0.72 },
  { x: 916, y: 776, delay: 0.24, power: 0.82 },
  { x: 268, y: 902, delay: 0.3, power: 0.56 },
  { x: 742, y: 918, delay: 0.34, power: 0.6 },
];

const SCREEN_CRACKS_PER_IMPACT = 9;

function screenPoint(x: number, y: number, angle: number, radius: number): [number, number] {
  return [
    Math.max(8, Math.min(992, x + Math.cos(angle) * radius)),
    Math.max(8, Math.min(992, y + Math.sin(angle) * radius)),
  ];
}

function ringPath(x: number, y: number, radius: number): string {
  const rx = Math.min(430, radius);
  const ry = Math.min(390, radius * 0.9);
  return `M${draw(x + rx)} ${draw(y)}A${draw(rx)} ${draw(ry)} 0 1 0 ${draw(x - rx)} ${draw(
    y,
  )}A${draw(rx)} ${draw(ry)} 0 1 0 ${draw(x + rx)} ${draw(y)}`;
}

export function buildScreenFracture(
  seed: number = SCREEN_FRACTURE_SEED,
  impacts: readonly ScreenImpact[] = SCREEN_IMPACTS,
): ScreenFracture {
  const random = generator(seed);
  const cracks: ScreenCrack[] = [];
  const rings: ScreenRing[] = [];
  const shards: ScreenShard[] = [];

  impacts.forEach((impact, impactIndex) => {
    for (let index = 0; index < SCREEN_CRACKS_PER_IMPACT; index += 1) {
      const angle = (index / SCREEN_CRACKS_PER_IMPACT) * Math.PI * 2 + (random() - 0.5) * 0.22;
      const reach = (impact.power * 260 + random() * 190) * (impactIndex === 0 ? 1.25 : 1);
      const bends = 4;
      const points: Array<[number, number]> = [[impact.x, impact.y]];
      for (let bend = 1; bend <= bends; bend += 1) {
        const jitter = (random() - 0.5) * 0.16 * bend;
        points.push(screenPoint(impact.x, impact.y, angle + jitter, (reach / bends) * bend));
      }
      cracks.push({
        d: `M${points.map(([x, y]) => `${draw(x)} ${draw(y)}`).join('L')}`,
        width: Number((0.7 + random() * 1.5 + impact.power).toFixed(2)),
        opacity: Number((0.3 + random() * 0.4).toFixed(2)),
        delay: Number((impact.delay + random() * 0.16).toFixed(2)),
        impact: impactIndex,
      });

      if (index % 2 === 0) {
        const forkAt = points[2];
        const forkAngle = angle + (random() > 0.5 ? 0.46 : -0.46);
        const forkEnd = screenPoint(impact.x, impact.y, forkAngle, reach * (0.55 + random() * 0.24));
        cracks.push({
          d: `M${draw(forkAt[0])} ${draw(forkAt[1])}L${draw(forkEnd[0])} ${draw(forkEnd[1])}`,
          width: Number((0.5 + random() * 0.8).toFixed(2)),
          opacity: Number((0.2 + random() * 0.3).toFixed(2)),
          delay: Number((impact.delay + 0.08 + random() * 0.18).toFixed(2)),
          impact: impactIndex,
        });
      }
    }

    const ringCount = impact.power > 0.7 ? 3 : 2;
    for (let ring = 0; ring < ringCount; ring += 1) {
      rings.push({
        d: ringPath(impact.x, impact.y, 42 + ring * 58 + random() * 26),
        width: Number((0.5 + random() * 0.6).toFixed(2)),
        opacity: Number((0.16 + impact.power * 0.2 - ring * 0.04).toFixed(2)),
        delay: Number((impact.delay + ring * 0.09).toFixed(2)),
        impact: impactIndex,
      });
    }
  });

  for (let index = 0; index < 38; index += 1) {
    const angle = random() * Math.PI * 2;
    const originX = 50 + Math.cos(angle) * (4 + random() * 24);
    const originY = 46 + Math.sin(angle) * (3 + random() * 20);
    const distance = 14 + random() * 46;
    shards.push({
      x: Number(originX.toFixed(2)),
      y: Number(originY.toFixed(2)),
      tx: Number((Math.cos(angle) * distance).toFixed(1)),
      ty: Number((Math.sin(angle) * distance * 0.72).toFixed(1)),
      size: Number((18 + random() * 64).toFixed(1)),
      rotate: Number(((random() - 0.5) * 170).toFixed(1)),
      delay: Number((0.04 + random() * 0.34).toFixed(2)),
      opacity: Number((0.24 + random() * 0.5).toFixed(2)),
      variant: Math.floor(random() * 5),
    });
  }

  return { impacts, cracks, rings, shards };
}

export const screenFracture = buildScreenFracture();
