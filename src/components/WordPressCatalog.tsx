import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, SystemIndex, IndexRow, BlockHead } from '@/components/blocks';
import { ExternalMarketplace, readMarketplaceQuery } from '@/components/wordpress/ExternalMarketplace';
import { FirstPartyRail } from '@/components/wordpress/FirstPartyRail';
import {
  starterSiteVerticals,
  wordpressCategories,
  wordPressGoals,
  wordPressItems,
  wordPressServices,
  type WordPressCategory,
  type WordPressItemType,
} from '@/data/wordpress';
import { queryBlocks, queryPlugins, queryThemes } from '@/lib/wordpress/wordpress-org';
import { entityById } from '@/data/composer-rules';

/**
 * The five WordPress catalogue routes.
 *
 * Each one is a real page with real architecture. Two layers are kept
 * deliberately separate:
 *
 *   KNOuX Releases      first-party, from `wordPressItems`, currently zero
 *   WordPress.org       live external discovery from the official APIs
 *
 * The first-party registry is never populated to fill the page, and external
 * items are never written into it or given KNOuX ownership.
 */

type SearchParams = Record<string, string | string[] | undefined>;

/** Which official source backs each category, if any. */
const EXTERNAL_SOURCE: Partial<Record<WordPressCategory, 'plugin' | 'theme' | 'block'>> = {
  plugins: 'plugin',
  themes: 'theme',
  blocks: 'block',
};

/** Singular noun for the first-party rail, so the count reads correctly at zero. */
function singularLabel(type: WordPressItemType): string {
  switch (type) {
    case 'theme':
      return 'theme';
    case 'plugin':
      return 'plugin';
    case 'block':
      return 'block';
    case 'starter-site':
      return 'starter site';
    case 'woocommerce-extension':
      return 'WooCommerce extension';
    case 'integration':
      return 'integration';
    default:
      return 'bundle';
  }
}

export async function WordPressCategoryPage({
  category,
  searchParams,
}: {
  category: WordPressCategory;
  searchParams?: SearchParams;
}) {
  const meta = wordpressCategories.find((entry) => entry.slug === category);
  if (!meta) return null;

  const count = wordPressItems.filter((item) => item.type === meta.type).length;
  const source = EXTERNAL_SOURCE[category];
  const query = readMarketplaceQuery(searchParams ?? {});

  const external = source
    ? source === 'plugin'
      ? await queryPlugins({ search: query.search, page: query.page, perPage: query.perPage })
      : source === 'theme'
        ? await queryThemes({ search: query.search, page: query.page, perPage: query.perPage })
        : await queryBlocks({ search: query.search, page: query.page, perPage: query.perPage })
    : null;

  return (
    <main id="main-content" tabIndex={-1}>
      <PageIntro
        index={meta.index}
        label="WordPress"
        title={meta.label}
        italic="catalogue."
        description={meta.intent}
      />
      <SignalRail division="wordpress" path={`/wordpress/${category}`} />

      <FirstPartyRail type={meta.type} label={singularLabel(meta.type)} />

      {external ? (
        <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
          <ExternalMarketplace
            basePath={`/wordpress/${category}`}
            query={query}
            result={external}
            kindLabel={source === 'plugin' ? 'Plugins' : source === 'theme' ? 'Themes' : 'Blocks'}
            kindNoun={singularLabel(meta.type)}
            kindRoute={`/wordpress/${category}`}
            firstPartyCount={count}
          />
        </section>
      ) : null}

      {category === 'starter-sites' ? <StarterSiteFilters /> : null}
      {category === 'solutions' ? <BundleSurface /> : null}

      {category === 'starter-sites' ? (
        <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
          <FirstPartyOnlyNotice
            title="No official WordPress.org directory exists for starter sites"
            body="WordPress.org publishes plugin, theme, block and pattern directories. It does not publish a starter-site directory with a documented API, so this route stays first-party rather than filling itself from an unofficial source."
          />
        </section>
      ) : null}

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="RELATED"
          title={
            category === 'themes' || category === 'blocks'
              ? 'Prefer a headless frontend?'
              : 'Need the whole site, not one part?'
          }
          body={
            category === 'themes' || category === 'blocks'
              ? 'WordPress can stay the editorial system while delivery moves to an edge-rendered frontend. KNOuX builds and maintains both sides of that split.'
              : 'Every WordPress engagement runs on the same engineering: a documented baseline, a restore path, and a named owner for each change.'
          }
          href={category === 'themes' || category === 'blocks' ? '/web' : '/wordpress#operate'}
          action={category === 'themes' || category === 'blocks' ? 'KNOuX Web' : 'Operating services'}
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Other divisions" name="Web engineering" href="/web" />
        </div>
      </section>
    </main>
  );
}

function FirstPartyOnlyNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mp-state" role="note">
      <span className="label label--signal">FIRST-PARTY ONLY</span>
      <h3 className="mp-state__title">{title}</h3>
      <p className="mp-state__body">{body}</p>
    </div>
  );
}

function StarterSiteFilters() {
  return (
    <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
      <BlockHead
        code="VERTICALS"
        title="Vertical filters, ready"
        aside="The filter set is fixed ahead of the catalogue so that publishing a starter site is a data change. These are the verticals KNOuX intends to publish into."
      />
      <div className="finder-chips" style={{ marginTop: 26 }}>
        {starterSiteVerticals.map((vertical) => (
          <span key={vertical.id} className="tag">
            {vertical.label}
          </span>
        ))}
      </div>
      <p className="meta-row" style={{ marginTop: 24 }}>
        <span>0 of {starterSiteVerticals.length} verticals populated</span>
        <span>Filters render regardless of catalogue size</span>
      </p>
    </section>
  );
}

function BundleSurface() {
  return (
    <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
      <BlockHead
        code="COMPOSABLE"
        title="Bundles assemble from services"
        aside="A bundle is software, extensions and operating work configured for one outcome. Until KNOuX ships a file, a bundle composes from the services KNOuX already performs."
      />
      <div className="index-rows" style={{ marginTop: 26 }}>
        {wordPressServices.map((service) => (
          <IndexRow
            key={service.id}
            index={service.code}
            name={service.name}
            meta={service.summary}
            metaSecondary={service.activities.slice(0, 3).join(' / ')}
          />
        ))}
      </div>
    </section>
  );
}

export function WordPressGoalIndex() {
  return (
    <SystemIndex
      eyebrow="START WITH A GOAL"
      title={<>Select the outcome,<br />not the product.</>}
      statement="WordPress work is configured by objective. Each goal below resolves to real operating services and, where they exist, to verified catalogue items."
    >
      <div className="index-rows">
        {wordPressGoals.map((goal) => {
          const companions = goal.companionEntityIds
            .map((id) => entityById.get(id))
            .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));
          return (
            <IndexRow
              key={goal.id}
              index={goal.code}
              name={goal.label}
              meta={goal.statement}
              metaSecondary={
                companions.length
                  ? `With ${companions.map((entity) => entity.shortName).join(' / ')}`
                  : `${goal.serviceIds.length} service${goal.serviceIds.length === 1 ? '' : 's'}`
              }
              href="/wordpress#goals"
            />
          );
        })}
      </div>
    </SystemIndex>
  );
}
