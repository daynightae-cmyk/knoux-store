import type { DiscoverableEntity, EntityStatus } from '@/lib/entities';

/**
 * KNOuX WordPress ecosystem registry.
 *
 * This catalogue is intentionally empty. No KNOuX WordPress theme, plugin,
 * block, starter site or bundle has been released, so none is listed. The
 * schema below is the one future releases will publish through, and the
 * division renders an explicit in-development state instead of filler.
 *
 * Nothing in this file may be populated to make the division look fuller than
 * it is. A release becomes an entry when a repository or a verified download
 * establishes it, and the fields it cannot establish stay absent.
 */

export type WordPressItemType =
  | 'theme'
  | 'starter-site'
  | 'block'
  | 'plugin'
  | 'woocommerce-extension'
  | 'integration'
  | 'bundle';

export type WordPressCategory = 'themes' | 'plugins' | 'blocks' | 'starter-sites' | 'solutions';

/** Pillar grouping used by the overview and by the composer rules. */
export type WordPressPillar = 'build' | 'extend' | 'operate' | 'grow';

export type WordPressItem = {
  id: string;
  slug: string;
  type: WordPressItemType;
  name: string;
  shortName: string;
  /** Every field below is optional. Absence means "not established". */
  summary?: string;
  description?: string;
  status: EntityStatus;
  version?: string;
  compatibility?: string[];
  wordpressVersion?: string;
  phpVersion?: string;
  woocommerceCompatibility?: string;
  categories: string[];
  tags: string[];
  features?: string[];
  /** Local asset paths under /public. Never remote hotlinks. */
  screenshots?: string[];
  icon?: string;
  demoUrl?: string;
  docsUrl?: string;
  repositoryUrl?: string;
  downloadUrl?: string;
  purchaseUrl?: string;
  license?: string;
  supportStatus?: string;
  updatedAt?: string;
  relatedItems: string[];
  /** Solution identifiers from `data/solutions.ts` that may include this item. */
  solutionTags: string[];
};

/**
 * Catalogue categories with their declared intent. `state` is honest and
 * visible; it is not a placeholder for content that does not exist.
 */
export const wordpressCategories: ReadonlyArray<{
  slug: WordPressCategory;
  label: string;
  type: WordPressItemType;
  index: string;
  intent: string;
  route: string;
}> = [
  {
    slug: 'themes',
    label: 'Themes',
    type: 'theme',
    index: 'WP-01',
    intent: 'Full site editing systems built for editorial control without a page builder dependency.',
    route: '/wordpress/themes',
  },
  {
    slug: 'plugins',
    label: 'Plugins',
    type: 'plugin',
    index: 'WP-02',
    intent: 'Extensions that add a capability, a workflow or an integration to an existing install.',
    route: '/wordpress/plugins',
  },
  {
    slug: 'blocks',
    label: 'Blocks',
    type: 'block',
    index: 'WP-03',
    intent: 'Reusable Gutenberg components that let editors assemble technical layouts safely.',
    route: '/wordpress/blocks',
  },
  {
    slug: 'starter-sites',
    label: 'Starter Sites',
    type: 'starter-site',
    index: 'WP-04',
    intent: 'Pre-architected foundations for a named business vertical, wired to real content models.',
    route: '/wordpress/starter-sites',
  },
  {
    slug: 'solutions',
    label: 'Bundles',
    type: 'bundle',
    index: 'WP-05',
    intent: 'Complete configurations pairing software, extensions and operating services for one outcome.',
    route: '/wordpress/solutions',
  },
];

/** Vertical filters for starter sites. Filters render regardless of catalogue size. */
export const starterSiteVerticals: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'corporate', label: 'Corporate' },
  { id: 'academy', label: 'Academy' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'store', label: 'Store' },
  { id: 'professional-services', label: 'Professional Services' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education' },
];

