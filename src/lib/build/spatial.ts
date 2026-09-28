/**
 * KNOuX Build OS — spatial workspace math.
 *
 * Pure geometry and deterministic field generation for the spatial stage. No
 * DOM, no canvas, no I/O, so every number here is testable and every visual is
 * reproducible.
 *
 * The field uses the golden angle, so points distribute evenly without any
 * randomness. That is deliberate: branded geometry must never come from
 * `Math.random`, and a deterministic spiral also avoids the clumping that pure
 * random produces at small counts.
 */

import type { ProjectNodeDomain, VerificationStatus } from './types';

/** The golden angle in radians. Even distribution without randomness. */
export const GOLDEN_ANGLE = 2.399963229728653;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Progress from a pointer position over the spine track.
 *
 * The track's own rect is used rather than a fraction of the viewport, so the
 * spine works wherever it is laid out and does not depend on page scroll.
 */
export function progressFromPointer(
  clientY: number,
  track: { top: number; height: number },
): number {
  if (!track.height) return 0;
  return clamp01((clientY - track.top) / track.height);
}

export type FieldPoint = {
  /** Unit circle coordinates, deterministic. */
  a: number;
  r: number;
  s: number;
  /** Stable 0..1 identity, used for per-point variation. */
  id: number;
};

/**
 * A deterministic point field. `count` points on a golden-angle spiral, with
 * radius and size derived from the index rather than a generator, so the same
 * count always produces the same field.
 */
export function coreField(count: number, seed = 0): FieldPoint[] {
  const total = Math.max(0, Math.min(400, Math.floor(count)));
  const points: FieldPoint[] = [];
  for (let i = 0; i < total; i += 1) {
    const k = i + seed;
    points.push({
      a: (k * GOLDEN_ANGLE) % (Math.PI * 2),
      r: 0.08 + ((k * 37) % 100) / 125,
      s: 0.4 + ((k * 17) % 8) / 10,
      id: (k * 2654435761) % 1000 / 1000,
    });
  }
  return points;
}

export type RingSpec = {
  /** Ring centre, in unit space. */
  cx: number;
  cy: number;
  radius: number;
  stroke: string;
  width: number;
  /** 0 dim, 1 fully emphasised. Derived from real state, never invented. */
  emphasis: number;
  dash?: number[];
};

const RING_DOMAINS: { domain: ProjectNodeDomain; radius: number }[] = [
  { domain: 'ui', radius: 0.30 },
  { domain: 'routes', radius: 0.45 },
  { domain: 'api', radius: 0.58 },
  { domain: 'data', radius: 0.70 },
  { domain: 'tests', radius: 0.82 },
];

export type RingInput = {
  /** Domain → node count, straight from the adapter graph. */
  domainCounts: Partial<Record<ProjectNodeDomain, number>>;
  /** Domain currently selected in the Cortex, if any. */
  selectedDomain: ProjectNodeDomain | null;
  /** The largest domain count, used as the density reference. */
  maxDomainCount: number;
  /** Verification state drives the outer ring only. */
  verification: VerificationStatus;
};

/**
 * `not-applicable` is folded into `not-run`.
 *
 * A check that does not apply has not passed, and drawing it as a healthy ring
 * would encode absence as success. This is the one place that mapping happens,
 * so the visual can never disagree with the ledger.
 */
export type RingState = 'pass' | 'fail' | 'blocked' | 'unconfigured' | 'not-run';

export function toRingState(status: VerificationStatus): RingState {
  return status === 'not-applicable' ? 'not-run' : status;
}

/**
 * Subsystem rings derived from real graph density.
 *
 * Ring radius is fixed per domain so the shape is stable between renders; only
 * emphasis responds to state. A domain with no nodes is drawn dim and dashed
 * rather than omitted, because "we found nothing there" and "it is not there"
 * are different facts.
 */
