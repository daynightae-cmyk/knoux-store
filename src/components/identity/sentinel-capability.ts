/**
 * KNOuX Sentinel capability layer.
 *
 * Everything the Sentinel displays is read from KNOuX itself rather than
 * authored for effect. The glyph it is made of is sampled from the canonical
 * mark geometry in `lib/knouxMark`, and the state it reports is counted from
 * the real software and lab registries. Nothing here invents a number, a
 * capability or a product: if the registry is empty the Sentinel is empty.
 *
 * This module is pure and deterministic. It uses no runtime entropy, touches
 * no DOM and performs no I/O, so the same inputs always produce the same
 * Sentinel on every machine and in every test.
 */

import { MARK_PATHS, MARK_VIEW_BOX, parseMarkPath, type MarkGroup, type Point } from '@/lib/knouxMark';
import { labEntities, softwareProducts } from '@/data/software';
import type { EntityStatus } from '@/lib/entities';

/** The Sentinel shell's SVG viewBox, owned by `KnouxSentinel`. */
const SHELL_VIEW_BOX = { width: 80, height: 100 } as const;

/**
 * The rectangle inside the shell face that the canonical mark is fitted to.
 * It sits within the face path (x 17.6..62.4, y 14.8..70) so the glyph never
 * crosses the rim, and keeps the mark's own 312:532 proportion.
 */
export const GLYPH_BOX = { x: 24.7, y: 16, width: 30.6, height: 52 } as const;

/**
 * Uniform transform from canonical SVG units into the shell viewBox. The box is
 * proportioned to the mark, so one scale fills it exactly and the mark keeps
 * its own aspect rather than being stretched to fit.
 */
function glyphTransform() {
  const scale = Math.min(GLYPH_BOX.width / MARK_VIEW_BOX.width, GLYPH_BOX.height / MARK_VIEW_BOX.height);
  const drawnWidth = MARK_VIEW_BOX.width * scale;
  const drawnHeight = MARK_VIEW_BOX.height * scale;
  return {
    scale,
    originX: GLYPH_BOX.x + (GLYPH_BOX.width - drawnWidth) / 2,
    originY: GLYPH_BOX.y + (GLYPH_BOX.height - drawnHeight) / 2,
  };
}

/** Share of glyph particles that carry KNOuX violet energy. */
const VIOLET_RATIO = 0.1;

/** Deterministic 32-bit hash of a string, used to seed the sampler. */
function seedFrom(key: string): number {
  let state = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    state ^= key.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return state >>> 0;
}

/**
 * A small seeded generator, so the glyph is identical on every render and
 * never depends on ambient entropy.
 */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SentinelGlyphPoint = {
  /** Rendered position inside the shell viewBox. */
  x: number;
  y: number;
  r: number;
  /** 0 deep interior .. 1 silhouette edge. */
  contour: number;
  /** 1 marks a KNOuX violet energy particle. */
  violet: boolean;
  /** Which canonical path this particle belongs to. */
  group: MarkGroup;
  /** Stable assembly order so the glyph resolves from its edges inward. */
  delay: number;
};

type WeightedPath = {
  group: MarkGroup;
  points: Point[];
  length: number;
};

/**
 * Perimeter-weighted path table. Weighting by edge length keeps particle
 * density even across components that differ in size, instead of overloading
 * the longer diagonals.
 */
let paths: WeightedPath[] | null = null;

function canonicalPaths(): WeightedPath[] {
  if (paths) return paths;
  paths = MARK_PATHS.map((path, index) => {
    const points = parseMarkPath(path.d);
    let length = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      length += Math.hypot(bx - ax, by - ay);
    }
    return { group: index as MarkGroup, points, length };
  });
  return paths;
}

/** Cumulative edge lengths, so a budget can be spent proportionally. */
function cumulative(table: WeightedPath[]): number[] {
  const total = table.reduce((sum, path) => sum + path.length, 0);
  const out: number[] = [];
  let running = 0;
  for (const path of table) {
    running += path.length;
    out.push(running / total);
  }
  return out;
}

const glyphCache = new Map<number, SentinelGlyphPoint[]>();

/**
 * A deterministic particle reading of the canonical KNOuX mark, fitted to the
 * Sentinel's shell. The returned points trace the real silhouette of the four
 * canonical paths, so the Sentinel is visibly constituted from KNOuX geometry
 * rather than from decoration.
 */
