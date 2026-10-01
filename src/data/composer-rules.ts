import { capabilities } from '@/data/capabilities';
import type { DiscoverableEntity, DivisionId } from '@/lib/entities';
import { creativeEntities, webEntities } from '@/data/services';
import { growthEntities } from '@/data/growth';
import { solutionEntities } from '@/data/solutions';
import { wordPressEntities } from '@/data/wordpress';
import { labEntities, softwareEntities } from '@/data/software';

/**
 * Unified discovery index.
 *
 * Every public entity the site knows about, in one array. Global search, the
 * command palette and the Composer all read from here, which is what keeps
 * them consistent with each other and with the division pages.
 */

export const routeEntities: DiscoverableEntity[] = [
  { id: 'route-home', kind: 'route', division: 'institution', code: 'RT', slug: 'home', name: 'Headquarters', shortName: 'Home', summary: 'The KNOuX digital headquarters.', status: 'active', route: '/', categories: ['headquarters'], searchTerms: ['home', 'start', 'knoux', 'headquarters', 'main page'], capabilities: [], relatedIds: [] },
  { id: 'route-signal', kind: 'route', division: 'institution', code: 'SG', slug: 'signal', name: 'KNOuX Signal', shortName: 'Signal', summary: 'Phone identity, contact-label, reputation and owner-activity intelligence inside KNOuX Store.', status: 'active', route: '/signal', categories: ['institution', 'identity'], searchTerms: ['signal', 'phone lookup', 'caller identity', 'reverse lookup', 'contact labels', 'reputation'], capabilities: [], relatedIds: [] },
  { id: 'route-labs', kind: 'route', division: 'labs', code: 'RT', slug: 'labs', name: 'Labs', shortName: 'Labs', summary: 'Research, experiments and unfinished systems.', status: 'active', route: '/labs', categories: ['institution'], searchTerms: ['labs', 'research', 'experiments', 'prototype', 'wip'], capabilities: [], relatedIds: ['lab-quill', 'lab-crypt'] },
  { id: 'route-work', kind: 'route', division: 'institution', code: 'RT', slug: 'work', name: 'Work', shortName: 'Work', summary: 'Verified KNOuX product and engineering case files with repository evidence.', status: 'active', route: '/work', categories: ['institution'], searchTerms: ['work', 'case study', 'projects', 'portfolio', 'clients'], capabilities: [], relatedIds: [] },
  { id: 'route-engineering', kind: 'route', division: 'institution', code: 'RT', slug: 'engineering', name: 'Engineering', shortName: 'Engineering', summary: 'How KNOuX works from interface to delivery.', status: 'active', route: '/engineering', categories: ['institution'], searchTerms: ['engineering', 'process', 'method', 'practice', 'how you work'], capabilities: [], relatedIds: [] },
  { id: 'route-about', kind: 'route', division: 'institution', code: 'RT', slug: 'about', name: 'About', shortName: 'About', summary: 'The institution.', status: 'active', route: '/about', categories: ['institution'], searchTerms: ['about', 'who is knoux', 'institution', 'company'], capabilities: [], relatedIds: [] },
  { id: 'route-contact', kind: 'route', division: 'institution', code: 'RT', slug: 'contact', name: 'Contact', shortName: 'Contact', summary: 'Project and service enquiries.', status: 'active', route: '/contact', categories: ['institution'], searchTerms: ['contact', 'enquiry', 'hire', 'get in touch', 'email', 'quote'], capabilities: [], relatedIds: [] },
  { id: 'route-composer', kind: 'route', division: 'solutions', code: 'RT', slug: 'composer', name: 'Composer', shortName: 'Composer', summary: 'Describe a need and assemble a KNOuX stack from it.', status: 'active', route: '/build', categories: ['solutions'], searchTerms: ['composer', 'build something', 'what do i need', 'assemble', 'scope', 'plan my project'], capabilities: [], relatedIds: [] },
];

