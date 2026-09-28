/**
 * KNOuX Project Universe — cleaned interaction reference.
 *
 * Source role: derive mechanics from the supplied Omma 3D Mind Map only.
 * This is NOT production code and MUST NOT replace the accepted KNOuX Hero.
 * Target: second homepage block / Product Universe / Projects Map.
 *
 * Keep:
 * - hierarchical graph
 * - deterministic spatial layout
 * - progressive expand/collapse
 * - curved relationship connectors
 * - subtle signal particles
 * - focus / hover / keyboard / touch semantics
 * - optional drag on desktop
 *
 * Reject:
 * - demo content and palettes
 * - Math.random()
 * - external CDN imports / Google Fonts / remote HDR
 * - permanent extra renderer when current KNOuX scene can be reused
 * - rainbow glow, settings UI, fake telemetry
 */

export type UniverseNodeInput = {
  id: string;
  label: string;
  description?: string;
  route?: string;
  parentId?: string | null;
  relatedIds?: string[];
  children?: UniverseNodeInput[];
};

export type UniverseNode = {
  id: string;
  label: string;
  description: string;
  route?: string;
  parentId: string | null;
  relatedIds: string[];
  depth: number;
  x: number;
  y: number;
  z: number;
  collapsed: boolean;
};

export type UniverseEdge = {
  source: string;
  target: string;
  kind: "hierarchy" | "related";
};

export type UniverseGraph = {
  nodes: UniverseNode[];
  edges: UniverseEdge[];
};

const TAU = Math.PI * 2;
const RADIUS_BY_DEPTH = [0, 130, 82, 54] as const;

function hash32(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded01(key: string) {
  let x = hash32(key) || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967295;
}

function signedJitter(key: string, amount: number) {
  return (seeded01(key) * 2 - 1) * amount;
}

export function buildUniverseGraph(root: UniverseNodeInput): UniverseGraph {
  const nodes: UniverseNode[] = [];
  const edges: UniverseEdge[] = [];

  function visit(
    input: UniverseNodeInput,
    parent: UniverseNode | null,
    depth: number,
    siblingIndex: number,
    siblingCount: number,
  ) {
    const radius = RADIUS_BY_DEPTH[Math.min(depth, 3)] ?? 48;
    const angle = siblingCount > 0 ? (siblingIndex / siblingCount) * TAU : 0;
    const branchSeed = parent ? parent.id + ":" + input.id : input.id;

    const node: UniverseNode = {
      id: input.id,
      label: input.label,
      description: input.description ?? "",
      route: input.route,
      parentId: parent?.id ?? null,
      relatedIds: input.relatedIds ?? [],
      depth,
      x: parent ? parent.x + Math.cos(angle) * radius + signedJitter(branchSeed + ":x", 14) : 0,
      y: parent ? parent.y + Math.sin(angle) * radius * 0.72 + signedJitter(branchSeed + ":y", 10) : 0,
      z: parent ? parent.z + signedJitter(branchSeed + ":z", depth === 1 ? 34 : 20) : 0,
      collapsed: depth >= 2,
    };

    nodes.push(node);
    if (parent) edges.push({ source: parent.id, target: node.id, kind: "hierarchy" });

    const children = input.children ?? [];
    children.forEach((child, index) => visit(child, node, depth + 1, index, children.length));
  }

  visit(root, null, 0, 0, 1);

  const existing = new Set(nodes.map((node) => node.id));
  const seen = new Set<string>();
  for (const node of nodes) {
    for (const relatedId of node.relatedIds) {
      if (!existing.has(relatedId)) continue;
      const key = [node.id, relatedId].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: node.id, target: relatedId, kind: "related" });
    }
  }

  return { nodes, edges };
}

export function descendantsOf(graph: UniverseGraph, id: string) {
  const children = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "hierarchy") continue;
    const list = children.get(edge.source) ?? [];
    list.push(edge.target);
    children.set(edge.source, list);
  }

  const result = new Set<string>();
  const stack = [...(children.get(id) ?? [])];
  while (stack.length) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    stack.push(...(children.get(current) ?? []));
  }
  return result;
}

export function visibleNodeIds(
  graph: UniverseGraph,
  expanded: ReadonlySet<string>,
) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const visible = new Set<string>();

  for (const node of graph.nodes) {
    if (node.depth <= 1) {
      visible.add(node.id);
      continue;
    }

    let current = byId.get(node.parentId ?? "");
    let allowed = true;
    while (current) {
      if (current.depth >= 1 && !expanded.has(current.id)) {
        allowed = false;
        break;
      }
      current = byId.get(current.parentId ?? "");
    }
    if (allowed) visible.add(node.id);
  }

  return visible;
}

