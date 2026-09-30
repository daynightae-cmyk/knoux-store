import { hashString, mulberry32 } from './seeded';

export type EvidenceKind = 'verified' | 'alias' | 'business' | 'public' | 'reputation';

export type EvidenceCategory =
  | 'VERIFIED_CLAIM'
  | 'COMMUNITY_ALIAS'
  | 'BUSINESS_IDENTITY'
  | 'PUBLIC_WEB_MENTION'
  | 'REPUTATION';

export type EvidenceNode = {
  id: string;
  label: string;
  meta: string;
  kind: EvidenceKind;
  category: EvidenceCategory;
  details: Array<[string, string]>;
  url?: string;
  support?: number;
  sourceId?: string;
  publisher?: string;
  retrievedAt?: string;
};

type RingSpec = {
  radiusX: number;
  radiusY: number;
  phase: number;
  depth: number;
};

const RINGS: Record<EvidenceCategory, RingSpec> = {
  VERIFIED_CLAIM: { radiusX: 18, radiusY: 12, phase: -0.65, depth: 1 },
  COMMUNITY_ALIAS: { radiusX: 24, radiusY: 17, phase: 0.35, depth: 2 },
  BUSINESS_IDENTITY: { radiusX: 31, radiusY: 22, phase: 1.0, depth: 3 },
  PUBLIC_WEB_MENTION: { radiusX: 37, radiusY: 27, phase: -0.25, depth: 4 },
  REPUTATION: { radiusX: 39, radiusY: 29, phase: 1.55, depth: 5 },
};
export type EvidencePlacement = {
  id: string;
  left: number;
  top: number;
  depth: number;
};

export function layoutEvidence(
  nodes: readonly EvidenceNode[],
  seedKey: string,
): EvidencePlacement[] {
  const seed = hashString(seedKey || 'knoux-signal');
  const counts = new Map<EvidenceCategory, number>();
  nodes.forEach((node) => counts.set(node.category, (counts.get(node.category) ?? 0) + 1));

  const seen = new Map<EvidenceCategory, number>();
  return nodes.map((node, index) => {
    const spec = RINGS[node.category];
    const count = Math.max(1, counts.get(node.category) ?? 1);
    const position = seen.get(node.category) ?? 0;
    seen.set(node.category, position + 1);

    const random = mulberry32(seed ^ hashString(node.id) ^ (index * 0x9e3779b1));
    const angle = spec.phase + (position / count) * Math.PI * 2 + (random() - 0.5) * 0.18;
    const left = 50 + Math.cos(angle) * spec.radiusX;
    const top = 50 + Math.sin(angle) * spec.radiusY;

    return {
      id: node.id,
      left: Math.max(7, Math.min(93, left)),
      top: Math.max(10, Math.min(90, top)),
      depth: spec.depth,
    };
  });
}

export function placementMap(
  nodes: readonly EvidenceNode[],
  seedKey: string,
): Map<string, EvidencePlacement> {
  return new Map(layoutEvidence(nodes, seedKey).map((placement) => [placement.id, placement]));
}
