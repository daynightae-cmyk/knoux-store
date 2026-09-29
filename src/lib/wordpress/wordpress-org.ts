/**
 * Official WordPress.org adapters.
 *
 * These are the only outbound data sources for the external marketplace
 * surface. Each one uses a documented WordPress.org endpoint and nothing else:
 * no scraping of arbitrary sites, no commercial vendor feeds, no invented
 * endpoints.
 *
 * Behaviour required of every adapter:
 *   - server-side only
 *   - bounded page size, so the whole catalogue is never requested
 *   - explicit timeout
 *   - revalidation window, so the page is cached rather than refetched per view
 *   - field-level validation, so a malformed upstream record is dropped
 *     instead of being rendered as a half-filled card
 *   - a graceful `unavailable` result, so an upstream outage degrades one
 *     section instead of failing the page
 */

import {
  decodeEntities,
  toExcerpt,
  toOfficialAssetUrl,
  toRenderableAssetUrl,
  toPlainText,
  type ExternalItem,
  type ExternalItemKind,
  type ExternalQueryResult,
} from './external';

export const PLUGIN_ENDPOINT = 'https://api.wordpress.org/plugins/info/1.2/';
export const THEME_ENDPOINT = 'https://api.wordpress.org/themes/info/1.2/';
export const PATTERN_ENDPOINT = 'https://api.wordpress.org/patterns/1.0/';
/** The documented Block Directory search contract. No alternative is invented. */
export const BLOCK_DIRECTORY_ENDPOINT =
  'https://block-directory.wordpress.org/wp-json/wp-block-directory/v1/block';

const REQUEST_TIMEOUT_MS = 8000;
const REVALIDATE_SECONDS = 900;
const MAX_PER_PAGE = 24;

type Json = Record<string, unknown>;

function clampPage(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(200, Math.floor(value)));
}

function clampPerPage(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 12;
  return Math.max(1, Math.min(MAX_PER_PAGE, Math.floor(value)));
}

function cleanSearch(value: string | undefined): string {
  return (value ?? '').trim().slice(0, 120);
}

/** Fetches JSON with a timeout, a cache window and total failure containment. */
async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('json')) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function unavailable(kind: string, note: string): ExternalQueryResult {
  return { items: [], page: 1, perPage: 0, totalItems: 0, totalKnown: false, totalPages: 0, state: 'unavailable', note };
}

function toNumber(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toText(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const text = toPlainText(input);
  return text.length ? text : undefined;
}

/** The APIs return tags as an object map of slug to label. */
function toTags(input: unknown): string[] {
  if (!input || typeof input !== 'object') return [];
  return Object.values(input as Json)
    .map((value) => toText(value))
    .filter((value): value is string => Boolean(value))
    .slice(0, 12);
}

/* ------------------------------------------------------------------ plugins */

const PLUGIN_FIELDS = [
  'icons',
  'banners',
  'short_description',
  'rating',
  'num_ratings',
  'active_installs',
  'downloaded',
  'last_updated',
  'requires',
  'requires_php',
  'tested',
  'download_link',
  'homepage',
  'tags',
] as const;

function pluginUrl(options: { search: string; page: number; perPage: number }): string {
  const params = new URLSearchParams({ action: 'query_plugins' });
  params.set('request[page]', String(options.page));
  params.set('request[per_page]', String(options.perPage));
  for (const field of PLUGIN_FIELDS) params.set(`request[fields][${field}]`, '1');
  const search = cleanSearch(options.search);
  if (search) params.set('request[search]', search);
  return `${PLUGIN_ENDPOINT}?${params.toString()}`;
}

function normalisePlugin(raw: unknown): ExternalItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Json;
  const slug = typeof record.slug === 'string' ? record.slug : '';
  if (!slug) return null;
  const name = toText(record.name);
  if (!name) return null;

  const icons = (record.icons ?? {}) as Json;
  const banners = (record.banners ?? {}) as Json;
  const rating = toNumber(record.rating);

  return {
    source: 'wordpress.org',
    kind: 'plugin',
    slug,
    name: decodeEntities(name),
    author: toText(record.author) ?? 'Author not stated',
    shortDescription: toText(record.short_description) ?? 'No description published.',
    // Raster-only, and the 1x entry is preferred over a 2x SVG: the proxy
    // refuses SVG, so an SVG here is an image that can never load. See
    // `toRenderableAssetUrl`.
    iconUrl: toRenderableAssetUrl(icons['1x']) ?? toRenderableAssetUrl(icons['2x']),
    bannerUrl: toOfficialAssetUrl(banners.high) ?? toOfficialAssetUrl(banners.low),
    rating: typeof rating === 'number' && rating > 0 ? rating : undefined,
    ratingCount: toNumber(record.num_ratings),
    activeInstalls: toNumber(record.active_installs),
    downloaded: toNumber(record.downloaded),
    version: toText(record.version),
    requiresWp: toText(record.requires),
    testedWp: toText(record.tested),
    requiresPhp: toText(record.requires_php),
    lastUpdated: toText(record.last_updated),
    tags: toTags(record.tags),
    homepageUrl: toOfficialAssetUrl(record.homepage),
    downloadUrl: toOfficialAssetUrl(record.download_link),
    sourceUrl: `https://wordpress.org/plugins/${encodeURIComponent(slug)}/`,
  };
}

