import { PLAN_SECTIONS, type EngineeringPlan } from './engineering-plan';
import type { Provenance } from './topology/types';

/** Section membership is schema structure, never a fabricated product dependency. */
export function buildPlanGraph(plan: Partial<EngineeringPlan>) {
  const sections = PLAN_SECTIONS.flatMap((section, index) => {
    const lines = plan[section];
    if (!lines?.length) return [];
    const angle = index / PLAN_SECTIONS.length * Math.PI * 2 - Math.PI / 2;
    return [{ id: `section-${index}`, label: section, x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 37, provenance: lines.map((source, line): Provenance => ({ section, line: line + 1, source })) }];
  });
  const leaves = sections.flatMap((section) => section.provenance.map((provenance) => ({ id: `${section.id}-line-${provenance.line}`, label: provenance.source, provenance })));
  const edges = leaves.map((leaf) => ({ from: `section-${PLAN_SECTIONS.indexOf(leaf.provenance.section)}`, to: leaf.id, kind: 'section-membership' as const, provenance: leaf.provenance }));
  return { sections, leaves, edges };
}
