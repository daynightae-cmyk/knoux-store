import type { DiscoverableEntity } from '@/lib/entities';

/**
 * KNOuX Growth.
 *
 * A serious acquisition and discoverability practice, described in terms of
 * the work performed. There are no target metrics, benchmarks, minimum spends
 * or return claims anywhere in this file. A budget entered on the site is used
 * to scope a project, never to project a result.
 */

export type GrowthChannelSlug = 'google-ads' | 'meta-ads' | 'social' | 'content' | 'seo';

/** Channels KNOuX works in. Anything not listed here is not offered. */
export const growthChannels: readonly GrowthChannelSlug[] = [
  'google-ads',
  'meta-ads',
  'social',
  'content',
  'seo',
];

export type GrowthModule = {
  id: string;
  code: string;
  name: string;
  /** Which channels this module belongs to. */
  channelSlugs: GrowthChannelSlug[];
  /** True when the module is a one-off setup rather than recurring work. */
  setup: boolean;
  statement: string;
  activities: string[];
};

export type GrowthChannel = {
  id: string;
  code: string;
  slug: GrowthChannelSlug;
  name: string;
  shortName: string;
  index: string;
  tagline: string;
  statement: string;
  /** What a client is responsible for supplying. Prevents silent assumptions. */
  prerequisites: string[];
  /** What KNOuX produces. Artefacts, not outcomes. */
  outputs: string[];
  moduleIds: string[];
  relatedEntityIds: string[];
};

/** Step one: what is being grown. */
export type GrowthTarget = {
  id: string;
  label: string;
  statement: string;
  /** Capability ids this target pulls in. */
  capabilityIds: string[];
  defaultChannelSlugs: GrowthChannelSlug[];
};

export const growthTargets: readonly GrowthTarget[] = [
  { id: 'brand', label: 'Brand', statement: 'A name or offer that has to become recognisable in a specific market.', capabilityIds: ['creative-brand-identity', 'creative-campaign'], defaultChannelSlugs: ['social', 'meta-ads'] },
  { id: 'website', label: 'Website', statement: 'A site that needs qualified attention rather than raw volume.', capabilityIds: ['web-corporate', 'growth-google-ads'], defaultChannelSlugs: ['google-ads', 'seo'] },
  { id: 'store', label: 'Store', statement: 'A catalogue that needs demand pointed at it and the purchase path measured.', capabilityIds: ['web-ecommerce', 'growth-google-ads'], defaultChannelSlugs: ['google-ads', 'meta-ads'] },
  { id: 'application', label: 'Application', statement: 'A product where the goal is installs or signups rather than page views.', capabilityIds: ['web-application', 'growth-conversion-tracking'], defaultChannelSlugs: ['meta-ads', 'google-ads'] },
  { id: 'local', label: 'Local Business', statement: 'A business whose customers are physically nearby.', capabilityIds: ['growth-local-visibility', 'web-corporate'], defaultChannelSlugs: ['google-ads', 'seo', 'social'] },
  { id: 'product', label: 'New Product', statement: 'A launch that needs an audience before it has a sales history.', capabilityIds: ['creative-launch-content', 'growth-campaign-strategy'], defaultChannelSlugs: ['meta-ads', 'social', 'content'] },
];

/** Step two: what a successful outcome looks like, in the visitor's words. */
export type GrowthObjective = {
  id: string;
  label: string;
  statement: string;
  /** What KNOuX measures to understand progress. Not a target. */
  measuredBy: string[];
  /** Capability ids this objective pulls in. */
  capabilityIds: string[];
};