export async function queryPlugins(options: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<ExternalQueryResult> {
  const page = clampPage(options.page);
  const perPage = clampPerPage(options.perPage);
  const search = cleanSearch(options.search);
  const payload = await fetchJson(pluginUrl({ search, page, perPage }));
  if (payload === null) {
    return unavailable('plugin', 'The WordPress.org plugin directory could not be reached.');
  }
  if (!payload || typeof payload !== 'object') {
    return unavailable('plugin', 'The WordPress.org plugin directory returned an unexpected payload.');
  }
  const root = payload as Json;
  const info = (root.info ?? {}) as Json;
  const list = Array.isArray(root.plugins) ? root.plugins : [];
  const items = list
    .map(normalisePlugin)
    .filter((item): item is ExternalItem => item !== null);
  const reported = toNumber(info.results);
  const totalItems = reported ?? items.length;
  const totalKnown = reported !== undefined;
  const totalPages = toNumber(info.pages) ?? 0;

  return {
    items,
    page,
    perPage,
    totalItems,
    totalKnown,
    totalPages,
    state: items.length === 0 ? 'empty' : 'ok',
    note:
      items.length === 0
        ? search
          ? `No plugin in the WordPress.org directory matched “${search}”.`
          : 'The WordPress.org plugin directory returned no items.'
        : undefined,
  };
}

/* ------------------------------------------------------------------- themes */

const THEME_FIELDS = [
  'screenshot_url',
  'rating',
  'downloaded',
  'last_updated',
  'homepage',
  'tags',
  'requires_php',
  'version',
  'author',
] as const;

function themeUrl(options: { search: string; page: number; perPage: number }): string {
  const params = new URLSearchParams({ action: 'query_themes' });
  params.set('request[page]', String(options.page));
  params.set('request[per_page]', String(options.perPage));
  for (const field of THEME_FIELDS) params.set(`request[fields][${field}]`, '1');
  const search = cleanSearch(options.search);
  if (search) params.set('request[search]', search);
  return `${THEME_ENDPOINT}?${params.toString()}`;
}

function normaliseTheme(raw: unknown): ExternalItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Json;
  const slug = typeof record.slug === 'string' ? record.slug : '';
  if (!slug) return null;
  const name = toText(record.name);
  if (!name) return null;

  const author = record.author;
  const authorName =
    author && typeof author === 'object'
      ? toText((author as Json).display_name) ?? toText((author as Json).author)
      : toText(author);
  const rating = toNumber(record.rating);

  return {
    source: 'wordpress.org',
    kind: 'theme',
    slug,
    name: decodeEntities(name),
    author: authorName ?? 'Author not stated',
    // Themes publish one long description and no short field, so it is
    // abbreviated rather than filling the card with the vendor's full blurb.
    shortDescription: toExcerpt(record.description) ?? 'No description published.',
    screenshotUrl: toOfficialAssetUrl(record.screenshot_url),
    rating: typeof rating === 'number' && rating > 0 ? rating : undefined,
    ratingCount: toNumber(record.num_ratings),
    downloaded: toNumber(record.downloaded),
    version: toText(record.version),
    requiresPhp: toText(record.requires_php),
    lastUpdated: toText(record.last_updated),
    tags: toTags(record.tags),
    homepageUrl: toOfficialAssetUrl(record.homepage),
    sourceUrl: `https://wordpress.org/themes/${encodeURIComponent(slug)}/`,
  };
}

export async function queryThemes(options: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<ExternalQueryResult> {
  const page = clampPage(options.page);
  const perPage = clampPerPage(options.perPage);
  const search = cleanSearch(options.search);
  const payload = await fetchJson(themeUrl({ search, page, perPage }));
  if (payload === null) {
    return unavailable('theme', 'The WordPress.org theme directory could not be reached.');
  }
  if (!payload || typeof payload !== 'object') {
    return unavailable('theme', 'The WordPress.org theme directory returned an unexpected payload.');
  }
  const root = payload as Json;
  const info = (root.info ?? {}) as Json;
  const list = Array.isArray(root.themes) ? root.themes : [];
  const items = list
    .map(normaliseTheme)
    .filter((item): item is ExternalItem => item !== null);
  const reported = toNumber(info.results);
  const totalItems = reported ?? items.length;
  const totalKnown = reported !== undefined;
  const totalPages = toNumber(info.pages) ?? 0;

  return {
    items,
    page,
    perPage,
    totalItems,
    totalKnown,
    totalPages,
    state: items.length === 0 ? 'empty' : 'ok',
    note:
      items.length === 0
        ? search
          ? `No theme in the WordPress.org directory matched “${search}”.`
          : 'The WordPress.org theme directory returned no items.'
        : undefined,
  };
}

/* ----------------------------------------------------------------- patterns */

function normalisePattern(raw: unknown): ExternalItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Json;
  const title = toText((record.title as Json | undefined)?.rendered);
  if (!title) return null;
  const id = toNumber(record.id);
  const categories = record.categories;
  const categoryName =
    categories && typeof categories === 'object'
      ? Object.values(categories as Json)
          .map((entry) => toText((entry as Json)?.name))
          .find((entry): entry is string => Boolean(entry))
      : undefined;
  const slug = id ? `pattern-${id}` : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);

  return {
    source: 'wordpress.org',
    kind: 'pattern',
    slug,
    name: decodeEntities(title),
    author: categoryName ?? 'WordPress.org pattern directory',
    // The pattern body is third-party block markup. It is deliberately not
    // rendered: it would inject foreign HTML and its own asset hosts into this
    // page. The pattern is described and linked instead.
    shortDescription: `A block pattern published in the WordPress.org pattern directory${categoryName ? ` under ${categoryName}` : ''}. The pattern body is rendered by WordPress on the source page.`,
    tags: [],
    sourceUrl: 'https://wordpress.org/patterns/',
  };
}

