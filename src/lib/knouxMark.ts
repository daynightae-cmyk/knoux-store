/**
 * Canonical KNOuX mark geometry and particle sampling.
 *
 * `knoux-mark-canonical.svg` (viewBox 0 0 312 532) is the strict geometry
 * authority for the KNOuX symbol. Its four path elements are reproduced here
 * verbatim so the living mark can be sampled from real vector geometry instead
 * of a rasterised approximation. Never redraw or regenerate the symbol by hand:
 * change the path data below only by copying it back out of the SVG.
 *
 * The paths are used for sampling and routing only. Nothing here produces a
 * solid surface, and no fill is ever rendered.
 *
 * Component order matches the file and drives the KNOuX Core / product routing:
 *   0 upper-rear   - rear diagonal of the upper element
 *   1 upper-front  - front diagonal of the upper element
 *   2 dot          - circular node, which becomes KNOuX Core
 *   3 lower        - lower diagonal
 */

export const MARK_VIEW_BOX = { width: 312, height: 532 } as const;

export const MARK_PATHS = [
  {
    id: 'upper-rear',
    d: 'M 5 39 L 1 53 L 1 73 L 4 85 L 10 97 L 17 106 L 73 157 L 124 106 L 135 99 L 149 94 L 171 93 L 186 97 L 198 103 L 212 116 L 105 17 L 96 10 L 86 5 L 71 1 L 55 1 L 37 6 L 24 14 L 14 24 Z',
  },
  {
    id: 'upper-front',
    d: 'M 200 104 L 199 105 L 187 98 L 172 94 L 154 94 L 139 98 L 125 106 L 20 211 L 9 228 L 5 242 L 4 254 L 5 264 L 9 277 L 17 291 L 28 302 L 41 310 L 59 315 L 80 314 L 100 306 L 108 300 L 210 198 L 218 187 L 222 178 L 225 167 L 226 152 L 224 140 L 217 123 L 213 119 L 213 117 L 200 106 Z',
  },
  {
    id: 'dot',
    d: 'M 242 210 L 241 211 L 233 213 L 229 216 L 224 218 L 219 223 L 218 223 L 210 232 L 209 235 L 207 237 L 204 243 L 203 249 L 201 253 L 201 262 L 200 263 L 200 265 L 201 266 L 201 275 L 202 276 L 204 284 L 209 294 L 212 297 L 212 298 L 225 310 L 230 312 L 234 315 L 237 315 L 244 318 L 251 318 L 252 319 L 267 318 L 274 315 L 277 315 L 279 313 L 286 310 L 289 307 L 290 307 L 302 294 L 307 284 L 307 282 L 309 278 L 309 275 L 310 274 L 310 265 L 311 264 L 310 262 L 310 254 L 309 253 L 309 250 L 307 246 L 307 243 L 305 239 L 303 237 L 301 232 L 296 227 L 296 226 L 287 218 L 280 215 L 278 213 L 276 213 L 269 210 L 265 210 L 264 209 L 247 209 L 246 210 Z',
  },
  {
    id: 'lower',
    d: 'M 204 325 L 186 314 L 169 310 L 150 311 L 130 319 L 123 324 L 19 428 L 9 444 L 5 458 L 4 470 L 5 480 L 9 493 L 18 508 L 28 518 L 39 525 L 60 531 L 80 530 L 100 522 L 109 515 L 209 415 L 216 406 L 223 391 L 225 382 L 225 363 L 219 344 L 211 332 Z',
  },
] as const;

/** World-space height of the mark inside the particle scene. */
export const MARK_WORLD_HEIGHT = 5;
/** World units per canonical SVG unit. */
export const MARK_SCALE = MARK_WORLD_HEIGHT / MARK_VIEW_BOX.height;

export type MarkGroup = 0 | 1 | 2 | 3;
export type Point = readonly [number, number];

const COMMAND = /([MLHVZmlhvz])/g;

/**
 * Flattens an absolute-only polygon path into vertices. The canonical file
 * uses M / L / Z exclusively; anything else is a geometry change that must be
 * reviewed rather than guessed at, so it throws.
 */
