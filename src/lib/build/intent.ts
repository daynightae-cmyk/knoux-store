/**
 * Deterministic intent extraction for the Command Deck.
 *
 * This is not a language model and does not pretend to be one. It reads a
 * visitor's sentence with the same phrase tables the Build Composer already
 * uses, then adds a second, purely lexical pass for the engineering vocabulary
 * a project specification needs: product kind, stack, integrations, languages
 * and deployment target.
 *
 * Two properties matter and are tested:
 *   1. It produces the same result for the same input, on any machine.
 *   2. It never invents. A term it cannot resolve is returned in
 *      `unresolvedTerms` rather than being quietly mapped to something close.
 */

import { entityById, evaluateComposer } from '@/data/composer-rules';
import type { DiscoverableEntity } from '@/lib/entities';
import type {
  BuildIntent,
  DeploymentTarget,
  IntentConfidence,
  ProductKind,
} from './types';

/** Product kinds, matched longest-phrase-first so "web app" beats "app". */
const PRODUCT_KINDS: { kind: ProductKind; terms: string[] }[] = [
  { kind: 'ecommerce', terms: ['ecommerce', 'e commerce', 'online store', 'shop', 'storefront', 'sell online', 'checkout'] },
  { kind: 'booking', terms: ['booking', 'appointments', 'reservation system', 'scheduling'] },
  { kind: 'portal', terms: ['portal', 'customer portal', 'client portal', 'member area', 'customer area'] },
  { kind: 'saas', terms: ['saas', 'subscription service', 'multi tenant', 'multitenant'] },
  { kind: 'api', terms: ['api', 'rest api', 'backend service', 'web service', 'microservice'] },
  { kind: 'ai-application', terms: ['ai app', 'ai application', 'chatbot', 'assistant', 'llm', 'ai powered', 'copilot'] },
  { kind: 'admin', terms: ['admin panel', 'admin dashboard', 'back office', 'internal tool', 'operations dashboard', 'crm', 'erp'] },
  { kind: 'web-application', terms: ['web app', 'web application', 'application', 'custom app', 'progressive web app', 'pwa'] },
  { kind: 'landing', terms: ['landing page', 'one page', 'one pager', 'coming soon page', 'waitlist'] },
  { kind: 'website', terms: ['website', 'web site', 'web presence', 'company site', 'business website', 'brochure site'] },
  { kind: 'desktop', terms: ['desktop app', 'desktop application', 'windows app', 'native app', 'macos app'] },
  { kind: 'system-tool', terms: ['system tool', 'utility', 'windows tool', 'internal script', 'maintenance tool'] },
];

/** Only stacks the project can actually speak to. None of this is installed. */
const STACK_TERMS: { label: string; terms: string[] }[] = [
  { label: 'Next.js', terms: ['nextjs', 'next js', 'next'] },
  { label: 'React', terms: ['react', 'reactjs'] },
  { label: 'TypeScript', terms: ['typescript', 'ts'] },
  { label: 'Node.js', terms: ['node', 'nodejs'] },
  { label: 'Supabase', terms: ['supabase'] },
  { label: 'Postgres', terms: ['postgres', 'postgresql', 'psql'] },
  { label: 'WordPress', terms: ['wordpress', 'wp'] },
  { label: 'Tailwind', terms: ['tailwind', 'tailwindcss'] },
  { label: 'Three.js', terms: ['threejs', 'three js', 'webgl'] },
  { label: 'Python', terms: ['python', 'django', 'flask', 'fastapi'] },
  { label: 'Docker', terms: ['docker', 'container', 'containers', 'kubernetes'] },
];