export async function queryPatterns(options: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<ExternalQueryResult> {
  const perPage = clampPerPage(options.perPage);
  const page = clampPage(options.page);
  const search = cleanSearch(options.search);
  const params = new URLSearchParams();
  params.set('per_page', String(perPage));
  params.set('page', String(page));
  if (search) params.set('search', search);

  const payload = await fetchJson(`${PATTERN_ENDPOINT}?${params.toString()}`);
  if (payload === null) {
    return unavailable('pattern', 'The WordPress.org pattern directory could not be reached.');
  }
  if (!Array.isArray(payload)) {
    return unavailable('pattern', 'The WordPress.org pattern directory returned an unexpected payload.');
  }
  const items = payload
    .map(normalisePattern)
    .filter((item): item is ExternalItem => item !== null);

  return {
    items,
    page,
    perPage,
    totalItems: items.length,
    totalKnown: false,
    totalPages: items.length < perPage ? page : page + 1,
    state: items.length === 0 ? 'empty' : 'ok',
    note:
      items.length === 0
        ? search
          ? `No pattern in the WordPress.org directory matched “${search}”.`
          : 'The WordPress.org pattern directory returned no items.'
        : undefined,
  };
}

/* ------------------------------------------------------------------- blocks */

/**
 * The Block Directory search contract.
 *
 * The documented endpoint is queried as documented. It currently answers with
 * an HTML document rather than JSON, so the adapter reports that honestly
 * instead of substituting a different endpoint or inventing results.
 */
export async function queryBlocks(options: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<ExternalQueryResult> {
  const search = cleanSearch(options.search);
  const page = clampPage(options.page);
  const perPage = clampPerPage(options.perPage);
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (search) params.set('term', search);

  let response: Response;
  try {
    response = await fetch(`${BLOCK_DIRECTORY_ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch {
    return unavailable('block', 'The WordPress Block Directory could not be reached.');
  }

  if (!response.ok) {
    return unavailable('block', 'The WordPress Block Directory declined the search request.');
  }
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('json')) {
    return unavailable(
      'block',
      'The WordPress Block Directory answered this search with an HTML page instead of a block result set, so no block can be shown. No substitute endpoint is used.',
    );
  }

  const payload = (await response.json()) as unknown;
  const list = Array.isArray(payload) ? payload : [];
  const items = list
    .map((entry): ExternalItem | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Json;
      const name = toText(record.name);
      const slug = toText(record.slug);
      if (!name || !slug) return null;
      const icons = record.icons ?? {};
      const iconRecord = (Array.isArray(icons) ? icons[0] : icons) as Json | undefined;
      const rating = toNumber(record.rating);
      return {
        source: 'wordpress.org',
        kind: 'block',
        slug,
        name,
        author: toText(record.author_name) ?? 'Author not stated',
        shortDescription: toText(record.short_description) ?? 'No description published.',
        iconUrl: toRenderableAssetUrl(iconRecord?.src),
        rating: typeof rating === 'number' && rating > 0 ? Math.round(rating * 20) : undefined,
        ratingCount: toNumber(record.rating_count),
        activeInstalls: toNumber(record.active_installs),
        lastUpdated: record.last_updated instanceof Date
          ? record.last_updated.toISOString()
          : toText(record.last_updated),
        tags: [],
        sourceUrl: toText(record.wp_version) ? `https://wordpress.org/plugins/${encodeURIComponent(slug)}/` : 'https://wordpress.org/plugins/',
      } satisfies ExternalItem;
    })
    .filter((item): item is ExternalItem => item !== null);

  return {
    items,
    page,
    perPage,
    totalItems: items.length,
    totalKnown: false,
    totalPages: items.length < perPage ? page : page + 1,
    state: items.length === 0 ? 'empty' : 'ok',
  };
}

/* ------------------------------------------------------------------ helpers */

export type ExternalKind = ExternalItemKind;

/** Bounded featured sets for the ecosystem overview. Never the whole catalogue. */
export async function featuredPlugins(perPage = 6) {
  return queryPlugins({ page: 1, perPage: clampPerPage(perPage) });
}

export async function featuredThemes(perPage = 6) {
  return queryThemes({ page: 1, perPage: clampPerPage(perPage) });
}
