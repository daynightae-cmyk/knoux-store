import type { PLAN_SECTIONS } from '../engineering-plan';

export type PlanSection = (typeof PLAN_SECTIONS)[number];
export type Provenance = { section: PlanSection; line: number; source: string };
export type TopologyNode = { id: string; label: string; kind: 'architecture' | 'route' | 'data' | 'auth' | 'integration' | 'ui' | 'test' | 'deployment' | 'module' | 'constraint' | 'proposal'; provenance: Provenance; entity: string | null };
export type TopologyEdge = { id: string; from: string; to: string; kind: 'explicit-reference'; provenance: Provenance };
export type ProductTopology = { product: string; nodes: TopologyNode[]; edges: TopologyEdge[] };