/** Operating groups inside the ecosystem overview. */
export const wordpressPillars: ReadonlyArray<{
  id: WordPressPillar;
  index: string;
  label: string;
  statement: string;
  activities: string[];
  categoryRoute: string | null;
}> = [
  {
    id: 'build',
    index: '01',
    label: 'Build',
    statement: 'The authoring layer: the structures an editor works inside every day.',
    activities: ['Themes', 'Starter Sites', 'Blocks', 'Layouts', 'Components'],
    categoryRoute: '/wordpress/themes',
  },
  {
    id: 'extend',
    index: '02',
    label: 'Extend',
    statement: 'Additional capability added to an install that already runs.',
    activities: ['Plugins', 'WooCommerce Extensions', 'Integrations', 'Utilities', 'Automation'],
    categoryRoute: '/wordpress/plugins',
  },
  {
    id: 'operate',
    index: '03',
    label: 'Operate',
    statement: 'The work required to keep an install correct, fast and recoverable.',
    activities: ['Setup', 'Migration', 'Maintenance', 'Performance', 'Security', 'Backups'],
    categoryRoute: null,
  },
  {
    id: 'grow',
    index: '04',
    label: 'Grow',
    statement: 'Work that makes an existing site findable and measurable.',
    activities: ['SEO', 'Analytics', 'Conversion', 'Campaign Landing Pages', 'Content Systems'],
    categoryRoute: '/growth/seo',
  },
];

/**
 * The catalogue. Empty by evidence, not by omission of effort.
 *
 * Adding a release is a data change only: append an entry, then the themes
 * gallery, plugin registry, starter-site filters, composer rules, global
 * search and sitemap all pick it up without a component rewrite.
 */
export const wordPressItems: readonly WordPressItem[] = [];

export function wordPressByCategory(category: WordPressCategory): WordPressItem[] {
  const type = wordpressCategories.find((entry) => entry.slug === category)?.type;
  return wordPressItems.filter((item) => item.type === type);
}

/**
 * WordPress operating services. These are performed by KNOuX as engineering
 * work rather than shipped as files, so they are real offerings even though
 * the file catalogue is empty. They carry no price, no duration and no
 * outcome promise.
 */
export type WordPressService = {
  id: string;
  code: string;
  name: string;
  summary: string;
  activities: string[];
  route: string;
};

export const wordPressServices: readonly WordPressService[] = [
  {
    id: 'wp-svc-install',
    code: 'WPS-01',
    name: 'Install & Configuration',
    summary: 'A working WordPress environment configured to the requirements of the project, with a documented baseline.',
    activities: ['Hosting and environment selection', 'Core and multisite configuration', 'Role and capability model', 'Baseline documentation'],
    route: '/wordpress',
  },
  {
    id: 'wp-svc-migration',
    code: 'WPS-02',
    name: 'Migration',
    summary: 'Moving an existing WordPress site onto a new host or architecture without losing content, URLs or behaviour.',
    activities: ['Content and database audit', 'URL and redirect mapping', 'Staged cutover', 'Post-migration verification'],
    route: '/wordpress',
  },
  {
    id: 'wp-svc-maintenance',
    code: 'WPS-03',
    name: 'Maintenance',
    summary: 'Recurring work that keeps an install patched, current and reversible.',
    activities: ['Update management', 'Plugin compatibility review', 'Uptime and error monitoring', 'Change log'],
    route: '/wordpress',
  },
  {
    id: 'wp-svc-performance',
    code: 'WPS-04',
    name: 'Performance',
    summary: 'Measurement-led removal of the specific work that makes a WordPress site slow.',
    activities: ['Query and cache profiling', 'Critical rendering path work', 'Media and font delivery', 'Before and after measurement'],
    route: '/wordpress',
  },
  {
    id: 'wp-svc-security',
    code: 'WPS-05',
    name: 'Security',
    summary: 'Hardening and monitoring of a WordPress install, with a written boundary between protection and intrusion response.',
    activities: ['Access and permission audit', 'File integrity and update control', 'Backup and restore verification', 'Incident runbook'],
    route: '/wordpress',
  },
  {
    id: 'wp-svc-backup',
    code: 'WPS-06',
    name: 'Backup & Recovery',
    summary: 'Backups that have been restored at least once, because an untested backup is only a hypothesis.',
    activities: ['Automated off-site backup', 'Restore drill and timing record', 'Retention policy', 'Recovery runbook'],
    route: '/wordpress',
  },
  {
    id: 'wp-svc-headless',
    code: 'WPS-07',
    name: 'Headless & Decoupled',
    summary: 'WordPress retained as the editorial system while delivery moves to an edge-rendered frontend.',
    activities: ['Content model and API design', 'Frontend integration', 'Preview and revalidation wiring', 'Editorial handover'],
    route: '/web',
  },
];

/**
 * Goals a visitor can start from. Each resolves to services and, once the file
 * catalogue exists, to catalogue items. Only verified entries are attached.
 */
