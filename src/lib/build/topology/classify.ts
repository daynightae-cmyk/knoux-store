import type { EngineeringPlan } from '../engineering-plan';
import type { PlanSection, TopologyNode } from './types';

/** Grouping only. A product family contributes no features, routes or edges. */
export function classifyProduct(plan: Partial<EngineeringPlan>) {
  const source = [...(plan.GOAL ?? []), ...(plan['PRODUCT TYPE'] ?? [])].join(' ').toLowerCase();
  const groups = [['DELIVERY', /\bdelivery|courier|dispatch\b/], ['ECOMMERCE', /\becommerce|e-commerce|storefront\b/], ['ACADEMY', /\bacademy|learning|course\b/], ['CRM', /\bcrm|customer relationship\b/], ['MARKETPLACE', /\bmarketplace\b/], ['SAAS', /\bsaas\b/], ['PORTAL', /\bportal\b/], ['INTERNAL TOOL', /\binternal tool\b/]] as const;
  return groups.find(([, pattern]) => pattern.test(source))?.[0] ?? 'SYSTEM';
}

export function classifyLine(section: PlanSection, source: string): TopologyNode['kind'] {
  if (/\b(no |without |not required|not included|out of scope|unknown|unavailable|not connected)/i.test(source)) return 'constraint';
  const kinds: Partial<Record<PlanSection, TopologyNode['kind']>> = { ARCHITECTURE: 'architecture', ROUTES: 'route', 'DATA MODEL': 'data', AUTH: 'auth', INTEGRATIONS: 'integration', 'UI SYSTEM': 'ui', 'TEST PLAN': 'test', 'DEPLOYMENT PLAN': 'deployment', 'FILES / MODULES': 'module', RISKS: 'constraint' };
  return kinds[section] ?? 'proposal';
}