const INTEGRATION_TERMS: { label: string; terms: string[] }[] = [
  { label: 'Authentication', terms: ['auth', 'authentication', 'login', 'sign in', 'user accounts', 'members', 'roles', 'permissions'] },
  { label: 'Payments', terms: ['payments', 'stripe', 'paypal', 'billing', 'subscription billing', 'checkout payment'] },
  { label: 'Email', terms: ['email', 'mail', 'smtp', 'newsletter', 'notifications'] },
  { label: 'Storage', terms: ['storage', 'file upload', 'uploads', 'media library', 's3', 'bucket'] },
  { label: 'Search', terms: ['search', 'full text search', 'indexing'] },
  { label: 'Analytics', terms: ['analytics', 'tracking', 'ga4', 'telemetry', 'measurement'] },
  { label: 'Maps', terms: ['maps', 'google maps', 'location', 'geo', 'geolocation'] },
  { label: 'Realtime', terms: ['realtime', 'real time', 'websocket', 'live updates', 'subscriptions'] },
];

const LANGUAGE_TERMS: { label: string; terms: string[] }[] = [
  { label: 'Arabic', terms: ['arabic', 'عربي', 'rtl'] },
  { label: 'English', terms: ['english'] },
  { label: 'French', terms: ['french', 'francais'] },
  { label: 'Spanish', terms: ['spanish', 'espanol'] },
  { label: 'Turkish', terms: ['turkish', 'turkce'] },
  { label: 'German', terms: ['german', 'deutsch'] },
];

const DEPLOYMENT_TERMS: { target: DeploymentTarget; terms: string[] }[] = [
  { target: 'pwa', terms: ['pwa', 'progressive web app', 'installable', 'android ready', 'offline app'] },
  { target: 'android', terms: ['android', 'play store', 'google play'] },
  { target: 'ios', terms: ['ios', 'iphone', 'app store'] },
  { target: 'desktop', terms: ['desktop', 'windows desktop', 'exe', 'macos', 'native install'] },
  { target: 'wordpress', terms: ['wordpress', 'wp hosting'] },
  { target: 'web', terms: ['hosted', 'web hosting', 'deploy to web', 'vps', 'cloud'] },
];

/** Words that carry no specification meaning. Filtered before unresolvedTerms. */
const STOP_WORDS = new Set([
  'i', 'we', 'my', 'our', 'me', 'you', 'the', 'a', 'an', 'and', 'or', 'but', 'with',
  'for', 'need', 'needs', 'need to', 'want', 'wants', 'would', 'like', 'want to',
  'looking', 'help', 'please', 'how', 'do', 'can', 'it', 'its', 'to', 'some',
  'something', 'is', 'are', 'was', 'be', 'been', 'that', 'this', 'these', 'on',
  'in', 'at', 'of', 'about', 'there', 'also', 'very', 'just', 'make', 'build',
  'create', 'want', 'should', 'will', 'must', 'have', 'has', 'get', 'got',
]);