export function parseMarkPath(d: string): Point[] {
  const parts = d.split(COMMAND).filter((part) => part.trim().length > 0);
  const points: Point[] = [];
  let started = false;
  for (let index = 0; index < parts.length; index++) {
    const command = parts[index].trim().toUpperCase();
    if (command === 'Z') {
      started = false;
      continue;
    }
    if (command !== 'M' && command !== 'L') {
      throw new Error(`knoux-mark-canonical.svg: unsupported path command "${command}".`);
    }
    if (command === 'M' && started) throw new Error('knoux-mark-canonical.svg: multi-subpath move is not supported.');
    const values = (parts[index + 1] ?? '').trim().split(/[\s,]+/).map(Number);
    if (values.length < 2 || values.some((value) => !Number.isFinite(value))) {
      throw new Error(`knoux-mark-canonical.svg: malformed ${command} segment.`);
    }
    points.push([values[0], values[1]]);
    started = true;
    index += 1; // the next part is this command's operand group, not a command.
  }
  if (points.length < 3) throw new Error('knoux-mark-canonical.svg: path has too few vertices to form a silhouette.');
  return points;
}

// Sampling grid, in canonical SVG units. Finer than the stroke width of any
// component, so the pool is a genuine volumetric sample rather than a contour
// trace.
const CELL = 0.4;
const GRID_WIDTH = Math.ceil(MARK_VIEW_BOX.width / CELL);
const GRID_HEIGHT = Math.ceil(MARK_VIEW_BOX.height / CELL);
const UNREACHED = 1e6;

/** Probability that a cell contributes a particle, by distance to the silhouette. */
const P_EDGE = 1;
const P_INNER = 0.045;
const DECAY = 5.8;
const PROBABILITY_STEPS = 320;

type Field = {
  /** Occupancy: 0 outside, otherwise 1 + component index. */
  solid: Int8Array;
  /** Chamfer distance, in cells, from the nearest silhouette edge. */
  edge: Float32Array;
  /** Acceptance probability indexed by quantised edge distance. */
  probability: Float32Array;
};

/** Rasterises the four canonical polygons and measures distance to the silhouette. */
function buildField(): Field {
  const solid = new Int8Array(GRID_WIDTH * GRID_HEIGHT);
  MARK_PATHS.forEach((path, group) => {
    const polygon = parseMarkPath(path.d);
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const sampleY = y * CELL + CELL / 2;
      const crossings: number[] = [];
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi > sampleY === yj > sampleY) continue;
        crossings.push(xi + ((sampleY - yi) / (yj - yi)) * (xj - xi));
      }
      crossings.sort((a, b) => a - b);
      for (let span = 0; span + 1 < crossings.length; span += 2) {
        const from = Math.max(0, Math.ceil(crossings[span] / CELL - 0.5));
        const to = Math.min(GRID_WIDTH - 1, Math.floor(crossings[span + 1] / CELL - 0.5));
        for (let x = from; x <= to; x++) solid[y * GRID_WIDTH + x] = group + 1;
      }
    }
  });

  const edge = new Float32Array(GRID_WIDTH * GRID_HEIGHT);
  for (let index = 0; index < edge.length; index++) edge[index] = solid[index] ? UNREACHED : 0;
  const relax = (index: number, neighbour: number, step: number) => {
    if (edge[neighbour] + step < edge[index]) edge[index] = edge[neighbour] + step;
  };
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const index = y * GRID_WIDTH + x;
      if (!solid[index]) continue;
      if (x > 0) relax(index, index - 1, CELL);
      if (y > 0) {
        relax(index, index - GRID_WIDTH, CELL);
        if (x > 0) relax(index, index - GRID_WIDTH - 1, CELL * 1.4142);
        if (x < GRID_WIDTH - 1) relax(index, index - GRID_WIDTH + 1, CELL * 1.4142);
      }
    }
  }
  for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
    for (let x = GRID_WIDTH - 1; x >= 0; x--) {
      const index = y * GRID_WIDTH + x;
      if (!solid[index]) continue;
      if (x < GRID_WIDTH - 1) relax(index, index + 1, CELL);
      if (y < GRID_HEIGHT - 1) {
        relax(index, index + GRID_WIDTH, CELL);
        if (x < GRID_WIDTH - 1) relax(index, index + GRID_WIDTH + 1, CELL * 1.4142);
        if (x > 0) relax(index, index + GRID_WIDTH - 1, CELL * 1.4142);
      }
    }
  }
  for (let index = 0; index < edge.length; index++) if (edge[index] >= UNREACHED) edge[index] = 0;

  const probability = new Float32Array(PROBABILITY_STEPS);
  for (let step = 0; step < PROBABILITY_STEPS; step++) {
    const distance = (step / (PROBABILITY_STEPS - 1)) * 60;
    probability[step] = P_INNER + (P_EDGE - P_INNER) * Math.exp(-distance / DECAY);
  }
  return { solid, edge, probability };
}