export const allEntities: readonly DiscoverableEntity[] = [
  ...routeEntities,
  ...softwareEntities(),
  ...labEntities(),
  ...wordPressEntities(),
  ...webEntities(),
  ...growthEntities(),
  ...creativeEntities(),
  ...solutionEntities(),
];

export const entityById = new Map(allEntities.map((entity) => [entity.id, entity]));

export function entityFor(id: string): DiscoverableEntity | undefined {
  return entityById.get(id);
}

export function entitiesForDivision(division: DivisionId): DiscoverableEntity[] {
  return allEntities.filter((entity) => entity.division === division);
}

/**
 * KNOuX Composer rules.
 *
 * A deterministic intent engine. Natural language is tokenised, matched
 * against capability labels, search terms and category words, and the matched
 * capabilities are resolved to real entities in the registries.
 *
 * It cannot invent a product, a price, a compatibility statement or a
 * delivery estimate, because it has no source for any of those. When nothing
 * matches it says so and offers the closest real starting points.
 */

export type ComposerRule = {
  /** Token or phrase that triggers this rule. */
  match: string[];
  /** Entity ids added when the rule fires. Must resolve in the registries. */
  entityIds: string[];
  /** Recorded on the result so the visitor can see why it appeared. */
  reason: string;
};

/** Intent phrases mapped to real entity ids. Every id is verified at build time. */
export const composerRules: readonly ComposerRule[] = [
  // --- Software: repair windows ---
  { match: ['repair', 'fix my pc', 'fix my computer', 'broken computer', 'slow computer', 'windows problem', 'pc problem', 'diagnostic', 'cleanup my pc', 'clean my pc', 'virus'], entityIds: ['sw-repair'], reason: 'Windows diagnostics, repair and recovery' },
  { match: ['organize files', 'organise files', 'sort files', 'duplicates', 'duplicate files', 'clean disk', 'empty folders', 'my downloads', 'file management'], entityIds: ['sw-organizer'], reason: 'File organisation and duplicate detection' },
  { match: ['record screen', 'screen record', 'record my screen', 'screen recorder', 'record video of my pc', 'capture screen'], entityIds: ['sw-rec'], reason: 'Local screen recording' },
  { match: ['media player', 'video player', 'play mkv', 'play avi', 'play video', 'movie player', 'equalizer'], entityIds: ['sw-player-x'], reason: 'Desktop media playback' },
  { match: ['clipboard', 'clipboard manager', 'copy paste history', 'barcode', 'qr code'], entityIds: ['sw-clipboard'], reason: 'Clipboard history and utilities' },
  { match: ['windows tool', 'system tool', 'desktop app', 'windows app', 'system maintenance'], entityIds: ['sw-one', 'sw-repair'], reason: 'Windows systems work' },
  { match: ['developer tool', 'code analysis', 'repository analysis', 'engineering workspace', 'ci', 'release automation', 'project health'], entityIds: ['sw-forge'], reason: 'Engineering command centre' },

  // --- Web ---
  { match: ['website', 'web site', 'site', 'company website', 'business website', 'corporate', 'landing page', 'one page'], entityIds: ['web-corporate'], reason: 'Institutional website' },
  { match: ['online store', 'shop', 'ecommerce', 'e-commerce', 'sell online', 'storefront', 'checkout', 'products for sale'], entityIds: ['web-ecommerce'], reason: 'Commerce build' },
  { match: ['web app', 'web application', 'saas', 'custom app', 'internal tool', 'admin panel', 'dashboard', 'back office'], entityIds: ['web-application', 'web-dashboard'], reason: 'Application and admin surface' },
  { match: ['portal', 'customer portal', 'client area', 'member area', 'login area', 'self service'], entityIds: ['web-portal'], reason: 'Authenticated customer surface' },
  { match: ['booking', 'appointment', 'reservation', 'calendar', 'schedule'], entityIds: ['web-booking'], reason: 'Booking and scheduling' },
  { match: ['3d', 'webgl', 'interactive', 'animation', 'spatial', 'explainer', 'showcase'], entityIds: ['web-experience'], reason: 'Interactive and spatial build' },
  { match: ['slow site', 'site is slow', 'speed up', 'performance', 'core web vitals', 'page speed'], entityIds: ['web-performance-audit'], reason: 'Measured performance work' },
  { match: ['headless', 'decoupled', 'cms frontend', 'nextjs frontend'], entityIds: ['wp-svc-headless'], reason: 'Decoupled delivery' },

  // --- WordPress ---
  { match: ['wordpress', 'wp', 'wp site', 'elementor', 'gutenberg', 'divi'], entityIds: ['wordpress-theme'], reason: 'WordPress authoring layer' },
  { match: ['wordpress plugin', 'extension', 'addon', 'woocommerce extension'], entityIds: ['wordpress-plugin'], reason: 'WordPress extensions' },
  { match: ['starter site', 'starter template', 'template site', 'site template'], entityIds: ['wordpress-starter'], reason: 'Starter foundation' },
  { match: ['migrate wordpress', 'move my site', 'rehost', 'migrate website', 'move website'], entityIds: ['wp-svc-migration'], reason: 'Migration' },
  { match: ['wordpress hacked', 'site hacked', 'malware', 'secure my site', 'harden'], entityIds: ['wp-svc-security'], reason: 'Hardening and security' },
  { match: ['backup', 'restore', 'backups', 'site backup'], entityIds: ['wp-svc-backup'], reason: 'Backup and recovery' },
  { match: ['maintain my website', 'website maintenance', 'updates', 'care plan', 'look after my site'], entityIds: ['wp-svc-maintenance'], reason: 'Ongoing maintenance' },

  // --- Growth ---
  { match: ['google ads', 'adwords', 'ppc', 'paid search', 'google campaign', 'shopping ads', 'sem'], entityIds: ['growth-google-ads', 'growth-account-setup', 'growth-conversion-tracking'], reason: 'Google advertising' },
  { match: ['meta ads', 'facebook ads', 'instagram ads', 'paid social', 'boost post'], entityIds: ['growth-meta-ads', 'growth-social-campaign', 'growth-audience-architecture'], reason: 'Meta advertising' },
  { match: ['social media', 'instagram', 'tiktok', 'reels', 'shorts', 'content calendar', 'social media management', 'post on instagram'], entityIds: ['growth-social', 'growth-creative-preparation', 'creative-social-content'], reason: 'Social production and distribution' },
  { match: ['seo', 'search engine', 'rank', 'organic', 'google ranking', 'discoverability', 'search visibility'], entityIds: ['growth-technical-seo'], reason: 'Search discoverability' },
  { match: ['content', 'blog', 'article', 'copywriting', 'content marketing', 'whitepaper'], entityIds: ['growth-content', 'growth-content-production'], reason: 'Content systems' },
  { match: ['tracking', 'analytics', 'measurement', 'conversion tracking', 'ga4', 'pixels', 'tag manager'], entityIds: ['growth-conversion-tracking', 'growth-analytics'], reason: 'Measurement' },
  { match: ['ads', 'advertising', 'marketing', 'promotion', 'acquisition', 'campaign'], entityIds: ['growth-campaign-strategy'], reason: 'Campaign strategy' },
  { match: ['local business', 'local seo', 'near me', 'map listing', 'google business profile', 'restaurant', 'clinic', 'salon'], entityIds: ['growth-local-visibility', 'web-corporate'], reason: 'Local discoverability' },

  // --- Creative ---
  { match: ['logo', 'brand', 'identity', 'branding', 'visual identity', 'wordmark', 'rebrand'], entityIds: ['creative-brand-identity'], reason: 'Brand identity' },
  { match: ['ux', 'ui', 'user experience', 'interface design', 'wireframe', 'prototype', 'design system'], entityIds: ['creative-ui-ux'], reason: 'Interface architecture' },
  { match: ['art direction', 'editorial', 'web design direction', 'look and feel', 'aesthetic'], entityIds: ['creative-editorial'], reason: 'Art direction' },
  { match: ['ad creative', 'banner', 'ad design', 'campaign creative', 'ad assets'], entityIds: ['creative-campaign'], reason: 'Campaign creative' },
  { match: ['motion', 'animation', 'kinetic', 'transitions', 'motion design'], entityIds: ['creative-motion'], reason: 'Motion grammar' },
  { match: ['product photos', 'product photography', 'renders', 'product images', 'packaging'], entityIds: ['creative-product-visuals'], reason: 'Product visuals' },
  { match: ['pitch deck', 'presentation', 'slides', 'proposal', 'report design'], entityIds: ['creative-presentation'], reason: 'Presentation systems' },
  { match: ['launch assets', 'launch content', 'go to market'], entityIds: ['creative-launch-content'], reason: 'Launch content' },

  // --- Solutions as entry points ---
  { match: ['start a business', 'new business', 'found a company', 'incorporate'], entityIds: ['sol-start-business'], reason: 'Starting a business' },
  { match: ['launch a product', 'new product', 'product launch', 'release a product'], entityIds: ['sol-launch-product'], reason: 'Launching a product' },
  { match: ['build a store', 'open a store', 'sell products'], entityIds: ['sol-online-store'], reason: 'Online store' },
  { match: ['automate', 'streamline operations', 'replace spreadsheets', 'digitise', 'digitize'], entityIds: ['sol-operations'], reason: 'Operations systems' },
  { match: ['customer portal', 'client portal', 'self service'], entityIds: ['sol-portal'], reason: 'Customer portal' },
  { match: ['academy', 'courses', 'online school', 'training platform', 'lms', 'teach online'], entityIds: ['sol-academy'], reason: 'Academy platform' },
  { match: ['redesign', 'rebuild', 'modernise', 'modernize', 'outdated website', 'old website'], entityIds: ['sol-modernise'], reason: 'Modernising an existing site' },
];