function normalise(input: string): string {
  return ` ${input
    .toLowerCase()
    .replace(/[\u0640]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function contains(normalised: string, term: string): boolean {
  const needle = ` ${term.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
  return normalised.includes(needle);
}

/**
 * First entry whose phrase list matches, longest phrase first so "web app"
 * beats a bare "app". Returns null rather than a default, so the caller has to
 * decide what an absent match means.
 */
function firstMatch<K, T extends { terms: string[] }>(
  normalised: string,
  table: readonly T[],
  key: (entry: T) => K,
): K | null {
  const ordered = [...table].sort((a, b) => longestPhrase(b) - longestPhrase(a));
  for (const entry of ordered) {
    if (entry.terms.some((term) => contains(normalised, term))) return key(entry);
  }
  return null;
}

function longestPhrase(entry: { terms: string[] }): number {
  return entry.terms.reduce((max, term) => Math.max(max, term.length), 0);
}

function collect(normalised: string, table: { label: string; terms: string[] }[]): string[] {
  const found: string[] = [];
  for (const entry of table) {
    if (entry.terms.some((term) => contains(normalised, term)) && !found.includes(entry.label)) {
      found.push(entry.label);
    }
  }
  return found;
}

function unmatchedTokens(normalised: string, resolved: string[]): string[] {
  const covered = new Set<string>();
  for (const term of resolved) {
    for (const word of term.toLowerCase().split(/\s+/)) {
      if (word.length > 2) covered.add(word);
    }
  }
  const known = new Set<string>();
  const allTables: { terms: string[] }[][] = [
    PRODUCT_KINDS, STACK_TERMS, INTEGRATION_TERMS, LANGUAGE_TERMS, DEPLOYMENT_TERMS,
  ];
  for (const table of allTables) {
    for (const entry of table) {
      for (const term of entry.terms) {
        for (const word of term.split(/\s+/)) known.add(word);
      }
    }
  }

  const out: string[] = [];
  for (const raw of normalised.trim().split(' ')) {
    const token = raw.trim();
    if (token.length < 4) continue;
    if (STOP_WORDS.has(token) || known.has(token) || covered.has(token)) continue;
    if (!out.includes(token)) out.push(token);
  }
  return out.slice(0, 8);
}

/**
 * Read a sentence as a project specification.
 *
 * The KNOuX registry pass is delegated to the existing `evaluateComposer`, so
 * the Build OS and the Build Orb always agree about what a phrase means.
 */
export function compileBuildIntent(rawInput: string): BuildIntent {
  const input = rawInput.trim();
  const normalised = normalise(input);

  // Registry resolution is the authoritative part and is not re-implemented.
  const composer = evaluateComposer(input);

  const productKind = firstMatch<ProductKind, { kind: ProductKind; terms: string[] }>(
    normalised, PRODUCT_KINDS, (entry) => entry.kind,
  ) ?? 'unknown';
  const requestedStack = collect(normalised, STACK_TERMS);
  const requestedIntegrations = collect(normalised, INTEGRATION_TERMS);
  const languagePreferences = collect(normalised, LANGUAGE_TERMS);
  const deploymentTarget =
    firstMatch<DeploymentTarget, { target: DeploymentTarget; terms: string[] }>(
      normalised, DEPLOYMENT_TERMS, (entry) => entry.target,
    ) ?? 'unknown';

  const resolvedEntities: DiscoverableEntity[] = composer.entityIds
    .map((id) => entityById.get(id))
    .filter((entity): entity is DiscoverableEntity => Boolean(entity));

  const matchedPhrases = composer.matches.map((match) => match.phrase);
  const resolvedTokens = [
    ...requestedStack,
    ...requestedIntegrations,
    ...languagePreferences,
    ...matchedPhrases,
    productKind,
  ];

  const confidence: IntentConfidence =
    composer.entityIds.length === 0 && productKind === 'unknown' && requestedStack.length === 0
      ? 'empty'
      : resolvedEntities.length > 0 || productKind !== 'unknown'
        ? 'resolved'
        : 'partial';

  return {
    rawInput: input,
    productKind,
    requestedCapabilities: composer.capabilityIds,
    requestedStack,
    requestedIntegrations,
    languagePreferences,
    deploymentTarget,
    resolvedEntityIds: resolvedEntities.map((entity) => entity.id),
    unresolvedTerms: unmatchedTokens(normalised, resolvedTokens),
    confidence,
    matchedPhrases,
  };
}

/** A compact, human-readable summary used by the workspace header. */
export function summariseIntent(intent: BuildIntent): string {
  if (intent.confidence === 'empty') return 'NO SPECIFICATION READ';
  const parts: string[] = [];
  if (intent.productKind !== 'unknown') parts.push(intent.productKind.replace(/-/g, ' ').toUpperCase());
  if (intent.requestedStack.length) parts.push(intent.requestedStack.join(' + '));
  if (intent.languagePreferences.length) parts.push(intent.languagePreferences.join('/'));
  if (intent.deploymentTarget !== 'unknown') parts.push(intent.deploymentTarget.toUpperCase());
  return parts.length ? parts.join(' / ') : 'PARTIAL SPECIFICATION';
}
