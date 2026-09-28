import type { DiscoverableEntity } from '@/lib/entities';

/**
 * KNOuX Solutions.
 *
 * The cross-division layer. A visitor arrives with a business need and should
 * not have to know which internal department serves it. Every solution
 * references entity ids that exist in the other registries, so a solution can
 * never point at something that is not real.
 *
 * A solution states what is commonly required and what is optional. It never
 * claims a visitor needs everything, and it carries no metrics, timelines or
 * outcome promises.
 */

export type SolutionGroup = 'launch' | 'build' | 'operate' | 'reach';

export type SolutionLayer = {
  label: string;
  entityIds: string[];
  /** Why an item in this layer would be part of the engagement. */
  because: string;
};

export type Solution = {
  id: string;
  code: string;
  slug: string;
  group: SolutionGroup;
  title: string;
  shortName: string;
  index: string;
  /** The business need, in the visitor's words. */
  objective: string;
  statement: string;
  /** Who this tends to suit. Descriptive, not a qualification. */
  suits: string;
  /** What is usually in scope. */
  core: SolutionLayer[];
  /** What may or may not be needed. Explicitly optional. */
  optional: SolutionLayer[];
  /** The honest next step. */
  nextStep: string;
  searchTerms: string[];
  relatedEntityIds: string[];
};

export const solutionGroups: ReadonlyArray<{ id: SolutionGroup; label: string; statement: string }> = [
  { id: 'launch', label: 'Start', statement: 'Something new that needs to exist publicly.' },
  { id: 'build', label: 'Build', statement: 'A system that has to do real work.' },
  { id: 'operate', label: 'Operate', statement: 'Something running that has to stay correct.' },
  { id: 'reach', label: 'Reach', statement: 'A service that has to be found and chosen.' },
];