export function coreRings(input: RingInput): RingSpec[] {
  const reference = Math.max(1, input.maxDomainCount);
  return RING_DOMAINS.map(({ domain, radius }) => {    const count = input.domainCounts[domain] ?? 0;
    const present = count > 0;
    const isSelected = input.selectedDomain === domain;
    // Density is relative to the busiest domain, so the shape reads as a
    // topology rather than as arbitrary decoration.
    const density = present ? Math.min(1, count / reference) : 0;
    const emphasis = isSelected ? 1 : present ? 0.34 + density * 0.42 : 0.1;

    return {
      cx: 0,
      cy: 0,
      radius,
      stroke: isSelected
        ? 'var(--bo-violet)'
        : present
          ? 'var(--bo-ink-4)'
          : 'var(--bo-line-bright)',
      width: isSelected ? 1.5 : 0.8,
      emphasis,
      dash: present ? undefined : [3, 5],
    };
  });
}

/** The outer verification ring. It never shows a healthy state that was not measured. */
export function verificationRing(state: VerificationStatus): RingSpec {
  const map: Record<RingState, { colour: string; emphasis: number; dash?: number[] }> = {
    pass: { colour: 'var(--bo-green)', emphasis: 0.9 },
    fail: { colour: 'var(--bo-red)', emphasis: 1 },
    // Blocked and unconfigured are amber, not green. Unknown is never healthy.
    blocked: { colour: 'var(--bo-amber)', emphasis: 0.6, dash: [4, 4] },
    unconfigured: { colour: 'var(--bo-amber)', emphasis: 0.5, dash: [2, 6] },
    'not-run': { colour: 'var(--bo-line-bright)', emphasis: 0.34, dash: [1, 4] },
  };
  const ringState = toRingState(state);
  const entry = map[ringState];
  return {
    cx: 0, cy: 0, radius: 0.92,
    stroke: entry.colour, width: ringState === 'fail' ? 1.8 : 1.1,
    emphasis: entry.emphasis, dash: entry.dash,
  };
}

/**
 * The core's overall posture. Every branch is driven by a measured fact, and
 * `idle` is the honest default when nothing has been observed.
 */
export type CorePosture = 'active' | 'assembled' | 'fractured' | 'holding' | 'idle';

export type PostureInput = {
  runtimeRunning: boolean;
  verification: VerificationStatus;
  stageIndex: number;
  stageCount: number;
  nodeCount: number;
};

export function corePosture(input: PostureInput): CorePosture {
  const ringState = toRingState(input.verification);
  if (ringState === 'fail') return 'fractured';
  if (input.runtimeRunning) return 'active';
  if (ringState === 'pass' && input.stageIndex >= input.stageCount - 2) return 'assembled';
  if (input.nodeCount === 0) return 'idle';
  return 'holding';
}

/** Amplitude for the deterministic breathing motion. Reduced motion passes 0. */
export function coreAmplitude(reducedMotion: boolean, posture: CorePosture): number {
  if (reducedMotion) return 0;
  switch (posture) {
    case 'active':
      return 1;
    case 'assembled':
      return 0.45;
    case 'fractured':
      return 0.8;
    case 'holding':
      return 0.5;
    default:
      return 0.3;
  }
}

/**
 * Count nodes per domain from the adapter graph, without inventing any.
 * Domains absent from the graph are simply absent from the result.
 */
export function domainCounts(
  nodes: readonly { domain: ProjectNodeDomain }[],
): Partial<Record<ProjectNodeDomain, number>> {
  const counts: Partial<Record<ProjectNodeDomain, number>> = {};
  for (const node of nodes) {
    counts[node.domain] = (counts[node.domain] ?? 0) + 1;
  }
  return counts;
}

export function maxCount(counts: Partial<Record<ProjectNodeDomain, number>>): number {
  return Object.values(counts).reduce<number>((max, value) => {
    const numeric = value ?? 0;
    return numeric > max ? numeric : max;
  }, 0);
}