export const growthObjectives: readonly GrowthObjective[] = [
  { id: 'sales', label: 'Sales', statement: 'Completed purchases.', measuredBy: ['Completed transactions', 'Revenue by channel and product', 'Checkout completion rate'], capabilityIds: ['web-ecommerce', 'growth-conversion-tracking'] },
  { id: 'leads', label: 'Leads', statement: 'Qualified enquiries, with a definition agreed before campaigns start.', measuredBy: ['Form submissions by source', 'Qualified rate after sales review', 'Cost per qualified enquiry'], capabilityIds: ['growth-conversion-tracking', 'web-landing'] },
  { id: 'messages', label: 'Messages', statement: 'Inbound conversations that need a response.', measuredBy: ['Message volume by channel', 'Response time', 'Conversation to enquiry rate'], capabilityIds: ['growth-local-visibility', 'creative-social-content'] },
  { id: 'traffic', label: 'Traffic', statement: 'Qualified visits to something that matters.', measuredBy: ['Sessions by landing page', 'Engagement with key content', 'Assisted conversions'], capabilityIds: ['growth-technical-seo', 'growth-content'] },
  { id: 'awareness', label: 'Awareness', statement: 'Reach and recall in a defined audience.', measuredBy: ['Reach within the target audience', 'Video completion', 'Branded search growth'], capabilityIds: ['creative-campaign', 'growth-social'] },
  { id: 'installs', label: 'App Installs', statement: 'Product adoption on a specific platform.', measuredBy: ['Installs by source', 'First-run completion', 'Retention by cohort'], capabilityIds: ['web-application', 'growth-conversion-tracking'] },
];

/** Step three: where the audience is. Only channels KNOuX actually works in. */
export type GrowthReach = {
  id: string;
  label: string;
  /** Maps to a channel entity when one exists. */
  channelSlug: GrowthChannelSlug | null;
  note: string;
};

export const growthReaches: readonly GrowthReach[] = [
  { id: 'google-search', label: 'Google Search', channelSlug: 'google-ads', note: 'Paid search and shopping, plus organic search work.' },
  { id: 'youtube', label: 'YouTube', channelSlug: null, note: 'Handled as a destination for video assets produced for social and campaign work.' },
  { id: 'instagram', label: 'Instagram', channelSlug: 'social', note: 'Organic short-form production and paid placement through Meta.' },
  { id: 'facebook', label: 'Facebook', channelSlug: 'meta-ads', note: 'Paid placement through Meta, including retargeting audiences.' },
  { id: 'tiktok', label: 'TikTok', channelSlug: 'social', note: 'Short-form production for organic distribution.' },
  { id: 'organic-search', label: 'Organic Search', channelSlug: 'seo', note: 'Technical and content work rather than paid placement.' },
];

/**
 * Service modules. Only work KNOuX intends to offer is listed. Each one is
 * described by what it involves, never by the result it is expected to produce.
 */