export type WordPressGoal = {
  id: string;
  code: string;
  label: string;
  statement: string;
  verticals: string[];
  /** Service ids from `wordPressServices`. */
  serviceIds: string[];
  /** Catalogue item ids. Empty until releases exist. */
  itemIds: string[];
  /** Other divisions that legitimately combine into this outcome. */
  companionEntityIds: string[];
};

export const wordPressGoals: readonly WordPressGoal[] = [
  {
    id: 'wp-goal-corporate',
    code: 'WPG-01',
    label: 'Corporate',
    statement: 'A controlled institutional site with governance, roles and review built into the editorial model.',
    verticals: ['corporate', 'professional-services'],
    serviceIds: ['wp-svc-install', 'wp-svc-maintenance', 'wp-svc-security'],
    itemIds: [],
    companionEntityIds: ['web-corporate', 'creative-brand-identity', 'growth-technical-seo'],
  },
  {
    id: 'wp-goal-store',
    code: 'WPG-02',
    label: 'Store',
    statement: 'A commerce site with a deliberate catalogue model, checkout behaviour and measurement in place.',
    verticals: ['store'],
    serviceIds: ['wp-svc-install', 'wp-svc-performance', 'wp-svc-maintenance'],
    itemIds: [],
    companionEntityIds: ['web-ecommerce', 'growth-google-ads', 'growth-meta-ads', 'growth-conversion-tracking'],
  },
  {
    id: 'wp-goal-academy',
    code: 'WPG-03',
    label: 'Academy',
    statement: 'A learning destination with a content hierarchy, enrolment path and a clear student experience.',
    verticals: ['academy', 'education'],
    serviceIds: ['wp-svc-install', 'wp-svc-maintenance', 'wp-svc-performance'],
    itemIds: [],
    companionEntityIds: ['web-portal', 'growth-content', 'creative-editorial'],
  },
  {
    id: 'wp-goal-local',
    code: 'WPG-04',
    label: 'Local Business',
    statement: 'A site for a business that depends on being found and contacted from nearby.',
    verticals: ['restaurant', 'delivery', 'real-estate', 'healthcare'],
    serviceIds: ['wp-svc-install', 'wp-svc-backup', 'wp-svc-maintenance'],
    itemIds: [],
    companionEntityIds: ['web-corporate', 'growth-local-visibility', 'creative-launch-content'],
  },
  {
    id: 'wp-goal-modernise',
    code: 'WPG-05',
    label: 'Modernise',
    statement: 'Replacing or repairing an install that has become slow, fragile or impossible to edit safely.',
    verticals: ['corporate', 'portfolio', 'professional-services'],
    serviceIds: ['wp-svc-performance', 'wp-svc-security', 'wp-svc-migration', 'wp-svc-backup'],
    itemIds: [],
    companionEntityIds: ['web-performance-audit', 'growth-technical-seo'],
  },
];

export function wordPressEntities(): DiscoverableEntity[] {
  const itemEntities: DiscoverableEntity[] = wordPressItems.map((item) => ({
    id: item.id,
    kind: 'block',
    division: 'wordpress',
    code: item.id.toUpperCase(),
    slug: item.slug,
    name: item.name,
    shortName: item.shortName,
    summary: item.summary ?? 'WordPress release.',
    status: item.status,
    route: `/wordpress/${item.type}s`,
    categories: item.categories,
    searchTerms: [...item.tags, item.name, item.shortName],
    capabilities: item.features ?? [],
    relatedIds: item.relatedItems,
  }));

  const serviceEntities: DiscoverableEntity[] = wordPressServices.map((service) => ({
    id: service.id,
    kind: 'bundle',
    division: 'wordpress',
    code: service.code,
    slug: service.id,
    name: service.name,
    shortName: service.name,
    summary: service.summary,
    status: 'service',
    route: service.route,
    categories: ['wordpress', 'operate'],
    searchTerms: service.activities,
    capabilities: [],
    relatedIds: [],
  }));

  const goalEntities: DiscoverableEntity[] = wordPressGoals.map((goal) => ({
    id: goal.id,
    kind: 'bundle',
    division: 'wordpress',
    code: goal.code,
    slug: goal.id,
    name: `${goal.label} on WordPress`,
    shortName: goal.label,
    summary: goal.statement,
    status: 'service',
    route: '/wordpress',
    categories: ['wordpress', goal.label.toLowerCase()],
    searchTerms: [...goal.verticals, goal.label],
    capabilities: [],
    relatedIds: goal.companionEntityIds,
  }));

  return [...itemEntities, ...serviceEntities, ...goalEntities];
}
