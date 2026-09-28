import type { DiscoverableEntity } from '@/lib/entities';

/**
 * KNOuX Web engineering.
 *
 * Organised by system type, not by portfolio. Each entry describes work KNOuX
 * actually performs and the disciplines that carry it. There are no prices,
 * no delivery windows, no client counts and no performance guarantees here,
 * because none of those are established facts about this practice.
 */

export type WebSystemCategory = 'site' | 'commerce' | 'application' | 'platform' | 'experience';

export type WebSystem = {
  id: string;
  code: string;
  slug: string;
  category: WebSystemCategory;
  title: string;
  shortName: string;
  /** One line used in rails and command results. */
  tagline: string;
  statement: string;
  /** Capability ids resolved from `data/capabilities.ts`. */
  capabilityIds: string[];
  /** The disciplines that make up this kind of build. */
  disciplines: { label: string; detail: string }[];
  /** What the client ends up holding. Describes artefacts, not outcomes. */
  artefacts: string[];
  /** Named starting platforms. A choice, not a mandate. */
  platformNotes: string[];
  /** Questions that genuinely change the architecture. */
  qualifiers: string[];
  relatedEntityIds: string[];
};

export const webSystemCategories: ReadonlyArray<{
  id: WebSystemCategory;
  label: string;
  question: string;
}> = [
  { id: 'site', label: 'Website', question: 'A site that represents an organisation and has to be maintained.' },
  { id: 'commerce', label: 'Store', question: 'A site whose job is to take money, so the checkout is the product.' },
  { id: 'application', label: 'Application', question: 'Software where the user is doing work, not reading.' },
  { id: 'platform', label: 'Platform', question: 'Several internal or external roles sharing one authenticated surface.' },
  { id: 'experience', label: 'Experience', question: 'A spatial or interactive build where the medium is the argument.' },
];