export const growthModules: readonly GrowthModule[] = [
  {
    id: 'growth-campaign-strategy',
    code: 'G-01',
    name: 'Campaign Strategy',
    channelSlugs: ['google-ads', 'meta-ads', 'social', 'content', 'seo'],
    setup: true,
    statement: 'Deciding what is being pursued, on what evidence, before any spend is committed.',
    activities: ['Objective and success definition agreed in writing', 'Market and competitor review', 'Channel selection and sequencing', 'Measurement plan and tracking requirements', 'Budget allocation logic and review points'],
  },
  {
    id: 'growth-account-setup',
    code: 'G-02',
    name: 'Account & Campaign Setup',
    channelSlugs: ['google-ads', 'meta-ads'],
    setup: true,
    statement: 'Structuring accounts, campaigns and ad groups so performance can be read later.',
    activities: ['Account structure and naming', 'Campaign and ad group architecture', 'Bid and budget configuration', 'Ad scheduling and geo rules', 'Launch review'],
  },
  {
    id: 'growth-search-campaign',
    code: 'G-03',
    name: 'Search Campaign Setup',
    channelSlugs: ['google-ads'],
    setup: true,
    statement: 'Search campaigns built around what people are actually typing, and what to refuse to pay for.',
    activities: ['Keyword research and intent grouping', 'Negative keyword architecture', 'Responsive search ad copy', 'Landing page alignment', 'Search term review process'],
  },
  {
    id: 'growth-social-campaign',
    code: 'G-04',
    name: 'Social Campaign Setup',
    channelSlugs: ['meta-ads', 'social'],
    setup: true,
    statement: 'Paid social built on audience structure rather than a single broad blast.',
    activities: ['Audience architecture and exclusions', 'Placement and device configuration', 'Creative specification and asset requirements', 'Retargeting windows agreed in advance', 'Launch review'],
  },
  {
    id: 'growth-audience-architecture',
    code: 'G-05',
    name: 'Audience Architecture',
    channelSlugs: ['meta-ads', 'google-ads'],
    setup: true,
    statement: 'Deciding who is addressed, in what order, and who is deliberately excluded.',
    activities: ['Audience segment definition', 'Exclusion and suppression rules', 'Retargeting window design', 'Lookalike and interest structure where justified', 'Privacy and consent review'],
  },
  {
    id: 'growth-conversion-tracking',
    code: 'G-06',
    name: 'Conversion Tracking Setup',
    channelSlugs: ['google-ads', 'meta-ads', 'social', 'seo'],
    setup: true,
    statement: 'Making sure the numbers a decision rests on are actually measured, once, without double counting.',
    activities: ['Event definition and naming', 'Tag and server-side implementation', 'Deduplication setup', 'Consent handling', 'Verification against a back office or database'],
  },
  {
    id: 'growth-creative-preparation',
    code: 'G-07',
    name: 'Creative Preparation',
    channelSlugs: ['meta-ads', 'google-ads', 'social'],
    setup: false,
    statement: 'Producing the assets campaigns need, with a stated variation axis per test.',
    activities: ['Asset specification per placement', 'Variant production with one variable each', 'Copy drafting and localisation', 'Adaptation across formats and aspect ratios', 'Creative performance review'],
  },
  {
    id: 'growth-landing-integration',
    code: 'G-08',
    name: 'Landing Experience Integration',
    channelSlugs: ['google-ads', 'meta-ads'],
    setup: true,
    statement: 'Connecting the destination to the campaign so measurement and message survive the click.',
    activities: ['Landing page message alignment', 'Tracking and event wiring', 'Form or checkout path review', 'Mobile path verification', 'Post-click analytics review'],
  },
  {
    id: 'growth-optimization',
    code: 'G-09',
    name: 'Optimization',
    channelSlugs: ['google-ads', 'meta-ads'],
    setup: false,
    statement: 'Recurring work that reallocates effort based on what the data actually shows.',
    activities: ['Search term and placement review', 'Bid and budget reallocation', 'Creative rotation decisions', 'Audience refresh', 'Change log with reasoning'],
  },
  {
    id: 'growth-reporting',
    code: 'G-10',
    name: 'Reporting',
    channelSlugs: ['google-ads', 'meta-ads', 'social', 'content', 'seo'],
    setup: false,
    statement: 'A readable account of what happened and what it implies for the next decision.',
    activities: ['Reporting format agreed with the client', 'Source-separated performance view', 'Annotation of every change made', 'Written recommendation per period', 'Raw data access for the client'],
  },
  {
    id: 'growth-content-production',
    code: 'G-11',
    name: 'Content Production',
    channelSlugs: ['content', 'social'],
    setup: false,
    statement: 'Producing the material that gives a campaign and a site something to point at.',
    activities: ['Editorial direction and topic selection', 'Drafting and editing', 'Subject-matter input sessions', 'Publication and repurposing', 'Content performance review'],
  },
  {
    id: 'growth-technical-seo',
    code: 'G-12',
    name: 'Technical SEO',
    channelSlugs: ['seo'],
    setup: false,
    statement: 'Fixing the parts of a site that decide whether search engines can use it at all.',
    activities: ['Crawl and indexation review', 'Core Web Vitals remediation', 'Structured data implementation', 'Internal linking and URL architecture', 'Search Console monitoring'],
  },
  {
    id: 'growth-analytics',
    code: 'G-13',
    name: 'Analytics',
    channelSlugs: ['google-ads', 'meta-ads', 'social', 'content', 'seo'],
    setup: true,
    statement: 'Establishing a measurement baseline that survives staff changes.',
    activities: ['Property and container configuration', 'Event and dimension design', 'Reporting built for the decisions in question', 'Access and ownership handover', 'Documentation for the client team'],
  },
];