function random(seed: number) {
  let state = (seed + 0x6d2b79f5) | 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

export type MarkSample = {
  x: number;
  y: number;
  z: number;
  size: number;
  glow: number;
  /** 0 deep interior .. 1 silhouette edge. */
  contour: number;
  /** 1 marks a KNOuX violet energy particle. */
  violet: boolean;
  random: number;
  /** Assembly order, biased so the silhouette resolves from the outside in. */
  delay: number;
  /** Swirl direction, so separated components route as designed paths. */
  curve: number;
  destination: [number, number, number];
};

// KNOuX Core ring, and the four product paths the diagonals separate into.
// Reach is deliberately kept inside the mark's own frame: the stage is portrait,
// so a wider orbit would push the product nodes outside the canvas and clip them
// into hard wedges at the stage edge.
const CORE_RADIUS = 0.55;
const NODE_REACH = 1.3;
const NODE_ANGLES = [42, 138, 228, 318].map((degrees) => (degrees * Math.PI) / 180);
const NODE_GROUP = [0, 1, 3, 3] as const;
const NODE_SPILL = 0.24;
const ARM_WIDTH = 0.06;
const VIOLET_RATIO = 0.08;

function destinationFor(group: MarkGroup, rand: () => number): [number, number, number] {
  if (group === 2) {
    // The circular node becomes KNOuX Core.
    const angle = rand() * Math.PI * 2;
    const radius = CORE_RADIUS + rand() * 0.05;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, (rand() - 0.5) * 0.3];
  }
  // The three diagonals separate into structured product paths: each becomes an
  // arm running out from the Core, densest at the product node it resolves into.
  const node = rand() < NODE_SPILL ? 3 : NODE_GROUP[group];
  const angle = NODE_ANGLES[node] + (rand() - 0.5) * 0.15;
  const reach = NODE_REACH * (0.45 + rand() * 0.55);
  const across = (rand() - 0.5) * ARM_WIDTH;
  return [
    Math.cos(angle) * reach - Math.sin(angle) * across,
    Math.sin(angle) * reach + Math.cos(angle) * across,
    (rand() - 0.5) * 0.4,
  ];
}

/**
 * One deterministic pool of samples over the canonical silhouette, generated
 * once and shared by every quality tier. Each tier takes a uniform subset, so
 * HIGH, BALANCED and LOW keep the same density profile and the same visual
 * language instead of changing the character of the mark.
 */
let pool: MarkSample[] | null = null;

function buildPool(): MarkSample[] {
  const { solid, edge, probability } = buildField();
  const rand = random(0x4b6e6f78);
  const samples: MarkSample[] = [];
  const quantise = PROBABILITY_STEPS / 60;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const index = y * GRID_WIDTH + x;
      if (!solid[index]) continue;
      const distance = edge[index];
      if (rand() > probability[Math.min(PROBABILITY_STEPS - 1, (distance * quantise) | 0)]) continue;

      const roll = rand();
      const svgX = x * CELL + rand() * CELL;
      const svgY = y * CELL + rand() * CELL;
      const group = Math.min(3, solid[index] - 1) as MarkGroup;
      const contour = Math.exp(-distance / DECAY);
      const violet = roll > 1 - VIOLET_RATIO;

      samples.push({
        x: (svgX - MARK_VIEW_BOX.width / 2) * MARK_SCALE,
        y: (MARK_VIEW_BOX.height / 2 - svgY) * MARK_SCALE,
        // 2.5D depth: the contour sits forward, the interior recedes.
        z: 0.05 - Math.min(0.4, distance * 0.05) + (rand() - 0.5) * 0.07,
        size: 0.018 + rand() * 0.010 + contour * 0.026 + (violet ? 0.008 : 0),
        glow: Math.min(1, 0.18 + contour * 0.74 + rand() * 0.16),
        contour,
        violet,
        random: rand(),
        delay: Math.min(1, contour * 0.55 + rand() * 0.45),
        curve: group === 2 ? -1 : 1,
        destination: destinationFor(group, rand),
      });
    }
  }

  // Fixed permutation: a prefix of this order is a uniform subset of the pool.
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const swap = samples[i];
    samples[i] = samples[j];
    samples[j] = swap;
  }
  return samples;
}

/** Total pool size, i.e. the largest budget the tiers can draw from. */
export function markPoolSize() {
  pool ??= buildPool();
  return pool.length;
}

/** Deterministic sample of the canonical silhouette, contour-weighted. */
export function buildMarkSamples(budget: number): MarkSample[] {
  pool ??= buildPool();
  return pool.slice(0, Math.max(1, Math.min(budget, pool.length)));
}
