'use client';

import type { ComposerOrbNode, DivisionId, DiscoverableEntity } from './orb-types';
import { createEntityRandom } from './orb-types';

/**
 * Layout constants for the Orb.
 */
export const LAYOUT = {
  /** Nucleus radius. */
  NUCLEUS_RADIUS: 0.6,
  /** First ring (divisions) radius. */
  DIVISION_RADIUS: 2.0,
  /** Second ring (entities) radius range. */
  ENTITY_RADIUS_MIN: 3.2,
  ENTITY_RADIUS_MAX: 4.5,
  /** Vertical spread for entities. */
  ENTITY_VERTICAL_SPREAD: 1.8,
  /** Automatic rotation speed (radians per second). */
  AUTO_ROTATION_SPEED: 0.05,
  /** Damping factor for drag. */
  DRAG_DAMPING: 0.08,
} as const;

/**
 * Canonical division order for the Composer.
 * Matches DIVISION_ORDER in Composer.tsx
 */
export const DIVISION_ORDER: DivisionId[] = ['solutions', 'software', 'wordpress', 'web', 'growth', 'creative'];

/**
 * Computes a deterministic position on a sphere for a division node.
 * Uses the division id and its index in DIVISION_ORDER for stability.
 */
export function getDivisionPosition(division: DivisionId, index: number): [number, number, number] {
  // Use Fibonacci sphere distribution for even spacing
  const phi = Math.acos(1 - 2 * (index + 0.5) / DIVISION_ORDER.length);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index; // Golden angle

  const x = LAYOUT.DIVISION_RADIUS * Math.sin(phi) * Math.cos(theta);
  const y = LAYOUT.DIVISION_RADIUS * Math.sin(phi) * Math.sin(theta);
  const z = LAYOUT.DIVISION_RADIUS * Math.cos(phi);

  return [x, y, z];
}

/**
 * Computes a deterministic position for an entity node.
 * Uses entity id, division, and stable index for reproducible placement.
 * Entities are placed in a spherical shell around their division.
 */
export function getEntityPosition(
  entity: { id: string; division: DivisionId },
  divisionIndex: number,
  entityIndex: number,
  totalEntitiesInDivision: number
): [number, number, number] {
  const rand = createEntityRandom(entity.id, entity.division, entityIndex);

  // Base position from division
  const divPos = getDivisionPosition(entity.division, divisionIndex);

  // Entity orbits around its division at a stable radius
  const radius = LAYOUT.ENTITY_RADIUS_MIN + rand() * (LAYOUT.ENTITY_RADIUS_MAX - LAYOUT.ENTITY_RADIUS_MIN);

  // Use golden angle for horizontal distribution
  const theta = Math.PI * (1 + Math.sqrt(5)) * entityIndex;

  // Vertical distribution based on index
  const phi = Math.acos(1 - 2 * (entityIndex + 0.5) / Math.max(1, totalEntitiesInDivision));

  // Offset from division position
  const offsetX = radius * Math.sin(phi) * Math.cos(theta);
  const offsetY = radius * Math.sin(phi) * Math.sin(theta);
  const offsetZ = radius * Math.cos(phi);

  return [
    divPos[0] + offsetX * 0.3,
    divPos[1] + offsetY * 0.3,
    divPos[2] + offsetZ * 0.3,
  ];
}

export function getNucleusPosition(): [number, number, number] {
  return [0, 0, 0];
}

/**
 * Derives the complete visual model from Composer state.
 * This is the single source of truth for the Orb's visual data.
 */
export function deriveOrbModel(
  stack: { division: DivisionId; items: { entity: DiscoverableEntity; reason: string }[] }[],
  selectedEntityId: string | null,
  evaluated: string | null,
  typing: boolean
): {
  nucleus: ComposerOrbNode;
  divisions: ComposerOrbNode[];
  entities: ComposerOrbNode[];
  selectedId: string | null;
  resolved: boolean;
  typing: boolean;
} {
  const resolved = evaluated !== null;
  const nucleus: ComposerOrbNode = {
    id: 'nucleus',
    code: 'KNX',
    label: 'KNOuX / COMPOSER',
    division: 'solutions',
    summary: 'Deterministic intent engine over KNOuX registries',
    selected: false,
    kind: 'nucleus',
    position: getNucleusPosition(),
    emphasis: 'primary',
  };

  const divisions: ComposerOrbNode[] = [];
  const entities: ComposerOrbNode[] = [];

  // Only include divisions that have matched entities
  const relevantDivisions = stack.filter((group) => group.items.length > 0);

  for (let divIdx = 0; divIdx < relevantDivisions.length; divIdx++) {
    const group = relevantDivisions[divIdx];
    const division = group.division;

    // Division node
    const divPosition = getDivisionPosition(division, DIVISION_ORDER.indexOf(division));
    const divisionNode: ComposerOrbNode = {
      id: `div-${division}`,
      code: division.toUpperCase().slice(0, 2),
      label: division.charAt(0).toUpperCase() + division.slice(1),
      division,
      summary: `${group.items.length} item${group.items.length === 1 ? '' : 's'} matched`,
      selected: false,
      kind: 'division',
      position: divPosition,
      emphasis: 'secondary',
    };
    divisions.push(divisionNode);

    // Entity nodes
    for (let entIdx = 0; entIdx < group.items.length; entIdx++) {
      const entry = group.items[entIdx];
      const entity = entry.entity;
      const isSelected = entity.id === selectedEntityId;

      const entPosition = getEntityPosition(entity, DIVISION_ORDER.indexOf(division), entIdx, group.items.length);

      const entityNode: ComposerOrbNode = {
        id: entity.id,
        code: entity.code,
        label: entity.shortName || entity.name,
        division: entity.division,
        route: entity.route || undefined,
        summary: entity.summary,
        selected: isSelected,
        reason: entry.reason,
        kind: 'entity',
        entityKind: entity.kind,
        position: entPosition,
        emphasis: isSelected ? 'primary' : 'secondary',
      };
      entities.push(entityNode);
    }
  }

  return {
    nucleus,
    divisions,
    entities,
    selectedId: selectedEntityId,
    resolved,
    typing,
  };
}

/**
 * Computes connector lines between nucleus -> division -> entity.
 * Returns array of [start, end] point pairs.
 */
export function computeConnectors(
  nucleus: ComposerOrbNode,
  divisions: ComposerOrbNode[],
  entities: ComposerOrbNode[]
): Array<{ start: [number, number, number]; end: [number, number, number]; emphasis: 'primary' | 'secondary' | 'muted' }> {
  const connectors: Array<{ start: [number, number, number]; end: [number, number, number]; emphasis: 'primary' | 'secondary' | 'muted' }> = [];

  // Nucleus to divisions
  for (const div of divisions) {
    connectors.push({
      start: nucleus.position,
      end: div.position,
      emphasis: 'muted',
    });
  }

  // Divisions to entities
  for (const entity of entities) {
    const parentDiv = divisions.find((d) => d.division === entity.division);
    if (parentDiv) {
      connectors.push({
        start: parentDiv.position,
        end: entity.position,
        emphasis: entity.emphasis === 'primary' ? 'primary' : 'secondary',
      });
    }
  }

  return connectors;
}