export const growthChannelsDetail: readonly GrowthChannel[] = [
  {
    id: 'growth-google-ads',
    code: 'GR-01',
    slug: 'google-ads',
    name: 'Google Advertising',
    shortName: 'Google Ads',
    index: '01',
    tagline: 'Paid search, shopping and demand capture',
    statement:
      'Search and shopping campaigns structured around commercial intent, with the negative list treated as a first-class part of the build rather than a cleanup task. Performance Max is used only where the asset structure genuinely supports it.',
    prerequisites: ['A website that can receive and record the traffic', 'A clear definition of what a conversion means for the business', 'Access to any existing analytics or tag manager'],
    outputs: ['Account and campaign structure', 'Keyword and negative keyword architecture', 'Ad copy built per intent group', 'Conversion measurement wired and verified', 'Ongoing optimisation with a written change log'],
    moduleIds: ['growth-campaign-strategy', 'growth-account-setup', 'growth-search-campaign', 'growth-audience-architecture', 'growth-conversion-tracking', 'growth-landing-integration', 'growth-optimization', 'growth-reporting', 'growth-analytics'],
    relatedEntityIds: ['web-landing', 'creative-campaign', 'growth-technical-seo'],
  },
  {
    id: 'growth-meta-ads',
    code: 'GR-02',
    slug: 'meta-ads',
    name: 'Meta Advertising',
    shortName: 'Meta Ads',
    index: '02',
    tagline: 'Paid social on Instagram and Facebook',
    statement:
      'Placement across Meta with audience exclusions designed up front, creative produced as testable variants, and events sent from the server where measurement reliability requires it.',
    prerequisites: ['Business asset access for account and domain verification', 'A defined audience, not a general description', 'Creative assets or agreement to produce them'],
    outputs: ['Business and ad account structure', 'Audience and exclusion architecture', 'Creative variant set with a documented test axis', 'Event measurement and verification', 'Ongoing optimisation and reporting'],
    moduleIds: ['growth-campaign-strategy', 'growth-account-setup', 'growth-social-campaign', 'growth-audience-architecture', 'growth-creative-preparation', 'growth-conversion-tracking', 'growth-optimization', 'growth-reporting'],
    relatedEntityIds: ['creative-campaign', 'creative-launch-content', 'web-landing'],
  },
  {
    id: 'growth-social',
    code: 'GR-03',
    slug: 'social',
    name: 'Social Media',
    shortName: 'Social',
    index: '03',
    tagline: 'Organic short-form production and publishing',
    statement:
      'A repeatable production line for short-form video and social posts across the platforms a business can realistically maintain, with a published calendar rather than ad-hoc posting.',
    prerequisites: ['A defined editorial point of view or offer', 'Access to footage or a production session', 'Someone who can approve and publish'],
    outputs: ['Format and cadence definition', 'Asset source library and edit recipes', 'Editorial calendar with drafted copy', 'Publishing and community response guidance'],
    moduleIds: ['growth-campaign-strategy', 'growth-social-campaign', 'growth-creative-preparation', 'growth-content-production', 'growth-reporting'],
    relatedEntityIds: ['creative-social-content', 'creative-motion', 'growth-meta-ads'],
  },
  {
    id: 'growth-content',
    code: 'GR-04',
    slug: 'content',
    name: 'Content Systems',
    shortName: 'Content',
    index: '04',
    tagline: 'Material that earns attention over time',
    statement:
      'Content built from subject-matter input rather than generated volume: a topic structure tied to what buyers ask, produced with the people who actually know the subject.',
    prerequisites: ['Access to subject-matter experts for input', 'A reason to be trusted on the subject', 'Editorial review capacity'],
    outputs: ['Topic and intent structure', 'Produced and edited content', 'Publication and repurposing plan', 'Performance review by topic, not by volume'],
    moduleIds: ['growth-campaign-strategy', 'growth-content-production', 'growth-technical-seo', 'growth-reporting'],
    relatedEntityIds: ['creative-editorial', 'web-corporate', 'growth-technical-seo'],
  },
  {
    id: 'growth-technical-seo',
    code: 'GR-05',
    slug: 'seo',
    name: 'SEO & Discoverability',
    shortName: 'SEO',
    index: '05',
    tagline: 'Making a site legible to search engines',
    statement:
      'Technical work first: crawlable structure, stable performance, unambiguous structured data and internal linking that distributes authority deliberately. Content work follows the technical baseline.',
    prerequisites: ['Crawl access to the site', 'A site that can be deployed and changed', 'Analytics access'],
    outputs: ['Crawl and indexation audit', 'Technical remediation implemented', 'Structured data and internal linking changes', 'Search Console monitoring and reporting'],
    moduleIds: ['growth-campaign-strategy', 'growth-technical-seo', 'growth-content-production', 'growth-analytics', 'growth-reporting'],
    relatedEntityIds: ['web-performance-audit', 'growth-content', 'wordpress-maintenance'],
  },
];