export const webSystems: readonly WebSystem[] = [
  {
    id: 'web-corporate',
    code: 'WEB-01',
    slug: 'corporate-site',
    category: 'site',
    title: 'Institutional Website',
    shortName: 'Website',
    tagline: 'A site that has to stay correct for years',
    statement:
      'A site whose quality is mostly editorial discipline: a content model that survives reorganisations, an accessibility baseline that does not regress, and a build a non-specialist can safely update without breaking layout.',
    capabilityIds: ['web-corporate', 'web-performance-audit', 'wordpress-migration'],
    disciplines: [
      { label: 'Content model', detail: 'Structuring what exists, naming what repeats, and deciding what the editor owns.' },
      { label: 'Interface system', detail: 'Typography, spacing and component rules that hold across unpredictable content lengths.' },
      { label: 'Accessibility', detail: 'Keyboard paths, contrast, focus order and screen-reader labels treated as build requirements.' },
      { label: 'Delivery', detail: 'A build and hosting arrangement with a documented update path.' },
    ],
    artefacts: ['Content model and page inventory', 'Design token set and component library', 'Accessible, tested build', 'Update and ownership documentation'],
    platformNotes: ['Next.js for highly dynamic or multi-role sites', 'WordPress where the editorial team needs a familiar admin'],
    qualifiers: ['How many people will publish, and how often?', 'Does legal or compliance review apply to any of the content?', 'Is there a design system already in place?'],
    relatedEntityIds: ['wordpress-theme', 'creative-brand-identity', 'growth-technical-seo'],
  },
  {
    id: 'web-ecommerce',
    code: 'WEB-02',
    slug: 'ecommerce',
    category: 'commerce',
    title: 'E-Commerce',
    shortName: 'Store',
    tagline: 'A storefront where the checkout is the product',
    statement:
      'Catalogue structure, cart behaviour, payment and shipping integration, and the measurement required to know which of those steps is losing people. Performance work here follows the money path rather than the homepage.',
    capabilityIds: ['web-ecommerce', 'growth-conversion-tracking', 'wordpress-starter'],
    disciplines: [
      { label: 'Catalogue', detail: 'Taxonomy, variants, search and filtering designed for how people actually search.' },
      { label: 'Checkout', detail: 'Payment provider, taxes, shipping rules and the failure states nobody designs until they are needed.' },
      { label: 'Operations', detail: 'Inventory, order flow and the reconciliation between the storefront and reality.' },
      { label: 'Measurement', detail: 'Server-side and client-side events, deduplicated, agreeing with the back office.' },
    ],
    artefacts: ['Storefront with tested checkout path', 'Catalogue and product data model', 'Payment and shipping integration', 'Conversion event map wired to reporting'],
    platformNotes: ['WordPress with WooCommerce where the team wants a familiar admin', 'A headless storefront where catalogue scale or checkout control justifies it'],
    qualifiers: ['Roughly how many products, and how many variants?', 'Which markets and currencies need to be supported?', 'Is there an existing ERP or warehouse system to integrate?'],
    relatedEntityIds: ['wordpress-starter', 'growth-google-ads', 'growth-meta-ads', 'creative-product-visuals'],
  },
  {
    id: 'web-application',
    code: 'WEB-03',
    slug: 'web-application',
    category: 'application',
    title: 'Web Application',
    shortName: 'Application',
    tagline: 'Software where the user is doing work',
    statement:
      'A build with real state, real permissions and real failure modes. The interesting engineering is in the data model, the authorisation boundaries and what the interface does when a request is slow or fails.',
    capabilityIds: ['web-application', 'web-dashboard', 'web-internal-tools'],
    disciplines: [
      { label: 'Data model', detail: 'Schema, migrations and the invariants the application refuses to violate.' },
      { label: 'Authorisation', detail: 'Who may read and write what, enforced on the server and not only in the interface.' },
      { label: 'Interface states', detail: 'Empty, loading, partial, error and offline treated as designed states.' },
      { label: 'Operations', detail: 'Logging, backups and a deployment path that can be run more than once.' },
    ],
    artefacts: ['Data model and migration path', 'Authenticated application with role-based access', 'Admin surfaces and audit trail', 'Deployment and recovery documentation'],
    platformNotes: ['Next.js with a typed API layer', 'A split frontend and service tier when the domain warrants it'],
    qualifiers: ['Who are the user roles, and what may each one not do?', 'What is the expected volume and the cost of a wrong write?', 'Does this replace an existing system of record?'],
    relatedEntityIds: ['web-portal', 'web-internal-tools', 'software-engineering'],
  },
  {
    id: 'web-portal',
    code: 'WEB-04',
    slug: 'customer-portal',
    category: 'platform',
    title: 'Customer Portal',
    shortName: 'Portal',
    tagline: 'Authenticated space for customers or members',
    statement:
      'A gated surface where a person expects to see their own information: an order, a subscription, a booking, a document. The work is in identity, in personalisation, and in making the boundary between one customer and another unbreakable.',
    capabilityIds: ['web-portal', 'web-booking', 'web-application'],
    disciplines: [
      { label: 'Identity', detail: 'Authentication, session handling, recovery and account linking.' },
      { label: 'Personalisation', detail: 'Every surface scoped to the authenticated person, verified server-side.' },
      { label: 'Self-service', detail: 'The actions a user should never have to email about.' },
      { label: 'Notification', detail: 'How a user learns that something changed or is waiting for them.' },
    ],
    artefacts: ['Authenticated portal with scoped access', 'Account and recovery flows', 'Self-service actions with confirmation states', 'Notification configuration'],
    platformNotes: ['Next.js with server-side session handling', 'An existing identity provider, integrated rather than replaced'],
    qualifiers: ['Is there an existing account system or CRM to integrate with?', 'What does a customer need to see that staff currently send by email?', 'How many distinct member tiers exist?'],
    relatedEntityIds: ['web-application', 'growth-conversion-tracking', 'wordpress-maintenance'],
  },
  {
    id: 'web-dashboard',
    code: 'WEB-05',
    slug: 'admin-dashboard',
    category: 'platform',
    title: 'Admin & Reporting',
    shortName: 'Dashboard',
    tagline: 'An internal view over operational data',
    statement:
      'The screen staff use all day. Dense, fast to read, honest about stale data, and designed so a mistake in the interface is difficult to commit in the first place.',
    capabilityIds: ['web-dashboard', 'web-internal-tools', 'web-application'],
    disciplines: [
      { label: 'Information density', detail: 'Structured so the common case is one glance and the rare case is still reachable.' },
      { label: 'Data freshness', detail: 'Showing how recent a figure is, rather than presenting a stale number as current.' },
      { label: 'Safe actions', detail: 'Destructive operations behind explicit confirmation with an undo where one is possible.' },
      { label: 'Export', detail: 'Getting data out in a form the business already uses.' },
    ],
    artefacts: ['Role-scoped dashboard', 'Reporting views with freshness indicators', 'Safe-action patterns and audit trail', 'Export to the formats the team already uses'],
    platformNotes: ['A typed web application sharing the operational database', 'Read-only replicas where reporting load would affect operations'],
    qualifiers: ['Which decisions does this screen actually drive?', 'What is the current reporting process people work around?', 'Is real-time necessary, or is daily freshness sufficient?'],
    relatedEntityIds: ['web-application', 'creative-ui-ux', 'software-engineering'],
  },
  {
    id: 'web-experience',
    code: 'WEB-06',
    slug: 'interactive-experience',
    category: 'experience',
    title: 'Interactive & Spatial',
    shortName: 'Experience',
    tagline: 'A build where the medium carries the argument',
    statement:
      'Spatial or interactive work where a static page would not communicate the thing. Treated as a performance problem first: an accessible DOM carries the meaning, and the interactive layer enhances it.',
    capabilityIds: ['web-landing', 'creative-motion', 'web-performance-audit'],
    disciplines: [
      { label: 'Asset pipeline', detail: 'Geometry, texture and animation budgets decided before modelling starts.' },
      { label: 'Interaction', detail: 'Pointer, touch and keyboard input treated as equally required.' },
      { label: 'Graceful degradation', detail: 'A readable, navigable page when the interactive layer cannot run.' },
      { label: 'Accessibility', detail: 'Semantic DOM and text alternatives for everything the canvas presents.' },
    ],
    artefacts: ['Interactive scene with defined asset budgets', 'Accessible DOM equivalent carrying the same content', 'Progressive enhancement from static to interactive', 'Documented performance envelope on target devices'],
    platformNotes: ['React Three Fiber or direct WebGL where a real-time scene is required', 'CSS and SVG where the requirement is motion, not depth'],
    qualifiers: ['What must the interaction communicate that a photograph cannot?', 'Which devices must it run on, including older phones?', 'Is there a non-interactive fallback the content depends on?'],
    relatedEntityIds: ['creative-motion', 'creative-editorial', 'web-performance-audit'],
  },
];