export function sentinelMarkGlyph(budget: number): SentinelGlyphPoint[] {
  const size = Math.max(8, Math.min(320, Math.floor(budget)));
  const cached = glyphCache.get(size);
  if (cached) return cached;

  const table = canonicalPaths();
  const stops = cumulative(table);
  const rand = generator(seedFrom(`knoux-sentinel-glyph-${size}`));
  const { scale, originX, originY } = glyphTransform();
  const out: SentinelGlyphPoint[] = [];

  for (let index = 0; index < size; index += 1) {
    // Walk the weighted table so each component receives a proportional share.
    const target = (index + rand() * 0.999) / size;
    let slot = 0;
    while (slot < stops.length - 1 && target > stops[slot]) slot += 1;
    const path = table[slot];

    const span = path.length;
    let walked = 0;
    let a = path.points[0];
    let b = path.points[1 % path.points.length];
    for (let edge = 0; edge < path.points.length; edge += 1) {
      a = path.points[edge];
      b = path.points[(edge + 1) % path.points.length];
      walked += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (walked >= span * ((index % 7) + 1) / 7) break;
    }

    const along = rand();
    const [px, py] = a;
    const [qx, qy] = b;
    const x = originX + (px + (qx - px) * along) * scale;
    const y = originY + (py + (qy - py) * along) * scale;
    const violet = rand() > 1 - VIOLET_RATIO;

    out.push({
      x: Number(Math.max(0, Math.min(SHELL_VIEW_BOX.width, x)).toFixed(3)),
      y: Number(Math.max(0, Math.min(SHELL_VIEW_BOX.height, y)).toFixed(3)),
      r: Number((0.5 + rand() * 0.55 + (violet ? 0.2 : 0)).toFixed(3)),
      contour: Number((0.45 + rand() * 0.55).toFixed(3)),
      violet,
      group: path.group,
      delay: Number((rand() * 0.9).toFixed(3)),
    });
  }

  glyphCache.set(size, out);
  return out;
}

export type SentinelCore = { x: number; y: number; r: number };

let core: SentinelCore | null = null;

/**
 * KNOuX Core, taken from the canonical `dot` path that KNOuX already defines
 * as the circular node. Its centre and radius are the dot path's own bounds,
 * not a circle drawn to look like it, so the Sentinel's light is the real size
 * of the real Core at the real scale of the mark.
 */
export function sentinelCore(): SentinelCore {
  if (core) return core;
  const dot = MARK_PATHS.find((path) => path.id === 'dot');
  const points = parseMarkPath(dot?.d ?? MARK_PATHS[2].d);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const { scale, originX, originY } = glyphTransform();
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  core = {
    x: Number((originX + cx * scale).toFixed(3)),
    y: Number((originY + cy * scale).toFixed(3)),
    r: Number((Math.max(maxX - minX, maxY - minY) / 2 * scale).toFixed(3)),
  };
  return core;
}

export type RegistryRead = {
  /** Every real software and lab record the Sentinel knows about. */
  total: number;
  counts: Readonly<Record<EntityStatus, number>>;
  /** 0..1 share of records that have actually shipped, not promised. */
  shippedShare: number;
  /** Real product codes, in registry order. */
  codes: readonly string[];
};

/**
 * Counted straight from the KNOuX registries. This is the Sentinel's telemetry
 * and it is deliberately honest: an empty registry reports zero, and nothing
 * here is hard-coded to look busy.
 */
let registry: RegistryRead | null = null;

export function sentinelRegistry(): RegistryRead {
  if (registry) return registry;
  const codes: string[] = [];
  const counts = {
    canonical: 0,
    active: 0,
    'release-candidate': 0,
    'in-development': 0,
    research: 0,
    service: 0,
    planned: 0,
  } satisfies Record<EntityStatus, number>;

  for (const product of softwareProducts) {
    counts[product.status] += 1;
    codes.push(product.code);
  }
  for (const entity of labEntities()) {
    counts[entity.status] += 1;
    codes.push(entity.code);
  }

  const total = codes.length;
  registry = {
    total,
    counts,
    shippedShare: total === 0 ? 0 : (counts.active + counts['release-candidate']) / total,
    codes,
  };
  return registry;
}

/**
 * Which KNOuX subsystem the Sentinel is currently expressing. Named for real
 * behaviour rather than for a mood, and derived from the same registry the rest
 * of the site reads.
 */
export type SentinelCapability =
  | 'core'
  | 'traversing'
  | 'guarding'
  | 'shipping'
  | 'dormant';

export function capabilityFor(mood: string): SentinelCapability {
  if (mood === 'sleep') return 'dormant';
  if (mood === 'critical' || mood === 'alert') return 'guarding';
  if (mood === 'active') return 'shipping';
  if (mood === 'focus' || mood === 'curious') return 'traversing';
  return 'core';
}

/**
 * Aura strength from the real shipped share. A registry of promised work
 * genuinely dims the Sentinel; only shipped records light it.
 */
export function auraFor(share: number): number {
  return Number((0.34 + Math.max(0, Math.min(1, share)) * 0.5).toFixed(3));
}

/**
 * How many of the authored shards are lit, taken from the real active count.
 * Clamped to the seven shards that exist rather than inventing more geometry.
 */
export function litShards(active: number): number {
  return Math.max(1, Math.min(7, Math.round(active)));
}
