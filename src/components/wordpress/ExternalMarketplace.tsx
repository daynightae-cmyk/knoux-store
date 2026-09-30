import Link from 'next/link';
import { ExternalItemCard } from './ExternalItemCard';
import { officialDateValue } from '@/lib/wordpress/external';
import type { ExternalItem, ExternalQueryResult } from '@/lib/wordpress/external';

/**
 * External marketplace surface.
 *
 * The WordPress.org directory endpoints return a large catalogue, so this
 * surface never asks for all of it. Every view is one bounded page reached
 * through shareable query parameters, and every state is stated in the DOM:
 * a result count, an empty result, or an upstream that could not be reached.
 *
 * The search form is a plain GET form. It therefore works without scripting,
 * it keeps browser Back and Forward meaningful, and the current view can be
 * copied out of the address bar and shared.
 *
 * The official endpoints ignore the sort parameter, so the ordering control
 * sorts the page that has been fetched and says so. It never claims to have
 * reordered the wider directory.
 */

export type MarketplaceSort = 'directory' | 'rating' | 'installs' | 'updated';

export type MarketplaceQuery = {
  search: string;
  page: number;
  perPage: number;
  sort: MarketplaceSort;
};

export const PER_PAGE_CHOICES = [12, 24] as const;

const SORT_LABEL: Record<MarketplaceSort, string> = {
  directory: 'Directory order',
  rating: 'Highest rated on this page',
  installs: 'Most installed on this page',
  updated: 'Recently updated on this page',
};

function sortItems(items: ExternalItem[], sort: MarketplaceSort): ExternalItem[] {
  const copy = [...items];
  if (sort === 'rating') {
    copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (sort === 'installs') {
    copy.sort((a, b) => (b.activeInstalls ?? b.downloaded ?? 0) - (a.activeInstalls ?? a.downloaded ?? 0));
  } else if (sort === 'updated') {
    copy.sort((a, b) => (officialDateValue(b.lastUpdated) ?? 0) - (officialDateValue(a.lastUpdated) ?? 0));
  }
  return copy;
}

export function readMarketplaceQuery(params: Record<string, string | string[] | undefined>): MarketplaceQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const rawPage = Number.parseInt(first(params.page) ?? '', 10);
  const rawPerPage = Number.parseInt(first(params.per_page) ?? '', 10);
  const rawSort = first(params.sort);

  const perPage = (PER_PAGE_CHOICES as readonly number[]).includes(rawPerPage) ? rawPerPage : 12;
  const sort: MarketplaceSort =
    rawSort === 'rating' || rawSort === 'installs' || rawSort === 'updated' ? rawSort : 'directory';

  return {
    search: (first(params.q) ?? '').slice(0, 120),
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 500) : 1,
    perPage,
    sort,
  };
}

