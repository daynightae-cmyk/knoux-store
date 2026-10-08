import { PLAN_SECTIONS } from '../engineering-plan';
import type { ProductTopology } from './types';

/** Fixed semantic lanes; normalized coordinates stay bounded on every viewport. */
export function layoutTopology(topology: ProductTopology) {
  const counts = new Map<string, number>();
  for (const node of topology.nodes) counts.set(node.provenance.section, (counts.get(node.provenance.section) ?? 0) + 1);
  return topology.nodes.map((node) => {
    const section = PLAN_SECTIONS.indexOf(node.provenance.section);
    const lane = section % 4;
    const row = Math.floor(section / 4);
    return { ...node, x: 10 + lane * 26 + ((node.provenance.line - 1) % 3) * 2, y: 10 + row * 24 + (node.provenance.line - 1) / (counts.get(node.provenance.section) ?? 1) * 14 };
  });
}
