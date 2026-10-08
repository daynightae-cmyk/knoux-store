import { PLAN_SECTIONS, type EngineeringPlan } from '../engineering-plan';
import { classifyLine, classifyProduct } from './classify';
import type { ProductTopology, TopologyNode } from './types';

/** Every line remains verbatim. Only an explicit named reference creates a relation. */
export function deriveTopology(plan: Partial<EngineeringPlan>): ProductTopology {
  const nodes: TopologyNode[] = PLAN_SECTIONS.flatMap((section, sectionIndex) => (plan[section] ?? []).map((source, index) => ({
    id: `source-${sectionIndex}-${index}`, label: source, kind: classifyLine(section, source),
    provenance: { section, line: index + 1, source },
    entity: source.match(/^`([^`]+)`/)?.[1] ?? source.match(/^([A-Z][\w-]+)\s*(?:\(|:|->|→|table\b|entity\b|references\b)/)?.[1] ?? source.match(/^\s*(\/[^\s,;]+)/)?.[1] ?? null,
  })));
  const edges: ProductTopology['edges'] = [];
  for (const node of nodes) {
    if (node.kind === 'constraint' || !/\b(references?|belongs to|uses?|calls?|connects?|depends on|links?|joins?|foreign key|via)\b|->|→/i.test(node.label)) continue;
    for (const target of nodes) {
      if (!target.entity || target.id === node.id || target.kind === 'constraint' || target.entity === node.entity) continue;
      const escaped = target.entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, 'i').test(node.label)) edges.push({ id: `${node.id}->${target.id}`, from: node.id, to: target.id, kind: 'explicit-reference', provenance: node.provenance });
    }
  }
  return { product: classifyProduct(plan), nodes, edges };
}
