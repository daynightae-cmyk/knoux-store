/**
 * KNOuX Growth — Command Center area registry.
 *
 * Declared in the data layer rather than in the component layer because the site
 * navigation also needs it for breadcrumbs, and `src/data/navigation.ts` must
 * not depend on a component module.
 *
 * The public marketing site and this operating console are different
 * navigations for different audiences: `src/data/navigation.ts` is divisions
 * and long-tail marketing pages, and this file is a workspace with a client
 * switcher. They stay separate so neither has to compromise.
 */

export type CommandArea = {
  slug: string;
  label: string;
  code: string;
  purpose: string;
};

export type CommandGroup = {
  label: string;
  areas: CommandArea[];
};

/** The fifteen areas, grouped the way an operator works. */
export const COMMAND_GROUPS: readonly CommandGroup[] = [
  {
    label: 'Situation',
    areas: [
      { slug: '', label: 'Overview', code: '01', purpose: 'What is running, what needs a decision, and what is not connected.' },
      { slug: 'analytics', label: 'Analytics', code: '02', purpose: 'Cross-platform performance, normalised. Missing metrics stay missing.' },
      { slug: 'google', label: 'Google Presence', code: '03', purpose: 'Business Profile, Maps visibility, calls, reviews and Search Console.' },
      { slug: 'reports', label: 'Reports', code: '04', purpose: 'Client-facing reports, print-ready, in English and Arabic.' },
    ],
  },
  {
    label: 'Clients',
    areas: [
      { slug: 'clients', label: 'Clients', code: '05', purpose: 'Independent workspaces: brand, branches, connections, memory.' },
      { slug: 'campaigns', label: 'Campaigns', code: '06', purpose: 'Campaign construction and the approval gate before any spend.' },
      { slug: 'leads', label: 'Leads & Inbox', code: '07', purpose: 'Normalised lead pipeline with source attribution.' },
    ],
  },
  {
    label: 'Making',
    areas: [
      { slug: 'creative', label: 'Creative Studio', code: '08', purpose: 'Concepts, copy and scripts as editable drafts against brand rules.' },
      { slug: 'social', label: 'Social', code: '09', purpose: 'Organic content, the calendar, and what is scheduled versus published.' },
      { slug: 'communities', label: 'Communities', code: '10', purpose: 'Discovery, verification, and the manual-assisted distribution queue.' },
    ],
  },
  {
    label: 'Control',
    areas: [
      { slug: 'intelligence', label: 'KNOuX Intelligence', code: '11', purpose: 'The intelligence layer: which families exist, which provider answers, and what it cannot do.' },
      { slug: 'automations', label: 'Automations', code: '12', purpose: 'Advisory rules. Nothing here can spend or publish.' },
      { slug: 'connections', label: 'Connections', code: '13', purpose: 'Capability registry and truthful state for every platform.' },
      { slug: 'settings', label: 'Settings', code: '14', purpose: 'Autonomy mode, roles, audit trail and the safety posture of this workspace.' },
    ],
  },
];

export const COMMAND_AREAS: readonly CommandArea[] = COMMAND_GROUPS.flatMap((group) => group.areas);

export const COMMAND_AREAS_BY_SLUG: Readonly<Record<string, CommandArea>> = Object.fromEntries(
  COMMAND_AREAS.filter((area) => area.slug).map((area) => [area.slug, area]),
);

export function areaHref(slug: string): string {
  return slug ? `/command/${slug}` : '/command';
}

export function areaBySlug(slug: string): CommandArea | undefined {
  return COMMAND_AREAS.find((area) => area.slug === slug);
}

/**
 * Command-dock actions.
 *
 * Each maps onto exactly one intelligence intent, so the dock cannot offer a
 * capability the intelligence layer does not have.
 */
export type DockAction = {
  id: string;
  label: string;
  intent: string;
  /** Gated off when the workspace holds no credential. */
  requiresConnection?: boolean;
};

export const DOCK_ACTIONS: readonly DockAction[] = [
  { id: 'create_campaign', label: 'Create Campaign', intent: 'PLAN_CAMPAIGN' },
  { id: 'analyse', label: 'Analyze Performance', intent: 'ANALYZE_PERFORMANCE' },
  { id: 'audiences', label: 'Find New Audiences', intent: 'FIND_AUDIENCES' },
  { id: 'create_content', label: 'Create Content', intent: 'DRAFT_CONTENT' },
  { id: 'check_leads', label: 'Check Leads', intent: 'QUALIFY_LEADS' },
  { id: 'optimise', label: 'Optimize Budget', intent: 'PLAN_CAMPAIGN' },
  { id: 'landing_page', label: 'Build Landing Page', intent: 'BUILD_LANDING_PAGE' },
  { id: 'report', label: 'Generate Report', intent: 'GENERATE_REPORT' },
  { id: 'competitors', label: 'Research Competitors', intent: 'RESEARCH' },
  { id: 'distribute', label: 'Distribute Content', intent: 'FIND_COMMUNITIES' },
  { id: 'communities', label: 'Find Communities', intent: 'FIND_COMMUNITIES' },
  { id: 'creative', label: 'Draft Creative', intent: 'DRAFT_CREATIVE' },
];