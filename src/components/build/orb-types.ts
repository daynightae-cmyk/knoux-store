'use client';

import type { DivisionId, DiscoverableEntity, EntityKind } from '@/lib/entities';
import * as THREE from 'three';

export type { DivisionId, DiscoverableEntity };
/**
 * Visual node contract for the Build Intelligence Orb.
 * Derived from real Composer result — never the source of truth.
 */
export type ComposerOrbNode = {
  /** Stable entity id from the registry. */
  id: string;
  /** Short display code such as 'SW-01' or 'WP-TH'. */
  code: string;
  /** Human-readable label. */
  label: string;
  /** Division this node belongs to. */
  division: DivisionId;
  /** Canonical public route, if routable. */
  route?: string;
  /** Compact summary from the entity. */
  summary: string;
  /** Whether this node is currently selected. */
  selected: boolean;
  /** Match reason from Composer, or 'Added manually'. */
  reason?: string;
  /** Node kind for layout: 'nucleus' | 'division' | 'entity'. */
  kind: 'nucleus' | 'division' | 'entity';
  /** Real registry kind for entity nodes. */
  entityKind?: EntityKind;
  /** Deterministic position in 3D space. */
  position: [number, number, number];
  /** Visual emphasis level. */
  emphasis: 'primary' | 'secondary' | 'muted';
  /** Internal ref for Three.js mesh (not serialized). */
  meshRef?: React.RefObject<THREE.Object3D>;
};

/**
 * Complete visual model passed to the Orb.
 */
export type BuildComposerOrbModel = {
  /** Central nucleus node. */
  nucleus: ComposerOrbNode;
  /** Division nodes (only those with matched entities). */
  divisions: ComposerOrbNode[];
  /** Entity nodes from the current stack. */
  entities: ComposerOrbNode[];
  /** Currently selected node id. */
  selectedId: string | null;
  /** Whether we are in the Assemble/resolved state. */
  resolved: boolean;
  /** Whether the user is actively typing. */
  typing: boolean;
};

/**
 * Props for the BuildComposerOrb component.
 */
export type BuildComposerOrbProps = {
  /** Derived visual model from Composer state. */
  model: BuildComposerOrbModel;
  /** Called when a node is selected (hover/click/keyboard). */
  onSelect: (node: ComposerOrbNode | null) => void;
  /** Called when a node is activated (click/Enter/Space). */
  onActivate: (node: ComposerOrbNode) => void;
  /** Reduced motion preference. */
  reducedMotion: boolean;
  /** Whether the canvas is currently visible and should animate. */
  active?: boolean;
};

/**
 * Creates a deterministic hash from a string.
 * Used for stable positioning without Math.random().
 */
export function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Creates a seeded pseudo-random generator for deterministic values.
 * Same seed always produces same sequence.
 */
export function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Creates a deterministic random generator for an entity.
 * Combines entity id, division, and stable index for unique but stable seed.
 */
export function createEntityRandom(entityId: string, division: DivisionId, index: number) {
  const seed = stableHash(`${entityId}|${division}|${index}`);
  return createSeededRandom(seed);
}