/** Longest phrase first so "google ads" wins over "ads". */
const rulesByPhrase = [...composerRules].sort((a, b) => {
  const longest = (rule: ComposerRule) => Math.max(...rule.match.map((phrase) => phrase.length));
  return longest(b) - longest(a);
});

export type ComposerMatch = {
  phrase: string;
  entityIds: string[];
  reason: string;
};

export type ComposerResult = {
  /** Normalised input, echoed so the visitor can see what was read. */
  input: string;
  matches: ComposerMatch[];
  /** Entity ids in recommendation order, de-duplicated. */
  entityIds: string[];
  /** Grouped for display by division. */
  stack: { division: DivisionId; items: DiscoverableEntity[] }[];
  /** Solution entry points that match, always shown first when present. */
  solutionIds: string[];
  /** Capability ids the match resolved to, for the capability summary. */
  capabilityIds: string[];
  /** True when nothing matched, so the UI can be honest rather than guessing. */
  empty: boolean;
};

const STOP_WORDS = new Set([
  'i', 'we', 'my', 'our', 'the', 'a', 'an', 'and', 'or', 'with', 'for', 'need', 'needs',
  'need to', 'want', 'want to', 'would', 'like', 'looking', 'help', 'please', 'how', 'do',
  'you', 'can', 'it', 'me', 'to', 'some', 'something', 'is', 'are', 'that', 'this', 'on',
  'in', 'at', 'of', 'about', 'there',
]);

