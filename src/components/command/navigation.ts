/**
 * Command Center — navigation model.
 *
 * Declared here rather than in `src/data/navigation.ts` on purpose: that file is
 * the public marketing site's division model, and this is the operational
 * workspace's model. They are different navigations for different audiences, and
 * merging them would put an operating console into a storefront header.
 *
 * The fifteen areas are the mission's list, grouped the way an operator works:
 * what is happening, what is being made, what needs a decision, and what the
 * machine is connected to.
 */

export type CommandArea = {
  slug: string;
  label: string;
  code: string;
  /** One line of what the screen is for. Rendered on the page, not the rail. */
  purpose: string;
};

export type CommandGroup = {
  label: string;
  areas: CommandArea[];
};

export const COMMAND_GROUPS: readonly CommandGroup[] = [
  {
    label: 'Situation',
    areas: [
      {
        slug: '',
        label: 'Overview',
        code: '01',
        purpose: 'What is running, what needs a decision, and what is not connected.',
      },
      {
        slug: 'analytics',
        label: 'Analytics',
        code: '02',
        purpose: 'Cross-platform performance, normalised. Missing metrics stay missing.',
      },
      {
        slug: 'google',
        label: 'Google Presence',
        code: '03',
        purpose: 'Business Profile, Maps visibility, calls, reviews and Search Console.',
      },
      {
        slug: 'reports',
        label: 'Reports',
        code: '04',
        purpose: 'Client-facing reports, print-ready, in English and Arabic.',
      },
    ],
  },
  {
    label: 'Clients',
    areas: [
      {
        slug: 'clients',
        label: 'Clients',
        code: '05',
        purpose: 'Independent workspaces: brand, branches, connections, memory.',
      },
      {
        slug: 'campaigns',
        label: 'Campaigns',
        code: '06',
        purpose: 'Campaign construction and the approval gate before any spend.',
      },
      {
        slug: 'leads',
        label: 'Leads & Inbox',
        code: '07',
        purpose: 'Normalised lead pipeline with source attribution.',
      },
    ],
  },
  {
    label: 'Making',
    areas: [
      {
        slug: 'creative',
        label: 'Creative Studio',
        code: '08',
        purpose: 'Concepts, copy and scripts as editable drafts against brand rules.',
      },
      {
        slug: 'social',
        label: 'Social',
        code: '09',
        purpose: 'Organic content, the calendar, and what is scheduled versus published.',
      },
      {
        slug: 'communities',
        label: 'Communities',
        code: '10',
        purpose: 'Discovery, verification, and the manual-assisted distribution queue.',
      },
    ],
  },
  {
    label: 'Control',
    areas: [
      {
        slug: 'intelligence',
        label: 'KNOuX Intelligence',
        code: '11',
        purpose: 'The intelligence layer: which families exist, which provider answers, and what it cannot do.',
      },
      {
        slug: 'automations',
        label: 'Automations',
        code: '12',
        purpose: 'Advisory rules. Nothing here can spend or publish.',
      },
      {
        slug: 'connections',
        label: 'Connections',
        code: '13',
        purpose: 'Capability registry and truthful state for every platform.',
      },
      {
        slug: 'settings',
        label: 'Settings',
        code: '14',
        purpose: 'Autonomy mode, roles, audit trail and the safety posture of this workspace.',
      },
    ],
  },
];

export const ALL_COMMAND_AREAS: readonly CommandArea[] = COMMAND_GROUPS.flatMap((group) => group.areas);

export function areaHref(slug: string): string {
  return slug ? `/command/${slug}` : '/command';
}

export function areaBySlug(slug: string): CommandArea | undefined {
  return ALL_COMMAND_AREAS.find((area) => area.slug === slug);
}

/**
 * Command-dock actions.
 *
 * Each maps onto exactly one intelligence intent, so the dock cannot drift into
 * offering a capability the intelligence layer does not have.
 */
export type DockAction = {
  id: string;
  label: string;
  intent: string;
  /** Some actions are meaningless without a credential; these are gated. */
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