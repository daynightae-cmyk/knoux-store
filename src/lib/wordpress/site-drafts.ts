const STYLES = ['minimal', 'modern', 'premium'] as const;
const ALIGNMENTS = ['start', 'center', 'end'] as const;
const FONTS = ['sans', 'serif', 'mono'] as const;
const BLOCK_TYPES = ['hero', 'features', 'gallery', 'text', 'testimonials', 'cta', 'contact'] as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

export type WordPressDraftIdentity = {
  name: string;
  tagline: string;
  style: typeof STYLES[number];
  placement: typeof ALIGNMENTS[number];
  headingFont: typeof FONTS[number];
  bodyFont: typeof FONTS[number];
  primary: string;
  secondary: string;
  backdrop: string;
  pages: string[];
  modules: string[];
  activePage: string;
};

export type WordPressDraftBlock = {
  key: number;
  type: typeof BLOCK_TYPES[number];
  align: typeof ALIGNMENTS[number];
  gap: number;
};

export type WordPressDraftDocument = {
  schema: 1;
  identity: WordPressDraftIdentity | null;
  blocks: WordPressDraftBlock[];
  themeSlug: string | null;
  pluginSlugs: string[];
};

export type WordPressDraftSummary = {
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
};

export type WordPressDraft = WordPressDraftSummary & { document: WordPressDraftDocument };
export type WordPressDraftCreate = { id: string; title: string; document: WordPressDraftDocument };
export type WordPressDraftSave = WordPressDraftCreate & { expectedRevision: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
    && [...value].every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
}

function isChoice<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.some((entry) => entry === value);
}

function isTextList(value: unknown, max: number, limit: number): value is string[] {
  return Array.isArray(value) && value.length <= max && new Set(value).size === value.length
    && value.every((item) => isText(item, limit) && item.trim().length > 0);
}

function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value < 2_147_483_647;
}

export function isWordPressDraftId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIdentity(value: unknown): value is WordPressDraftIdentity {
  if (!isRecord(value) || Object.keys(value).length !== 12) return false;
  const { name, tagline, style, placement, headingFont, bodyFont, primary, secondary, backdrop, pages, modules, activePage } = value;
  return isText(name, 40) && isText(tagline, 60)
    && isChoice(style, STYLES) && isChoice(placement, ALIGNMENTS)
    && isChoice(headingFont, FONTS) && isChoice(bodyFont, FONTS)
    && [primary, secondary, backdrop].every((color) => typeof color === 'string' && HEX_COLOR.test(color))
    && isTextList(pages, 30, 80) && isTextList(modules, 30, 80)
    && typeof activePage === 'string' && pages.includes(activePage);
}

function isBlock(value: unknown): value is WordPressDraftBlock {
  return isRecord(value) && Object.keys(value).length === 4
    && isRevision(value.key) && isChoice(value.type, BLOCK_TYPES) && isChoice(value.align, ALIGNMENTS)
    && typeof value.gap === 'number' && Number.isInteger(value.gap) && value.gap >= 4 && value.gap <= 48;
}

export function isWordPressDraftDocument(value: unknown): value is WordPressDraftDocument {
  if (!isRecord(value) || Object.keys(value).length !== 5) return false;
  const { schema, identity, blocks, themeSlug, pluginSlugs } = value;
  return schema === 1 && (identity === null || isIdentity(identity))
    && Array.isArray(blocks) && blocks.length <= 100 && blocks.every(isBlock)
    && new Set(blocks.map(({ key }) => key)).size === blocks.length
    && (themeSlug === null || (typeof themeSlug === 'string' && SLUG.test(themeSlug)))
    && isTextList(pluginSlugs, 50, 80) && pluginSlugs.every((slug) => SLUG.test(slug));
}

export function parseWordPressDraftCreate(value: unknown): WordPressDraftCreate | null {
  if (!isRecord(value) || Object.keys(value).length !== 3) return null;
  const { id, title, document } = value;
  if (!isWordPressDraftId(id) || !isText(title, 80) || !title.trim() || !isWordPressDraftDocument(document)) return null;
  return { id: id.toLowerCase(), title: title.trim(), document };
}

export function parseWordPressDraftSave(value: unknown): WordPressDraftSave | null {
  if (!isRecord(value)) return null;
  const { expectedRevision, ...create } = value;
  if (!isRevision(expectedRevision)) return null;
  const draft = parseWordPressDraftCreate(create);
  return draft ? { ...draft, expectedRevision } : null;
}
