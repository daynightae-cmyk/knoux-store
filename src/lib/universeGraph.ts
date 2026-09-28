/**
 * KNOuX Universe graph.
 *
 * The spatial model behind the second homepage block. It is deliberately a
 * *model* and not a *renderer*: it turns the audited software registry into a
 * positioned, layered graph and hands the result to whichever surface draws it
 * (Canvas 2D for the field, DOM for the labels and the inspector).
 *
 * Three rules hold this together.
 *
 * One — data truth. Every node is a real registry entry. Products come from
 * `softwareProducts`; the second layer is the capability statements those
 * products publish about themselves; cross-links come from `relatedIds`. No
 * node, label, capability or relationship is invented here, and a capability
 * label is a verbatim prefix of the statement it abbreviates rather than a
 * summary written for the graph.
 *
 * Two — determinism. Placement is derived from the registry's own `topology`
 * (orbit and angle), and the only procedural variation comes from a hash of
 * stable ids. `Math.random()` would redraw the institution's identity on every
 * refresh, so the same registry renders the same composition on every load, at
 * every width, in every build. The ambient star field is the same field the
 * homepage hero already draws, taken from `buildStarField`.
 *
 * Three — restraint. The opening composition is the core plus the verified
 * products and nothing else. Capability layers exist but are collapsed until a
 * product is deliberately engaged, so the first read is a system rather than an
 * inventory.
 */

import { softwareProducts, softwareAuditDate, type SoftwareProduct } from '@/data/software';

/** Orbit radii, in world units, mirrored from the registry's own topology rings. */
const RADIUS_BY_ORBIT = { 1: 148, 2: 226, 3: 300 } as const;

/** The same three rings, for the renderer to draw as architectural datum. */
export const UNIVERSE_ORBITS: readonly number[] = [
  RADIUS_BY_ORBIT[1],
  RADIUS_BY_ORBIT[2],
  RADIUS_BY_ORBIT[3],
];

/** A slight vertical squash so the field reads as a plane seen at a shallow angle. */
const PLANE_SQUASH = 0.66;

/** Depth spread. Positive Z is nearer the reader, so nearer nodes are larger. */
const CORE_Z = 46;
const PRODUCT_Z_SPREAD = 62;
const CAPABILITY_Z_SPREAD = 44;
const CAPABILITY_RING = 44;
const RELATED_ARC = 0.19;

export type UniverseLayer = 'core' | 'product' | 'capability';

export type UniverseNodeKind = 'hierarchy' | 'related';

export type UniverseNode = {
  id: string;
  layer: UniverseLayer;
  depth: 0 | 1 | 2;
  parentId: string | null;
  /** World-space position. The registry topology, lifted into three dimensions. */
  x: number;
  y: number;
  z: number;
  /** Short visual label. Never longer than the field can legibly carry. */
  label: string;
  /** Technical index. `SW-03`, or `SW-03.C2` for a capability. */
  code: string;
  /** The verified sentence a capability node abbreviates, when there is one. */
  statement?: string;
  /** Registry product behind a product or capability node. */
  productId: string;
  relatedIds: string[];
  /** Stable phase for this node's own idle behaviour, in 0..1. */
  phase: number;
};

export type UniverseEdge = {
  key: string;
  source: string;
  target: string;
  kind: UniverseEdgeKind;
  /** 0..1 seeded offset, so signals do not all leave at the same instant. */
  phase: number;
};

export type UniverseEdgeKind = UniverseNodeKind;

export const UNIVERSE_CORE_ID = 'knoux-core';

/**
 * Mulberry32, the generator the Living Particle Mark samples from. Kept local
 * and seeded per key so this module has no dependency on the renderer's copy
 * and no shared mutable state between nodes.
 */