export function growthModulesFor(slug: GrowthChannelSlug): GrowthModule[] {
  return growthModules.filter((module) => module.channelSlugs.includes(slug));
}

export function growthChannelBySlug(slug: string): GrowthChannel | undefined {
  return growthChannelsDetail.find((channel) => channel.slug === slug);
}

/**
 * Budget bands exist to help a visitor describe scope, and to let the enquiry
 * carry a figure. They are not recommendations, not minimum spends, and not
 * tied to any expected result.
 */
export type BudgetBand = { id: string; label: string; description: string };

export const budgetBands: readonly BudgetBand[] = [
  { id: 'unstated', label: 'Not yet decided', description: 'A range is useful but not required to start a conversation.' },
  { id: 'under-5k', label: 'Under 5,000', description: 'Usually enough to establish a focused single channel with correct measurement.' },
  { id: '5k-15k', label: '5,000 to 15,000', description: 'Allows a second channel and a creative production line alongside measurement.' },
  { id: '15k-50k', label: '15,000 to 50,000', description: 'Suits multi-channel work where creative and audience testing are the constraint rather than budget.' },
  { id: 'over-50k', label: 'Over 50,000', description: 'Indicates a scope where strategy, tracking and production are all required before spend is committed.' },
  { id: 'not-media', label: 'Project budget, not media spend', description: 'The figure refers to build cost for web, WordPress or creative work rather than to advertising.' },
];

export function bandForAmount(amount: number, currency: string): BudgetBand {
  const value = Math.abs(amount);
  if (currency === 'project') return budgetBands[budgetBands.length - 1];
  if (value < 5000) return budgetBands[1];
  if (value < 15000) return budgetBands[2];
  if (value < 50000) return budgetBands[3];
  return budgetBands[4];
}

export function growthEntities(): DiscoverableEntity[] {
  const channelEntities: DiscoverableEntity[] = growthChannelsDetail.map((channel) => ({
    id: channel.id,
    kind: 'growth-channel',
    division: 'growth',
    code: channel.code,
    slug: channel.slug,
    name: channel.name,
    shortName: channel.shortName,
    summary: channel.tagline,
    status: 'service',
    route: `/growth/${channel.slug}`,
    categories: ['growth', channel.slug],
    searchTerms: [channel.name, channel.tagline, ...channel.prerequisites.slice(0, 1)],
    capabilities: channel.moduleIds,
    relatedIds: channel.relatedEntityIds,
  }));

  const moduleEntities: DiscoverableEntity[] = growthModules.map((module) => ({
    id: module.id,
    kind: 'growth-channel',
    division: 'growth',
    code: module.code,
    slug: module.id,
    name: module.name,
    shortName: module.name,
    summary: module.statement,
    status: 'service',
    route: `/growth/${module.channelSlugs[0]}`,
    categories: ['growth', module.channelSlugs[0]],
    searchTerms: module.activities,
    capabilities: [],
    relatedIds: [],
  }));

  const objectiveEntities: DiscoverableEntity[] = growthObjectives.map((objective) => ({
    id: `growth-objective-${objective.id}`,
    kind: 'growth-channel',
    division: 'growth',
    code: 'GR-O',
    slug: objective.id,
    name: objective.label,
    shortName: objective.label,
    summary: objective.statement,
    status: 'service',
    route: '/growth',
    categories: ['growth', 'objective'],
    searchTerms: [objective.statement],
    capabilities: objective.capabilityIds,
    relatedIds: [],
  }));

  return [...channelEntities, ...moduleEntities, ...objectiveEntities];
}