function pageHref(basePath: string, query: MarketplaceQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.search) params.set('q', query.search);
  if (page > 1) params.set('page', String(page));
  if (query.perPage !== 12) params.set('per_page', String(query.perPage));
  if (query.sort !== 'directory') params.set('sort', query.sort);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function UnavailableState({ result, basePath, query }: { result: ExternalQueryResult; basePath: string; query: MarketplaceQuery }) {
  return (
    <div className="mp-state" role="status">
      <span className="label label--signal">UPSTREAM UNAVAILABLE</span>
      <h3 className="mp-state__title">The WordPress.org directory could not be read.</h3>
      <p className="mp-state__body">{result.note}</p>
      <p className="mp-state__body">
        This section is served live from an official WordPress.org API. When that API is unreachable the KNOuX
        side of this page stays accurate: it still publishes only KNOuX-owned releases, of which there are currently
        none. Nothing has been cached locally in place of a live result.
      </p>
      <div className="mp-state__actions">
        <Link className="action" href={pageHref(basePath, query, query.page)}>
          Try again
        </Link>
        <Link className="action action--ghost" href="/wordpress">
          Back to the WordPress division
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ result, query }: { result: ExternalQueryResult; query: MarketplaceQuery }) {
  return (
    <div className="mp-state" role="status">
      <span className="label label--signal">NO RESULTS</span>
      <h3 className="mp-state__title">Nothing matched this search.</h3>
      <p className="mp-state__body">{result.note}</p>
      {query.search ? (
        <p className="mp-state__body">
          <Link className="mp-state__reset" href={pageHref('/wordpress/plugins', { ...query, search: '' }, 1)}>
            Clear the search and show the directory instead
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function Pagination({
  basePath,
  query,
  result,
}: {
  basePath: string;
  query: MarketplaceQuery;
  result: ExternalQueryResult;
}) {
  if (result.totalPages <= 1) return null;
  const current = query.page;
  const last = result.totalPages;
  const windowStart = Math.max(1, current - 2);
  const windowEnd = Math.min(last, windowStart + 4);
  const pages: number[] = [];
  for (let page = windowStart; page <= windowEnd; page += 1) pages.push(page);

  return (
    <nav className="mp-pagination" aria-label="Marketplace pages">
      {current > 1 ? (
        <Link className="mp-pagination__step" href={pageHref(basePath, query, current - 1)} rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className="mp-pagination__step is-disabled">← Previous</span>
      )}

      <ol className="mp-pagination__pages">
        {windowStart > 1 ? (
          <li>
            <Link href={pageHref(basePath, query, 1)}>1</Link>
          </li>
        ) : null}
        {windowStart > 1 ? <li aria-hidden="true">…</li> : null}
        {pages.map((page) => (
          <li key={page}>
            {page === current ? (
              <span className="is-current" aria-current="page">
                {page}
              </span>
            ) : (
              <Link href={pageHref(basePath, query, page)}>{page}</Link>
            )}
          </li>
        ))}
        {windowEnd < last ? <li aria-hidden="true">…</li> : null}
        {windowEnd < last ? (
          <li>
            <Link href={pageHref(basePath, query, last)}>{last}</Link>
          </li>
        ) : null}
      </ol>

      {current < last ? (
        <Link className="mp-pagination__step" href={pageHref(basePath, query, current + 1)} rel="next">
          Next →
        </Link>
      ) : (
        <span className="mp-pagination__step is-disabled">Next →</span>
      )}
    </nav>
  );
}

export function ExternalMarketplace({
  basePath,
  query,
  result,
  kindLabel,
  kindNoun,
  kindRoute,
  firstPartyCount,
}: {
  basePath: string;
  query: MarketplaceQuery;
  result: ExternalQueryResult;
  /** Plural display label, e.g. "Plugins". */
  kindLabel: string;
  /** Singular noun for counted sentences, e.g. "plugin". */
  kindNoun: string;
  kindRoute: string;
  /** Honest first-party count. The two layers are always reported together. */
  firstPartyCount: number;
}) {
  const items = sortItems(result.items, query.sort);
  const isUnavailable = result.state === 'unavailable';
  // A DOM id derived from the route, without slashes or brackets.
  const fieldId = `mp-search-${basePath.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`;

  return (
    <section className="mp" aria-label={`${kindLabel} from the WordPress.org directory`}>
      <div className="mp__split">
        <div>
          <span className="label label--signal">WORDPRESS.ORG DISCOVERY</span>
          <h2 className="mp__title">Explore the {kindLabel.toLowerCase()} directory.</h2>
        </div>
        <p className="mp__summary">
          Live results read from the official WordPress.org API. These items are published by their own authors.
          KNOuX has released {firstPartyCount} {kindNoun}
          {firstPartyCount === 1 ? '' : 's'} of its own, and the two layers are never mixed.
        </p>
      </div>

      <form className="mp-controls" method="get" action={basePath} role="search">
        <div className="command-bar">
          <span className="command-bar__icon" aria-hidden="true">
            ⌕
          </span>
          <label className="mp-controls__label" htmlFor={fieldId}>
            Search the WordPress.org {kindLabel.toLowerCase()} directory
          </label>
          <input
            id={fieldId}
            type="search"
            name="q"
            defaultValue={query.search}
            placeholder={`Search ${kindLabel.toLowerCase()} by name, keyword or author`}
            autoComplete="off"
            maxLength={120}
          />
          <button className="action action--primary mp-controls__submit" type="submit">
            Search
          </button>
        </div>

        <div className="finder-controls">
          {/*
            These are links, not toggles. `aria-pressed` belongs to `role="button"`,
            and a link that navigates has no pressed state to report, so announcing
            one both fails `aria-allowed-attr` and tells a screen reader the wrong
            thing about navigation. The current choice in a set of links is
            `aria-current`, which is what the surrounding link grammar uses.
          */}
          <div className="finder-chips" role="group" aria-label="Result ordering">
            <span className="finder-chips__label">Sort</span>
            {(Object.keys(SORT_LABEL) as MarketplaceSort[]).map((option) => (
              <Link
                key={option}
                className={`tag tag--button ${query.sort === option ? 'is-active' : ''}`}
                href={pageHref(basePath, { ...query, sort: option }, 1)}
                aria-current={query.sort === option ? 'true' : undefined}
              >
                {SORT_LABEL[option]}
              </Link>
            ))}
          </div>
          <div className="finder-chips" role="group" aria-label="Results per page">
            <span className="finder-chips__label">Per page</span>
            {PER_PAGE_CHOICES.map((choice) => (
              <Link
                key={choice}
                className={`tag tag--button ${query.perPage === choice ? 'is-active' : ''}`}
                href={pageHref(basePath, { ...query, perPage: choice }, 1)}
                aria-current={query.perPage === choice ? 'true' : undefined}
              >
                {choice}
              </Link>
            ))}
          </div>
        </div>
      </form>

      <div className="mp__status meta-row" role="status" aria-live="polite">
        {isUnavailable ? (
          <span>Live directory unavailable</span>
        ) : (
          <>
            <span>
              {result.totalKnown
                ? `Showing ${items.length} of ${result.totalItems.toLocaleString('en-US')} ${kindLabel.toLowerCase()}`
                : `Showing ${items.length} ${kindNoun}${items.length === 1 ? '' : 's'}`}
            </span>
            <span>
              Page {result.page}
              {result.totalPages > 1
                ? ` of ${result.totalKnown ? result.totalPages.toLocaleString('en-US') : 'more'}`
                : ''}
            </span>
          </>
        )}
        {/*
          The attribution is unconditional, and that is a correctness property
          rather than a formatting one. This section *is* the WordPress.org
          discovery layer whatever the upstream is doing, so a visitor must be
          told where the layer comes from even when it is empty. Rendering it
          only on success also made a static copy assertion depend on a live
          third-party API, which is how an upstream outage turned into a failing
          test rather than into a passing test about an honest unavailable
          state.
        */}
        <span>Source: WordPress.org</span>
      </div>

      {isUnavailable ? (
        <UnavailableState result={result} basePath={basePath} query={query} />
      ) : result.state === 'empty' ? (
        <EmptyState result={result} query={query} />
      ) : (
        <>
          <ul className="mp-grid">
            {items.map((item, index) => (
              <li key={`${item.kind}-${item.slug}`}>
                <ExternalItemCard item={item} index={index} />
              </li>
            ))}
          </ul>
          <Pagination basePath={basePath} query={query} result={result} />
        </>
      )}

      <div className="mp__footnote">
        <p>
          Every item above is third-party work published on WordPress.org. KNOuX performs WordPress engineering —
          installation, configuration, migration, performance, security and maintenance — and can scope that work
          around a plugin or theme you have chosen. See the{' '}
          <Link href="/wordpress#operate">operating services</Link> or the{' '}
          <Link href={kindRoute}>KNOuX {kindLabel.toLowerCase()} registry</Link>.
        </p>
      </div>
    </section>
  );
}