function seeded(seed: number): () => number {
  let state = (seed + 0x6d2b79f5) | 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. A stable string hash, so a key always maps to the same value. */
export function hashKey(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** One deterministic value in 0..1 for a key. */
export function seededUnit(key: string): number {
  return seeded(hashKey(key))();
}

function signed(key: string, amount: number): number {
  return (seededUnit(key) * 2 - 1) * amount;
}

/**
 * A capability label.
 *
 * The first clause of the verified statement, truncated. This is a prefix, not
 * a paraphrase, so the node and the inspector cannot disagree. The full sentence
 * travels with the node and is what the inspector and the accessible name use.
 */
export function capabilityLabel(statement: string, limit = 34): string {
  const firstClause = statement.split(/[,;]/)[0]?.trim() ?? statement.trim();
  const text = firstClause.length < 4 ? statement.trim() : firstClause;
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

/** World position of a product, taken from the registry's own topology. */
export function productAnchor(product: SoftwareProduct): { x: number; y: number; z: number } {
  const { orbit, angleDeg } = product.topology;
  const radius = RADIUS_BY_ORBIT[orbit];
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: Math.sin(radians) * radius,
    y: -Math.cos(radians) * radius * PLANE_SQUASH,
    // Depth is a seeded function of the product id, so a product's place in the
    // depth stack is fixed without the registry having to carry a z coordinate.
    z: signed(`${product.id}:depth`, PRODUCT_Z_SPREAD / 2),
  };
}

/**
 * The whole graph, built once per registry.
 *
 * Layer one is the verified products. Layer two is each product's own published
 * capabilities, fanned around it on a ring and collapsed by default. The
 * registry's `relatedIds` become the cross-links between products.
 */
export function buildUniverseGraph(
  products: readonly SoftwareProduct[] = softwareProducts,
): { nodes: UniverseNode[]; edges: UniverseEdge[]; auditDate: string } {
  const nodes: UniverseNode[] = [
    {
      id: UNIVERSE_CORE_ID,
      layer: 'core',
      depth: 0,
      parentId: null,
      x: 0,
      y: 0,
      z: CORE_Z,
      label: 'KNOuX',
      code: 'CORE',
      productId: '',
      relatedIds: products.map((product) => product.id),
      phase: 0.5,
    },
  ];

  const edges: UniverseEdge[] = [];
  const anchors = new Map<string, { x: number; y: number; z: number }>();

  for (const product of products) {
    const anchor = productAnchor(product);
    anchors.set(product.id, anchor);
    nodes.push({
      id: product.id,
      layer: 'product',
      depth: 1,
      parentId: UNIVERSE_CORE_ID,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      label: product.shortName,
      code: product.code,
      productId: product.id,
      relatedIds: [...product.relatedIds],
      phase: seededUnit(`${product.id}:phase`),
    });
    edges.push({
      key: `${UNIVERSE_CORE_ID}>${product.id}`,
      source: UNIVERSE_CORE_ID,
      target: product.id,
      kind: 'hierarchy',
      phase: seededUnit(`${product.id}:link`),
    });
  }

  for (const product of products) {
    const parent = anchors.get(product.id);
    if (!parent) continue;
    const capabilities = product.capabilities;

    capabilities.forEach((statement, index) => {
      const id = `${product.id}.c${index + 1}`;
      // A fan around the parent's own bearing, so a capability always sits on
      // the same side of the core as the system it belongs to. The reach
      // alternates outward and inward, which wraps the layer around its own
      // system instead of building a second ring outside the composition.
      const spread = capabilities.length > 1 ? (index / (capabilities.length - 1) - 0.5) * 2 : 0;
      const angle = Math.atan2(parent.y, parent.x) + spread * 0.9;
      const reach =
        (index % 2 === 1 ? 1 : -1) * CAPABILITY_RING * (0.8 + seededUnit(`${id}:reach`) * 0.34);

      nodes.push({
        id,
        layer: 'capability',
        depth: 2,
        parentId: product.id,
        x: parent.x + Math.cos(angle) * reach,
        y: parent.y + Math.sin(angle) * reach * PLANE_SQUASH,
        z: parent.z + signed(`${id}:depth`, CAPABILITY_Z_SPREAD / 2),
        label: capabilityLabel(statement),
        code: `${product.code}.C${index + 1}`,
        statement,
        productId: product.id,
        relatedIds: [],
        phase: seededUnit(`${id}:phase`),
      });

      edges.push({
        key: `${product.id}>${id}`,
        source: product.id,
        target: id,
        kind: 'hierarchy',
        phase: seededUnit(`${id}:link`),
      });
    });
  }

  const seen = new Set<string>();
  for (const product of products) {
    for (const otherId of product.relatedIds) {
      if (!anchors.has(otherId)) continue;
      const key = [product.id, otherId].sort().join('~');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        key,
        source: product.id,
        target: otherId,
        kind: 'related',
        phase: seededUnit(`${key}:link`),
      });
    }
  }

  return { nodes, edges, auditDate: softwareAuditDate };
}

export type UniverseGraph = ReturnType<typeof buildUniverseGraph>;

function byId(graph: UniverseGraph): Map<string, UniverseNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