export function webSystemsByCategory(category: WebSystemCategory): WebSystem[] {
  return webSystems.filter((system) => system.category === category);
}

export function findWebSystem(slug: string): WebSystem | undefined {
  return webSystems.find((system) => system.slug === slug);
}

export function webEntities(): DiscoverableEntity[] {
  return webSystems.map((system) => ({
    id: system.id,
    kind: 'web-system',
    division: 'web',
    code: system.code,
    slug: system.slug,
    name: system.title,
    shortName: system.shortName,
    summary: system.tagline,
    status: 'service',
    route: `/web/${system.slug}`,
    categories: ['web', system.category],
    searchTerms: [system.title, system.tagline, ...system.qualifiers.slice(0, 1)],
    capabilities: system.capabilityIds,
    relatedIds: system.relatedEntityIds,
  }));
}

/**
 * KNOuX Creative.
 *
 * Capability systems, not a gallery. No projects are shown because no
 * verified project archive has been published, and none is invented.
 */

export type CreativeDiscipline = {
  id: string;
  code: string;
  slug: string;
  title: string;
  shortName: string;
  subtitle: string;
  statement: string;
  capabilityIds: string[];
  deliverables: string[];
  principles: string[];
  pairsWith: string[];
};

export const creativeDisciplines: readonly CreativeDiscipline[] = [
  {
    id: 'creative-brand-identity',
    code: 'CR-01',
    slug: 'brand-identity',
    title: 'Brand Identity',
    shortName: 'Identity',
    subtitle: 'Marks, colour and typographic systems that survive scale',
    statement:
      'Identity work that has to work at sixteen pixels in a browser tab and at building-signage scale, specified precisely enough that anyone can implement it without asking what was meant.',
    capabilityIds: ['creative-brand-identity'],
    deliverables: ['Wordmark and geometric specification', 'Colour and typographic definitions with production values', 'Usage rules and prohibited applications', 'Implementation guidance for design and engineering'],
    principles: ['Geometry before decoration', 'Legibility at the smallest real use', 'Rules written so they can be followed without the designer present'],
    pairsWith: ['web-corporate', 'creative-editorial'],
  },
  {
    id: 'creative-ui-ux',
    code: 'CR-02',
    slug: 'ui-ux',
    title: 'UI / UX Architecture',
    shortName: 'Interface',
    subtitle: 'The structure of how a system is understood and used',
    statement:
      'Mapping dense work onto a legible plane: hierarchy, states, keyboard paths and the error cases that get designed last and matter most.',
    capabilityIds: ['creative-ui-ux', 'web-dashboard'],
    deliverables: ['Interface architecture and flow', 'Component and state specification', 'Keyboard and focus behaviour definition', 'Implementation-ready tokens'],
    principles: ['Design the failure states first', 'Every action reversible or explicitly confirmed', 'Keyboard parity with pointer interaction'],
    pairsWith: ['web-application', 'web-dashboard', 'creative-motion'],
  },
  {
    id: 'creative-editorial',
    code: 'CR-03',
    slug: 'art-direction',
    title: 'Web Art Direction',
    shortName: 'Art Direction',
    subtitle: 'The visual standard a site holds itself to',
    statement:
      'Direction for a body of pages rather than a single screen: how imagery is treated, how much space a page is allowed, and what the typographic rhythm is.',
    capabilityIds: ['creative-editorial', 'creative-ui-ux'],
    deliverables: ['Art direction standard with reference layouts', 'Imagery and media treatment rules', 'Editorial rhythm and page-type definitions', 'Review checklist for new pages'],
    principles: ['Restraint as a decision, not a default', 'Real material over placeholder texture', 'One idea per screen'],
    pairsWith: ['web-corporate', 'creative-brand-identity'],
  },
  {
    id: 'creative-campaign',
    code: 'CR-04',
    slug: 'campaign-creative',
    title: 'Campaign Creative',
    shortName: 'Campaign',
    subtitle: 'Assets built to be tested, not admired',
    statement:
      'Creative for paid distribution, produced as variants with a defined variable per variant so that a test produces information rather than a preference.',
    capabilityIds: ['creative-campaign', 'creative-launch-content'],
    deliverables: ['Asset set with a stated variation axis', 'Format and placement specifications', 'Copy variants with a documented hypothesis each', 'Production and iteration log'],
    principles: ['One variable per test', 'Legible at small sizes before anything else', 'Shipping cadence agreed before production starts'],
    pairsWith: ['growth-meta-ads', 'growth-google-ads', 'web-landing'],
  },
  {
    id: 'creative-social-content',
    code: 'CR-05',
    slug: 'social-content',
    title: 'Social Content',
    shortName: 'Social',
    subtitle: 'Short-form material built on a publishing rhythm',
    statement:
      'A repeatable production line for short-form video and social posts, so publishing does not depend on inspiration arriving on schedule.',
    capabilityIds: ['creative-social-content', 'creative-motion'],
    deliverables: ['Defined format set with duration and aspect rules', 'Production template and asset source structure', 'Editorial calendar with copy drafts', 'Reusable edit recipes'],
    principles: ['Template the boring parts so effort goes to the idea', 'Native framing per platform, not cross-posting', 'Consistent cadence beats occasional quality'],
    pairsWith: ['growth-social', 'growth-content'],
  },
  {
    id: 'creative-motion',
    code: 'CR-06',
    slug: 'motion',
    title: 'Motion & Interaction',
    shortName: 'Motion',
    subtitle: 'A shared grammar so the whole system moves the same way',
    statement:
      'Motion defined as a specification: what duration means, what easing means, which transitions are allowed and what the reduced-motion equivalent is. Motion is treated as information, not decoration.',
    capabilityIds: ['creative-motion', 'creative-ui-ux'],
    deliverables: ['Motion token set and easing decisions', 'Transition and state specification', 'Reduced-motion equivalents for every animation', 'Implementation guidance'],
    principles: ['Duration communicates distance', 'Nothing animates without a reason', 'Every animation has a reduced-motion path'],
    pairsWith: ['creative-ui-ux', 'web-experience'],
  },
  {
    id: 'creative-product-visuals',
    code: 'CR-07',
    slug: 'product-visuals',
    title: 'Product Visuals',
    shortName: 'Visuals',
    subtitle: 'Imagery that shows the actual product',
    statement:
      'Product imagery treated as a production problem: lighting consistency, scale reference, and honest representation of materials rather than rendered approximation.',
    capabilityIds: ['creative-product-visuals', 'creative-editorial'],
    deliverables: ['Photography or render set with a consistent treatment', 'Scale, context and detail conventions', 'Usage matrix by placement and size', 'Retouching standard'],
    principles: ['One lighting setup across a set', 'Include scale reference where size matters', 'Retouch out the flaws of the process, not the product'],
    pairsWith: ['web-ecommerce', 'creative-campaign'],
  },
  {
    id: 'creative-presentation',
    code: 'CR-08',
    slug: 'presentation',
    title: 'Presentation Systems',
    shortName: 'Presentation',
    subtitle: 'Decks and documents that carry a decision',
    statement:
      'Pitch, proposal and report documents built as systems: a small number of page types, each with a defined purpose, so a team can produce the next one without redesigning it.',
    capabilityIds: ['creative-presentation', 'creative-editorial'],
    deliverables: ['Page-type system for the document family', 'Master layouts and typography scale', 'Chart and data-visualisation standard', 'Production template for the team'],
    principles: ['One argument per page', 'Charts that show the actual distribution', 'Reusable system, not a bespoke deck'],
    pairsWith: ['creative-editorial', 'creative-brand-identity'],
  },
];