export const solutions: readonly Solution[] = [
  {
    id: 'sol-start-business',
    code: 'SOL-01',
    slug: 'start-a-business',
    group: 'launch',
    title: 'Start a Business',
    shortName: 'Start a Business',
    index: '01',
    objective: 'A new venture needs a credible public presence and a way to receive work.',
    statement:
      'The first requirement is rarely the website. It is a coherent identity, a place that states what the business does without ambiguity, and a reliable way for a stranger to make contact. Growth work before there is something to measure tends to waste money.',
    suits: 'Founders and small teams establishing a company, offer or practice.',
    core: [
      {
        label: 'Identity',
        entityIds: ['creative-brand-identity', 'creative-editorial'],
        because: 'A new entity needs a mark, a name treatment and a visual rule that can be applied without a designer present.',
      },
      {
        label: 'Public site',
        entityIds: ['web-corporate'],
        because: 'One authoritative place describing the offer, the people and how to reach them.',
      },
      {
        label: 'Measurement',
        entityIds: ['growth-conversion-tracking', 'growth-analytics'],
        because: 'Events and analytics have to exist before campaigns are launched, not after.',
      },
    ],
    optional: [
      {
        label: 'Paid acquisition',
        entityIds: ['growth-google-ads', 'growth-meta-ads', 'growth-campaign-strategy'],
        because: 'Only worth committing spend once the site converts and the offer is understood by the market.',
      },
      {
        label: 'Founding content',
        entityIds: ['creative-editorial', 'growth-content-production'],
        because: 'Useful when the offer needs explaining in depth before it needs selling.',
      },
      {
        label: 'Internal tooling',
        entityIds: ['software-engineering', 'web-internal-tools'],
        because: 'Worth considering once a manual process becomes a repeated cost.',
      },
    ],
    nextStep: 'Describe the business, the offer and who it serves. Scope and sequencing are agreed before any build starts.',
    searchTerms: ['start a business', 'new company website', 'launch a company', 'business setup website', 'founder website'],
    relatedEntityIds: ['sol-modernise-website', 'creative-brand-identity', 'web-corporate'],
  },
  {
    id: 'sol-launch-product',
    code: 'SOL-02',
    slug: 'launch-a-new-product',
    group: 'launch',
    title: 'Launch a New Product',
    shortName: 'Launch a Product',
    index: '02',
    objective: 'A product exists and has to be introduced to people who do not know it.',
    statement:
      'A launch is a sequence, not a campaign. The reveal has to work on a phone, in a feed, with sound off, and the destination it points at has to hold attention long enough to explain the product and take an action.',
    suits: 'Teams releasing software, hardware, a physical product or a new service line.',
    core: [
      {
        label: 'Destination',
        entityIds: ['web-landing', 'web-corporate'],
        because: 'A page that explains the product, handles the questions people actually ask, and records interest.',
      },
      {
        label: 'Assets',
        entityIds: ['creative-launch-content', 'creative-campaign', 'creative-product-visuals'],
        because: 'A consistent set of imagery, motion and copy that works across every placement it will appear in.',
      },
      {
        label: 'Interest capture',
        entityIds: ['growth-conversion-tracking', 'web-landing'],
        because: 'A waitlist or enquiry path that captures structured data rather than a dead link.',
      },
    ],
    optional: [
      {
        label: 'Paid distribution',
        entityIds: ['growth-meta-ads', 'growth-google-ads', 'growth-creative-preparation'],
        because: 'Determined by whether the audience is addressable or has to be built first.',
      },
      {
        label: 'Interactive demonstration',
        entityIds: ['web-experience', 'creative-motion'],
        because: 'Warranted when a static image cannot communicate how the product behaves.',
      },
      {
        label: 'Presentation and press',
        entityIds: ['creative-presentation', 'creative-editorial'],
        because: 'Where the launch needs a document rather than a feed.',
      },
    ],
    nextStep: 'Describe the product, who it is for, and where the launch needs to land.',
    searchTerms: ['launch a product', 'product launch', 'product release campaign', 'new app launch', 'product reveal'],
    relatedEntityIds: ['creative-launch-content', 'web-landing', 'growth-meta-ads'],
  },
  {
    id: 'sol-online-store',
    code: 'SOL-03',
    slug: 'build-an-online-store',
    group: 'build',
    title: 'Build an Online Store',
    shortName: 'Online Store',
    index: '03',
    objective: 'A business needs to take money online and know which step of the path loses people.',
    statement:
      'The catalogue, the checkout and the measurement are one system. Building the storefront without the tracking means finding out about broken paths from customers instead of from data.',
    suits: 'Retailers, producers and service businesses selling directly.',
    core: [
      {
        label: 'Storefront',
        entityIds: ['web-ecommerce', 'wordpress-starter'],
        because: 'Catalogue structure, product pages, cart and checkout built as one path rather than assembled from templates.',
      },
      {
        label: 'Payment and operations',
        entityIds: ['web-ecommerce'],
        because: 'Payment provider, tax, shipping and order flow reconciled with whatever system holds the stock.',
      },
      {
        label: 'Measurement',
        entityIds: ['growth-conversion-tracking', 'growth-analytics'],
        because: 'Purchase events verified against real orders, deduplicated across browser and server.',
      },
    ],
    optional: [
      {
        label: 'Product imagery',
        entityIds: ['creative-product-visuals', 'creative-editorial'],
        because: 'Product pages convert on imagery, and consistent treatment is cheaper to produce than to retrofit.',
      },
      {
        label: 'Acquisition',
        entityIds: ['growth-google-ads', 'growth-meta-ads', 'growth-campaign-strategy'],
        because: 'Only after the purchase path is known to work end to end.',
      },
      {
        label: 'Hosting and upkeep',
        entityIds: ['wordpress-maintenance', 'wp-svc-performance', 'wp-svc-backup'],
        because: 'A store that nobody maintains is an availability risk with a brand attached.',
      },
    ],
    nextStep: 'Describe the catalogue, the markets it sells into and the systems that currently hold orders.',
    searchTerms: ['online store', 'ecommerce website', 'shop website', 'sell products online', 'build a store', 'woocommerce'],
    relatedEntityIds: ['web-ecommerce', 'wordpress-starter', 'growth-conversion-tracking'],
  },
  {
    id: 'sol-operations',
    code: 'SOL-04',
    slug: 'digitise-operations',
    group: 'operate',
    title: 'Digitise Operations',
    shortName: 'Digitise Operations',
    index: '04',
    objective: 'Work is spread across spreadsheets, inboxes and desktop tools that only one person understands.',
    statement:
      'The question is rarely "which app" but "what is the actual process, and where does it break". Consolidating a process onto one system with real permissions is a larger change than adopting new software, and pretending otherwise produces fragile results.',
    suits: 'Organisations with manual handoffs, duplicated data entry or single points of failure.',
    core: [
      {
        label: 'Process and data model',
        entityIds: ['web-application', 'web-dashboard'],
        because: 'A written model of the process and the data it produces, before anything is built on top of it.',
      },
      {
        label: 'Authenticated surface',
        entityIds: ['web-portal', 'web-dashboard'],
        because: 'Role-scoped access so people see their own work and cannot alter someone else\'s.',
      },
      {
        label: 'Workstation tooling',
        entityIds: ['sw-repair', 'sw-organizer', 'software-maintenance'],
        because: 'Desktop tools already maintained by KNOuX for maintenance, file organisation and file-level privacy.',
      },
    ],
    optional: [
      {
        label: 'Interface design',
        entityIds: ['creative-ui-ux', 'creative-motion'],
        because: 'Necessary when staff will use the tool for hours a day; not necessary for an occasional view.',
      },
      {
        label: 'Data protection',
        entityIds: ['software-security', 'wp-svc-security'],
        because: 'Relevant wherever the process touches records that must stay private.',
      },
      {
        label: 'In-house engineering tools',
        entityIds: ['sw-forge', 'software-engineering'],
        because: 'Where a team maintains its own systems and needs verification and release tooling.',
      },
    ],
    nextStep: 'Describe the process, who performs it today, and what happens when it is done wrong.',
    searchTerms: ['digitise operations', 'automate operations', 'internal portal', 'workflow software', 'custom admin system', 'replace spreadsheets'],
    relatedEntityIds: ['web-application', 'web-dashboard', 'sw-organizer'],
  },
  {
    id: 'sol-portal',
    code: 'SOL-05',
    slug: 'create-a-customer-portal',
    group: 'build',
    title: 'Create a Customer Portal',
    shortName: 'Customer Portal',
    index: '05',
    objective: 'Customers should be able to see and act on their own information without contacting staff.',
    statement:
      'A portal succeeds when a support conversation stops being necessary. That means the data shown has to be correct, the actions have to be safe, and the boundary between customers has to hold.',
    suits: 'Businesses with repeat customers, memberships, bookings, subscriptions or long-running orders.',
    core: [
      {
        label: 'Portal surface',
        entityIds: ['web-portal'],
        because: 'Authenticated pages scoped to one person, verified server-side rather than in the interface.',
      },
      {
        label: 'Account and recovery',
        entityIds: ['web-portal', 'web-application'],
        because: 'Identity, session handling and account recovery, integrated with any existing system of record.',
      },
      {
        label: 'Self-service actions',
        entityIds: ['web-portal', 'web-booking'],
        because: 'The specific tasks staff currently handle by email or phone, moved into the portal.',
      },
    ],
    optional: [
      {
        label: 'Payments',
        entityIds: ['web-ecommerce', 'growth-conversion-tracking'],
        because: 'Required only where the portal is also a billing surface.',
      },
      {
        label: 'Growth work on the public site',
        entityIds: ['web-corporate', 'growth-technical-seo'],
        because: 'A portal that few people reach needs the acquisition work that precedes it.',
      },
      {
        label: 'Content and onboarding',
        entityIds: ['creative-editorial', 'growth-content-production'],
        because: 'Where the portal needs explanation for first-time users.',
      },
    ],
    nextStep: 'Describe the customers, what they need to see, and which tasks should stop requiring staff.',
    searchTerms: ['customer portal', 'client portal', 'member area', 'customer login', 'self service portal'],
    relatedEntityIds: ['web-portal', 'web-application', 'growth-conversion-tracking'],
  },
  {
    id: 'sol-local',
    code: 'SOL-06',
    slug: 'promote-a-local-business',
    group: 'reach',
    title: 'Promote a Local Business',
    shortName: 'Local Business',
    index: '06',
    objective: 'A business needs the people who are nearby to find it, understand it and choose it.',
    statement:
      'Local acquisition is mostly about being correct and findable: accurate listings, a page that states the practical details, and a route to contact that works on a phone. Volume is rarely the constraint.',
    suits: 'Restaurants, clinics, trades, studios, retailers and any business with a catchment area.',
    core: [
      {
        label: 'Local presence',
        entityIds: ['web-corporate', 'creative-editorial'],
        because: 'A page carrying the practical facts people need: what it is, where it is, when it is open, how to reach it.',
      },
      {
        label: 'Local discoverability',
        entityIds: ['growth-local-visibility', 'growth-technical-seo'],
        because: 'Structured data, consistent listings and a crawlable site so map and search results resolve correctly.',
      },
      {
        label: 'Enquiry path',
        entityIds: ['growth-conversion-tracking', 'web-landing'],
        because: 'Calls, messages and bookings recorded so the channel can be judged rather than guessed.',
      },
    ],
    optional: [
      {
        label: 'Social presence',
        entityIds: ['growth-social', 'creative-social-content'],
        because: 'Matters where the audience already spends time, and only if production is sustainable.',
      },
      {
        label: 'Paid local search',
        entityIds: ['growth-google-ads', 'growth-campaign-strategy'],
        because: 'Useful for time-limited promotions; less useful as a substitute for being findable.',
      },
      {
        label: 'Menu, catalogue or booking system',
        entityIds: ['wordpress-starter', 'web-booking', 'web-portal'],
        because: 'Where the business trades on a specific transaction that the site should handle.',
      },
    ],
    nextStep: 'Describe the location, the catchment, and how customers currently find and contact the business.',
    searchTerms: ['local business marketing', 'restaurant website', 'clinic website', 'local seo', 'shop promotion', 'near me'],
    relatedEntityIds: ['growth-local-visibility', 'web-corporate', 'creative-editorial'],
  },
  {
    id: 'sol-academy',
    code: 'SOL-07',
    slug: 'build-an-academy-platform',
    group: 'build',
    title: 'Build an Academy Platform',
    shortName: 'Academy Platform',
    index: '07',
    objective: 'Structured knowledge has to be delivered to a defined group of learners.',
    statement:
      'An academy is a delivery problem before it is a technology problem. The content hierarchy, the cohort model and the assessment decisions determine the platform; the platform is chosen afterwards to serve them.',
    suits: 'Training providers, professional practices, membership bodies and internal learning programmes.',
    core: [
      {
        label: 'Programme design',
        entityIds: ['creative-editorial', 'growth-content-production'],
        because: 'The curriculum hierarchy and content production plan, established before any platform decision.',
      },
      {
        label: 'Delivery surface',
        entityIds: ['web-portal', 'web-application', 'wordpress-starter'],
        because: 'A gated, authenticated surface carrying the syllabus, materials and learner state.',
      },
      {
        label: 'Enrolment path',
        entityIds: ['web-ecommerce', 'growth-conversion-tracking', 'web-landing'],
        because: 'How a visitor becomes a registered, paying or confirmed learner, and how that is recorded.',
      },
    ],
    optional: [
      {
        label: 'Enrolment campaigns',
        entityIds: ['growth-content', 'growth-google-ads', 'creative-campaign'],
        because: 'Where the audience is not yet known and has to be built before enrolment is possible.',
      },
      {
        label: 'Interface design',
        entityIds: ['creative-ui-ux', 'creative-presentation'],
        because: 'A learner-facing surface is a product, and defaults are rarely appropriate for study.',
      },
      {
        label: 'Media production',
        entityIds: ['creative-social-content', 'creative-motion'],
        because: 'Where the curriculum depends on recorded material that does not exist yet.',
      },
    ],
    nextStep: 'Describe the subject, the audience, the delivery format and how learners are currently supported.',
    searchTerms: ['academy platform', 'online course website', 'learning platform', 'training website', 'lms website', 'sell courses'],
    relatedEntityIds: ['web-portal', 'growth-content', 'wordpress-starter'],
  },
  {
    id: 'sol-modernise',
    code: 'SOL-08',
    slug: 'modernise-an-existing-website',
    group: 'operate',
    title: 'Modernise an Existing Website',
    shortName: 'Modernise a Site',
    index: '08',
    objective: 'An existing site is slow, fragile, insecure, or impossible for the team to update safely.',
    statement:
      'A rebuild is not automatically the answer. Most sites that feel broken have one or two specific causes, and identifying them is cheaper than replacing the whole thing. Where a rebuild is genuinely required, the migration has to be treated as a project of its own.',
    suits: 'Organisations carrying an ageing site, a compromised install, or a site nobody can safely publish to.',
    core: [
      {
        label: 'Diagnosis',
        entityIds: ['web-performance-audit', 'wp-svc-performance', 'growth-technical-seo'],
        because: 'Measured findings on what is actually slow, broken or unreachable, before any decision is taken.',
      },
      {
        label: 'Remediation',
        entityIds: ['wp-svc-performance', 'wp-svc-security', 'wp-svc-backup', 'wp-svc-maintenance'],
        because: 'Targeted repair of the identified causes, with a restore path established first.',
      },
    ],
    optional: [
      {
        label: 'Rebuild',
        entityIds: ['web-corporate', 'wp-svc-migration', 'wp-svc-headless'],
        because: 'Where the diagnosis shows the platform itself is the constraint.',
      },
      {
        label: 'Editorial system',
        entityIds: ['wordpress-theme', 'wordpress-blocks', 'wordpress-maintenance'],
        because: 'Where the difficulty is publishing rather than serving pages.',
      },
      {
        label: 'Recovery planning',
        entityIds: ['wp-svc-backup', 'wp-svc-security'],
        because: 'Essential where the site has already been compromised.',
      },
    ],
    nextStep: 'Describe what is failing, when it started, and who maintains the site today.',
    searchTerms: ['website slow', 'rebuild my website', 'website redesign', 'hacked website', 'website not working', 'modernise website'],
    relatedEntityIds: ['web-performance-audit', 'wp-svc-performance', 'wp-svc-migration'],
  },
];

export function findSolution(slug: string): Solution | undefined {
  return solutions.find((solution) => solution.slug === slug);
}

/** Entities a solution references, resolved to real ids only. */
export function solutionEntityIds(solution: Solution): string[] {
  return [...solution.core.flatMap((layer) => layer.entityIds), ...solution.optional.flatMap((layer) => layer.entityIds)];
}

export function solutionEntities(): DiscoverableEntity[] {
  return solutions.map((solution) => ({
    id: solution.id,
    kind: 'solution',
    division: 'solutions',
    code: solution.code,
    slug: solution.slug,
    name: solution.title,
    shortName: solution.shortName,
    summary: solution.objective,
    status: 'service',
    route: `/solutions/${solution.slug}`,
    categories: ['solutions', solution.group],
    searchTerms: solution.searchTerms,
    capabilities: [],
    relatedIds: solution.relatedEntityIds,
  }));
}