/**
 * Which nodes are on screen.
 *
 * The opening state is the core, the verified products and the cross-links the
 * registry states. A product's capability layer appears only once that product
 * is deliberately expanded, and expanding a second product adds its layer too
 * rather than replacing the first, so spatial context accumulates and is
 * collapsed back rather than redrawn.
 */
export function visibleUniverse(
  graph: UniverseGraph,
  expanded: ReadonlySet<string>,
): Set<string> {
  const visible = new Set<string>([UNIVERSE_CORE_ID]);
  const index = byId(graph);

  for (const node of graph.nodes) {
    if (node.depth <= 1) {
      visible.add(node.id);
      continue;
    }
    const parent = node.parentId ? index.get(node.parentId) : undefined;
    if (parent && expanded.has(parent.id)) visible.add(node.id);
  }

  return visible;
}

/** Edges between two visible nodes. Decorative edges never receive pointer events. */
export function visibleEdges(graph: UniverseGraph, visible: ReadonlySet<string>): UniverseEdge[] {
  return graph.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target));
}

/** Every capability node belonging to a product, in registry order. */
export function capabilitiesOf(graph: UniverseGraph, productId: string): UniverseNode[] {
  return graph.nodes.filter((node) => node.layer === 'capability' && node.productId === productId);
}

/**
 * A perspective camera over the graph.
 *
 * A fixed focal length, a fixed eye distance and no rotation. The only controls
 * are a bounded zoom and a target the field eases toward, which is what keeps
 * this a considered camera rather than an orbit toy.
 */
export const CAMERA = {
  focal: 1320,
  distance: 900,
  minZoom: 0.78,
  maxZoom: 1.42,
  /** How far the eased camera target may travel from the core, in world units. */
  panLimit: 210,
} as const;

export type ProjectedNode = {
  node: UniverseNode;
  /** Screen position in the field's own coordinate space, centred on the camera. */
  screenX: number;
  screenY: number;
  /** Pixels per world unit at this node's depth. */
  scale: number;
  /** 0..1, far to near, derived from depth. Drives size, opacity and bloom. */
  depth: number;
};

/** Perspective projection plus a bounded, eased camera target. */
export function projectNode(
  node: UniverseNode,
  camera: { x: number; y: number; zoom: number },
): Pick<ProjectedNode, 'screenX' | 'screenY' | 'scale' | 'depth'> {
  const dx = node.x - camera.x;
  const dy = node.y - camera.y;
  const dz = node.z + CAMERA.distance;
  const scale = (CAMERA.focal * camera.zoom) / Math.max(120, dz);

  // Depth is measured against the widest Z in the graph rather than a constant,
  // so the near/far relationship stays stable if the registry's depth spread
  // changes.
  const near = CORE_Z + PRODUCT_Z_SPREAD;
  const far = -PRODUCT_Z_SPREAD;
  const depth = Math.max(0, Math.min(1, (node.z - far) / (near - far)));

  return { screenX: dx * scale, screenY: dy * scale, scale, depth };
}

/** A point in the rendered field's own pixel space. */
export type Vec2 = { x: number; y: number };

/**
 * A quadratic control point for a relationship path.
 *
 * Bowed perpendicular to the chord, so the field reads as arcs rather than a
 * radial diagram. The bow is signed per edge, which keeps a two-way
 * relationship from collapsing into one straight line.
 */
export function connectorControl(a: Vec2, b: Vec2, phase: number): Vec2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  // Alternate the bow direction so sibling edges of the same parent fan apart.
  const sign = phase < 0.5 ? 1 : -1;
  return {
    x: (a.x + b.x) / 2 + (-dy / length) * length * RELATED_ARC * sign,
    y: (a.y + b.y) / 2 + (dx / length) * length * RELATED_ARC * sign,
  };
}

/** A point along a quadratic path at t, used to place travelling signals. */
export function pointOnCurve(a: Vec2, control: Vec2, b: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
  };
}

/** Node radius in world units. Hierarchy is expressed as scale, never as hue. */
export const NODE_RADIUS = { core: 30, product: 15.5, capability: 7.5 } as const;

/**
 * The opening state of the field.
 *
 * The core holds the centre, the products keep their registry positions, and
 * nothing has been expanded yet. A first-time visitor therefore sees a system,
 * not a dump of every published capability.
 */
export function initialExpansion(): Set<string> {
  return new Set<string>();
}

/** Bounds that keep the camera target from leaving the graph. */
export function clampCameraTarget(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length <= CAMERA.panLimit) return { x, y };
  const ratio = CAMERA.panLimit / length;
  return { x: x * ratio, y: y * ratio };
}
