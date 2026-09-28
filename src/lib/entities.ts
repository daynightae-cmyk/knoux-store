/**
 * KNOuX shared discoverable entity model.
 *
 * Every public division publishes its catalogue through this one shape, so
 * global search, the Composer, cross-navigation and related-item resolution
 * are all driven by the same data instead of duplicated per component.
 *
 * Rule that governs this file: a field is optional because it is often
 * unknown. Absence is a legitimate value. Nothing here may be filled in to
 * make a catalogue look more complete than its evidence allows.
 */

export type DivisionId =
  | 'software'
  | 'wordpress'
  | 'web'
  | 'growth'
  | 'creative'
  | 'solutions'
  | 'labs'
  | 'institution';

export type EntityKind =
  | 'product'
  | 'theme'
  | 'plugin'
  | 'block'
  | 'starter-site'
  | 'bundle'
  | 'web-system'
  | 'growth-channel'
  | 'creative-capability'
  | 'solution'
  | 'experiment'
  | 'route';

/**
 * Publication state. `service` marks something KNOuX actively performs for a
 * client; the rest describe software or documents that exist in a repository.
 */
export type EntityStatus =
  | 'canonical'
  | 'active'
  | 'release-candidate'
  | 'in-development'
  | 'research'
  | 'service'
  | 'planned';

export type DiscoverableEntity = {
  /** Stable identifier, `division.kind.slug`. Never localised. */
  id: string;
  kind: EntityKind;
  division: DivisionId;
  /** Short display code such as `SW-01` or `WP-TH`. */
  code: string;
  slug: string;
  name: string;
  /** Compact label for rails, chips and command rows. */
  shortName: string;
  summary: string;
  status: EntityStatus;
  /** Canonical public route. `null` when the item is not yet routable. */
  route: string | null;
  categories: string[];
  /** Human search terms: intent phrases, synonyms, colloquialisms. */
  searchTerms: string[];
  /** Capability identifiers resolved from `data/capabilities.ts`. */
  capabilities: string[];
  /** Entity ids this item is genuinely related to. */
  relatedIds: string[];
};

/** Divisions are the institution's wings. Order is navigation order. */
export const divisions: ReadonlyArray<{
  id: DivisionId;
  label: string;
  index: string;
  route: string;
  statement: string;
}> = [
  {
    id: 'software',
    label: 'Software',
    index: '01',
    route: '/products',
    statement: 'Desktop systems KNOuX builds and maintains under one engineering practice.',
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    index: '02',
    route: '/wordpress',
    statement: 'A structured catalogue for the open web, built to be populated from real releases.',
  },
  {
    id: 'web',
    label: 'Web',
    index: '03',
    route: '/web',
    statement: 'Web engineering organised by system type rather than by page layout.',
  },
  {
    id: 'growth',
    label: 'Growth',
    index: '04',
    route: '/growth',
    statement: 'Campaign architecture, tracking and measurement for businesses that need to be found.',
  },
  {
    id: 'creative',
    label: 'Creative',
    index: '05',
    route: '/creative',
    statement: 'Identity, interface and motion systems that hold a product together visually.',
  },
  {
    id: 'solutions',
    label: 'Solutions',
    index: '06',
    route: '/solutions',
    statement: 'Entry points by business need, composed from the divisions above.',
  },
  {
    id: 'labs',
    label: 'Labs',
    index: '07',
    route: '/labs',
    statement: 'Research, experiments and unfinished systems kept deliberately visible.',
  },
  {
    id: 'institution',
    label: 'Institution',
    index: '08',
    route: '/about',
    statement: 'The practice, its principles and how to reach it.',
  },
];

export const divisionById = new Map(divisions.map((division) => [division.id, division]));

export function divisionLabel(id: DivisionId): string {
  return divisionById.get(id)?.label ?? id;
}

export function divisionRoute(id: DivisionId): string {
  return divisionById.get(id)?.route ?? '/';
}

/**
 * Deterministic relevance ranking for the command palette and product finder.
 * Exact name beats name prefix, which beats a search-term hit, which beats a
 * capability or category match. Ties break on code so ordering is stable.
 */
export function scoreEntity(entity: DiscoverableEntity, rawQuery: string): number {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 0;

  const name = entity.name.toLowerCase();
  const shortName = entity.shortName.toLowerCase();
  let score = 0;

  if (name === query) score += 120;
  if (shortName === query) score += 110;
  if (name.startsWith(query)) score += 70;
  if (shortName.startsWith(query)) score += 60;
  if (name.includes(query)) score += 40;
  if (shortName.includes(query)) score += 30;

  for (const term of entity.searchTerms) {
    const candidate = term.toLowerCase();
    if (candidate === query) score += 55;
    else if (candidate.startsWith(query)) score += 32;
    else if (candidate.includes(query)) score += 20;
  }

  for (const category of entity.categories) {
    const candidate = category.toLowerCase();
    if (candidate === query) score += 26;
    else if (candidate.includes(query)) score += 12;
  }

  for (const term of query.split(/\s+/)) {
    if (term.length < 3) continue;
    if (term === 'knoux' && query !== 'knoux') continue;
    if (name.includes(term)) score += 6;
    if (entity.searchTerms.some((search) => search.toLowerCase().includes(term))) score += 4;
  }

  return score;
}

export type EntityMatch = { entity: DiscoverableEntity; score: number };

/** Everything the index needs to be searched, kept out of the render path. */
export function searchEntities(
  entities: readonly DiscoverableEntity[],
  query: string,
  limit = 12,
): EntityMatch[] {
  if (!query.trim()) return [];
  return entities
    .map((entity) => ({ entity, score: scoreEntity(entity, query) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entity.code.localeCompare(b.entity.code))
    .slice(0, limit);
}
