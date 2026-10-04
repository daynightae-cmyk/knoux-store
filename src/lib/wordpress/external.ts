/**
 * External WordPress marketplace item model.
 *
 * A provider-neutral shape for items that do NOT belong to KNOuX. This is
 * deliberately a different model from `WordPressItem` in `src/data/wordpress.ts`:
 * the first-party registry stays empty until a KNOuX release exists, and
 * nothing in this file may ever be written into it.
 *
 * Every field is optional except identity and provenance. Absence means the
 * official source did not return the field, and the UI must hide it rather
 * than substitute a plausible value.
 */

export type ExternalSource = 'wordpress.org';

export type ExternalItemKind = 'plugin' | 'theme' | 'block' | 'pattern';

export type ExternalItem = {
  /** Provenance. Every rendered external item is labelled with this. */
  source: ExternalSource;
  kind: ExternalItemKind;
  slug: string;
  name: string;
  author: string;
  shortDescription: string;
  /** Official asset URL as returned by the source. Never recoloured, never replaced. */
  iconUrl?: string;
  screenshotUrl?: string;
  bannerUrl?: string;
  /** Official 0-100 rating, verbatim. */
  rating?: number;
  ratingCount?: number;
  activeInstalls?: number;
  downloaded?: number;
  version?: string;
  requiresWp?: string;
  testedWp?: string;
  requiresPhp?: string;
  /** ISO-ish date string as published by the source. */
  lastUpdated?: string;
  tags: string[];
  homepageUrl?: string;
  downloadUrl?: string;
  /** Canonical page on the official source. Always present. */
  sourceUrl: string;
};

/**
 * Outcome of a query against an official source.
 *
 * `unavailable` is a first-class state, not an error to be hidden: the page
 * must still render and must say the upstream source could not be reached.
 */
export type ExternalQueryState = 'ok' | 'empty' | 'unavailable';

export type ExternalQueryResult = {
  items: ExternalItem[];
  page: number;
  perPage: number;
  /**
   * Total matching items upstream. The directory endpoints return this; some
   * sources do not, in which case `totalKnown` is false and the UI must not
   * invent a total.
   */
  totalItems: number;
  totalKnown: boolean;
  totalPages: number;
  state: ExternalQueryState;
  /** Short, honest explanation shown when `state` is not `ok`. */
  note?: string;
};

/** Official asset hosts permitted through the image proxy. Nothing else is fetched. */
export const OFFICIAL_ASSET_HOSTS: readonly string[] = [
  'ps.w.org',
  'ts.w.org',
  's.w.org',
  'downloads.wordpress.org',
  'images.wordpress.org',
  'wordpress.org',
];

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  trade: '™',
  reg: '®',
  copy: '©',
};

/** Decodes the named and numeric entities the official APIs actually return. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 9 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    const named = ENTITY_MAP[body.toLowerCase()];
    return named ?? match;
  });
}

/**
 * Removes markup from a source field.
 *
 * The official plugin API returns `author` and `short_description` as HTML
 * fragments. They are rendered as plain text so that no third-party markup,
 * script or style can reach the page.
 */
export function toPlainText(input: unknown): string {
  if (typeof input !== 'string') return '';
  const withoutTags = input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/**
 * Normalises a source URL.
 *
 * The theme API returns protocol-relative screenshot URLs, so they are
 * resolved against the official https origin rather than left relative.
 * Anything that is not an official asset host is dropped by returning undefined.
 */
export function toOfficialAssetUrl(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const withProtocol = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'https:') return undefined;
  if (parsed.username || parsed.password) return undefined;
  if (!isOfficialAssetHost(parsed.hostname)) return undefined;
  return parsed.toString();
}

/** True when the host is an official WordPress asset host we are allowed to load from. */
export function isOfficialAssetHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return OFFICIAL_ASSET_HOSTS.includes(host);
}

/**
 * An official asset URL that this origin is actually able to render.
 *
 * `toOfficialAssetUrl` answers "is this an official host over https", which is
 * necessary and not sufficient. The image proxy serves raster types only, and
 * refuses SVG with a 415 on purpose: an SVG delivered from this origin runs
 * script on this origin, and host allowlisting does not change that.
 *
 * The WordPress.org plugin API publishes `icons['2x']` as an SVG for a
 * substantial share of the directory, and preferring the 2x entry therefore
 * selected an asset that could never load. Measured on /wordpress/plugins:
 * every plugin whose chosen icon ended in `.svg` rendered a broken image at
 * 106px beside 54px neighbours, and every one ending in `.png` rendered
 * correctly — the same list, split exactly along the file extension.
 *
 * So an icon is only carried when it is a raster the proxy will accept. This
 * is a property of our own serving decision, not a claim about WordPress.org.
 */
const RASTER_ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];

export function toRenderableAssetUrl(input: unknown): string | undefined {
  const url = toOfficialAssetUrl(input);
  if (!url) return undefined;
  const path = new URL(url).pathname.toLowerCase();
  return RASTER_ASSET_EXTENSIONS.some((extension) => path.endsWith(extension)) ? url : undefined;
}

/**
 * Shortens a source field to a scannable length.
 *
 * Only used where a source publishes one long description and no short one,
 * which is the case for themes. The publisher's own wording is kept and only
 * cut at a word boundary; nothing is rewritten.
 */
export function toExcerpt(input: unknown, maxLength = 220): string {
  const text = toPlainText(input);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  const body = lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${body.replace(/[\s,;:.\-–—]+$/, '')}…`;
}

export function externalSourceLabel(): string {
  return 'WordPress.org';
}

/** Formats an install/download count the way the official directory does. */
export function formatCount(value: number | undefined): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10} million`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10} thousand`;
  return String(value);
}

/** Formats an official date string for display without inventing a timezone. */
export function formatOfficialDate(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return input;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = months[monthIndex] ?? month;
  return `${day} ${label} ${year}`;
}

/** Parses an official date into a comparable epoch value, or undefined. */
export function officialDateValue(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const value = Date.parse(input);
  return Number.isFinite(value) ? value : undefined;
}