export function findCreativeDiscipline(slug: string): CreativeDiscipline | undefined {
  return creativeDisciplines.find((discipline) => discipline.slug === slug);
}

export function creativeEntities(): DiscoverableEntity[] {
  return creativeDisciplines.map((discipline) => ({
    id: discipline.id,
    kind: 'creative-capability',
    division: 'creative',
    code: discipline.code,
    slug: discipline.slug,
    name: discipline.title,
    shortName: discipline.shortName,
    summary: discipline.subtitle,
    status: 'service',
    route: `/creative/${discipline.slug}`,
    categories: ['creative', discipline.slug],
    searchTerms: [discipline.title, discipline.subtitle, ...discipline.principles.slice(0, 1)],
    capabilities: discipline.capabilityIds,
    relatedIds: discipline.pairsWith,
  }));
}

/** Institutional engineering practice, shared by several divisions. */
export const engineeringStages: ReadonlyArray<{ id: string; index: string; title: string; detail: string }> = [
  { id: 'eng-interface', index: '01', title: 'Interface', detail: 'How someone understands what a system is and what it will do for them.' },
  { id: 'eng-runtime', index: '02', title: 'Runtime', detail: 'How it behaves under load, on failure, and when the data underneath it changes.' },
  { id: 'eng-data', index: '03', title: 'Data', detail: 'How information is shaped, versioned, protected and deleted.' },
  { id: 'eng-delivery', index: '04', title: 'Delivery', detail: 'How it is tested, released, observed and taken apart again.' },
];