export function toggleExpanded(
  expanded: ReadonlySet<string>,
  nodeId: string,
) {
  const next = new Set(expanded);
  if (next.has(nodeId)) next.delete(nodeId);
  else next.add(nodeId);
  return next;
}

export function focusOffset(node: UniverseNode, activeId: string | null) {
  if (!activeId) return { x: 0, y: 0, z: 0 };
  if (node.id === activeId) return { x: node.x * -0.06, y: node.y * -0.06, z: 18 };
  if (node.relatedIds.includes(activeId)) {
    const k = seeded01(node.id + ":" + activeId);
    return { x: (k - 0.5) * 14, y: (0.5 - k) * 10, z: 8 };
  }
  return { x: 0, y: 0, z: -12 };
}

export function connectorControlPoint(a: UniverseNode, b: UniverseNode) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2 + 10,
    z: (a.z + b.z) / 2,
  };
}

export function signalPhase(edgeKey: string, elapsedSeconds: number) {
  const offset = seeded01(edgeKey);
  return (offset + elapsedSeconds * 0.16) % 1;
}

/**
 * Production adaptation contract:
 *
 * 1. Source all nodes from existing KNOuX registries only.
 * 2. Keep the accepted Hero untouched.
 * 3. Mount this experience in the second homepage block only.
 * 4. Prefer the existing ProductUniverse data/search/deep-link contract.
 * 5. Reuse the existing R3F/Three infrastructure; avoid a second permanent canvas.
 * 6. Desktop: hover/focus + optional drag + wheel/pinch zoom with strict bounds.
 * 7. Mobile: no hover dependency, no free camera; tap node -> inspector/bottom sheet.
 * 8. Escape closes inspector; focus returns to originating node.
 * 9. document.hidden / offscreen => pause nonessential animation.
 * 10. prefers-reduced-motion => no drift, signal travel, camera tween, or pointer parallax.
 * 11. Never fabricate capabilities, metrics, status, routes, repositories, or screenshots.
 */

/**
 * AUTHORITATIVE KNOuX UNIVERSE COLOR CONTRACT
 * Derived from the current production globals.css / accepted Hero.
 * Keep the Product Universe inside the same visual world.
 */
export const KNOuX_UNIVERSE_PALETTE = {
  background: '#08090a',
  surface: '#101113',
  surfaceRaised: '#16171a',
  text: '#f1eee8',
  muted: '#9a9899',
  dim: '#6d6e70',
  line: '#292a2d',
  violet: '#a18acb',
  violetSoft: '#c2b5d8',
  platinum: '#e6e2da',
  silver: '#b8b5b4',
  graphite: '#17171a',
  connector: '#51455b',
} as const;

export const KNOuX_NODE_STYLE = {
  core: {
    fill: KNOuX_UNIVERSE_PALETTE.platinum,
    emissive: KNOuX_UNIVERSE_PALETTE.violet,
    glowOpacity: 0.18,
  },
  product: {
    fill: KNOuX_UNIVERSE_PALETTE.violet,
    emissive: KNOuX_UNIVERSE_PALETTE.violet,
    glowOpacity: 0.14,
  },
  capability: {
    fill: KNOuX_UNIVERSE_PALETTE.silver,
    emissive: KNOuX_UNIVERSE_PALETTE.violetSoft,
    glowOpacity: 0.07,
  },
  dormant: {
    fill: KNOuX_UNIVERSE_PALETTE.dim,
    emissive: KNOuX_UNIVERSE_PALETTE.graphite,
    glowOpacity: 0.025,
  },
} as const;

/**
 * COLOR RULES:
 * - DO NOT assign unrelated rainbow hues per product/category.
 * - Product identity is expressed through scale, orbit, ring treatment,
 *   connector behavior, opacity and hierarchy — not arbitrary hue.
 * - Violet is the signal/accent color, not a full-screen flood.
 * - Core may use platinum/off-white with a restrained violet aura.
 * - Product nodes use violet / silver / graphite tonal variation.
 * - Capability nodes become quieter and more neutral with depth.
 * - Decorative stars/dust stay neutral silver/gray like the accepted Hero.
 * - Orange, cyan, green, yellow and pink from the Omma demo are forbidden
 *   unless an existing KNOuX semantic token explicitly requires them.
 */