function normalise(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function evaluateComposer(rawInput: string): ComposerResult {
  const normalised = normalise(rawInput);
  const matches: ComposerMatch[] = [];
  const seenPhrases = new Set<string>();
  const specificWebIntent = /\b(ecommerce|e commerce|online store|shop|storefront|portal|academy|booking|appointment|dashboard|web app)\b/.test(normalised);
  const specificPaidIntent = /\b(google ads|meta ads|facebook ads|instagram ads|paid search|paid social|adwords)\b/.test(normalised);

  for (const rule of rulesByPhrase) {
    for (const phrase of rule.match) {
      if (seenPhrases.has(phrase)) continue;
      const term = normalise(phrase);
      if (!term || !new RegExp(`(?:^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`).test(normalised)) continue;
      // A named system or channel is more useful than an additional generic one.
      if (specificWebIntent && ['website', 'web site', 'site', 'business website'].includes(phrase)) continue;
      if (specificPaidIntent && ['ads', 'advertising', 'campaign'].includes(phrase)) continue;
      // Skip a phrase that is entirely stop words unless it is a real phrase.
      if (STOP_WORDS.has(phrase) && !rule.entityIds.length) continue;
      seenPhrases.add(phrase);
      matches.push({ phrase, entityIds: rule.entityIds, reason: rule.reason });
    }
  }

  matches.sort((a, b) => b.phrase.length - a.phrase.length);

  // Capability resolution is a fallback for language with no explicit intent
  // phrase. It never expands a precise request into unrelated disciplines.
  const capabilityIds: string[] = [];
  if (matches.length === 0) {
    for (const token of normalised.split(' ')) {
      if (token.length < 4 || STOP_WORDS.has(token)) continue;
      for (const capability of capabilities) {
        const terms = [capability.label, ...capability.searchTerms].flatMap((entry) => normalise(entry).split(' '));
        if (terms.includes(token) && !capabilityIds.includes(capability.id)) capabilityIds.push(capability.id);
      }
    }
  }

  const entityIds: string[] = [];
  const push = (id: string) => {
    if (!entityById.has(id)) return; // Never emit an unresolvable reference.
    if (!entityIds.includes(id)) entityIds.push(id);
  };

  const solutionIds: string[] = [];
  for (const match of matches) {
    for (const id of match.entityIds) {
      if (id.startsWith('sol-')) solutionIds.push(id);
      push(id);
    }
  }
  for (const capabilityId of capabilityIds) {
    for (const entity of allEntities) {
      if (entity.capabilities.includes(capabilityId)) push(entity.id);
    }
  }

  const stack: ComposerResult['stack'] = [];
  const divisionOrder: DivisionId[] = ['solutions', 'software', 'wordpress', 'web', 'growth', 'creative'];
  for (const division of divisionOrder) {
    const items = entityIds.map((id) => entityById.get(id)).filter((entity): entity is DiscoverableEntity => Boolean(entity) && entity!.division === division);
    if (items.length) stack.push({ division, items });
  }

  return {
    input: rawInput.trim(),
    matches: matches.slice(0, 8),
    entityIds,
    stack,
    solutionIds,
    capabilityIds: capabilityIds.slice(0, 8),
    empty: entityIds.length === 0,
  };
}

/** Preset prompts. Each one is phrased the way a visitor would phrase it. */
export const composerPresets: ReadonlyArray<{ id: string; label: string; prompt: string }> = [
  { id: 'restaurant', label: 'Restaurant', prompt: 'I have a new restaurant and need a website, Instagram and ads.' },
  { id: 'store', label: 'Ecommerce', prompt: 'I need an ecommerce website with Google Ads.' },
  { id: 'repair', label: 'Repair tool', prompt: 'I need software to repair Windows.' },
  { id: 'academy', label: 'Academy', prompt: 'I want to sell courses on an academy platform.' },
  { id: 'operations', label: 'Operations', prompt: 'I need a customer portal and an admin dashboard for my team.' },
  { id: 'migrate', label: 'Migration', prompt: 'My WordPress site is slow and I want to migrate it.' },
];

/** Starting points shown when the engine finds nothing. Real entities only. */
export function composerFallbacks(): DiscoverableEntity[] {
  const ids = ['sol-start-business', 'web-corporate', 'web-ecommerce', 'growth-campaign-strategy', 'creative-brand-identity', 'sw-repair'];
  return ids.map((id) => entityById.get(id)).filter((entity): entity is DiscoverableEntity => Boolean(entity));
}

/** Composer cannot name these because they are not knowable from input. */
export const composerDisclosure: readonly string[] = [
  'Recommendations are resolved from KNOuX catalogues and named capabilities. Nothing is inferred from a language model.',
  'The Composer does not estimate price, delivery time or result. Those depend on scope and are agreed in conversation.',
  'Items appear here only because they exist in a KNOuX registry. If a catalogue is empty, its items are not suggested.',
];
