import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, RevealGroup } from '@/components/blocks';
import { ExternalItemCard } from '@/components/wordpress/ExternalItemCard';
import { WordPressGoalIndex } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import { wordPressItems, wordpressPillars, wordPressServices } from '@/data/wordpress';
import { featuredPlugins, featuredThemes } from '@/lib/wordpress/wordpress-org';
import { TrackOnView } from '@/components/TrackOnView';
import { EcosystemRack } from '@/components/SpatialExperiences';

export const metadata = pageMetadata(
  'WordPress Ecosystem',
  'KNOuX WordPress: first-party releases reported honestly alongside live discovery from the official WordPress.org plugin, theme, block and pattern directories, plus the operating work that keeps an install correct.',
  '/wordpress',
);

export default async function WordPressPage() {
  // Two bounded reads for the overview. The whole directory is never requested.
  const [plugins, themes] = await Promise.all([featuredPlugins(6), featuredThemes(6)]);

  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'division_opened', division: 'wordpress', route: '/wordpress' }} />
      <PageIntro
        index="02"
        label="WordPress"
        title="Systems for"
        italic="the open web."
        description="A KNOuX ecosystem, not a listing. This division is organised by what a WordPress build has to do: author it, extend it, operate it, or grow it."
      />
      <SignalRail division="wordpress" path="/wordpress" />

      {/* Operating groups */}
      <section className="shell" id="operate" style={{ paddingTop: 'clamp(60px, 7vw, 120px)', paddingBottom: 'clamp(80px, 9vw, 150px)', scrollMarginTop: 80 }}>
        <RevealGroup>
          <div className="block-head">
            <div>
              <span className="label label--signal">ECOSYSTEM</span>
              <h2 className="block-head__title">
                Four groups,
                <br />
                one install.
              </h2>
            </div>
            <p className="block-head__aside">
              Everything in a WordPress engagement belongs to one of these. A build that only addresses the first
              group is unfinished.
            </p>
          </div>
        </RevealGroup>
        <div className="wordpress-axes" style={{ marginTop: 40 }}>
          {wordpressPillars.map((pillar) => (
            <div key={pillar.id} className="pillar" data-reveal>
              <span className="pillar__index">{pillar.index}</span>
              <h3>{pillar.label}</h3>
              <p>{pillar.statement}</p>
              <ul className="pillar__activities">
                {pillar.activities.map((activity) => (
                  <li key={activity}>{activity}</li>
                ))}
              </ul>
              {pillar.categoryRoute ? (
                <span className="pillar__link">SEE {pillar.label.toUpperCase()} CATALOGUE</span>
              ) : (
                <span className="pillar__link" style={{ color: '#6d6e70' }}>
                  PERFORMED AS A SERVICE
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <WordPressGoalIndex />

      {/* Two layers, reported separately and never merged */}
      <section className="shell" id="catalogues" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">TWO LAYERS</span>
            <h2 className="block-head__title">
              What KNOuX publishes,
              <br />
              and what WordPress.org publishes.
            </h2>
          </div>
          <p className="block-head__aside">
            KNOuX has released no WordPress files of its own yet, and that number stays visible. Everything
            discoverable below is third-party work read live from the official WordPress.org directories and
            attributed to its authors.
          </p>
        </div>

        <div className="wp-layers">
          <div className="wp-layers__cell">
            <span className="wp-layers__label">KNOuX Releases</span>
            <p className="wp-layers__count">
              <strong>{wordPressItems.length}</strong> published
            </p>
            <p className="wp-layers__body">
              First-party files only. An entry appears when a repository or a verifiable download establishes a
              real KNOuX release.
            </p>
            <p className="meta-row" style={{ marginTop: 18 }}>
              <span>THEMES 0</span>
              <span>PLUGINS 0</span>
              <span>BLOCKS 0</span>
            </p>
          </div>
          <div className="wp-layers__cell">
            <span className="wp-layers__label">WordPress.org Discovery</span>
            <p className="wp-layers__count">
              <strong>Live</strong> directory
            </p>
            <p className="wp-layers__body">
              Read on request from the official WordPress.org plugin, theme and pattern APIs. Nothing is cached
              into the KNOuX registry and nothing here is claimed as KNOuX work.
            </p>
            <p className="meta-row" style={{ marginTop: 18 }}>
              <span>PLUGINS {plugins.state === 'ok' && plugins.totalKnown ? plugins.totalItems.toLocaleString('en-US') : 'LIVE'}</span>
              <span>THEMES {themes.state === 'ok' && themes.totalKnown ? themes.totalItems.toLocaleString('en-US') : 'LIVE'}</span>
            </p>
          </div>
        </div>

        <div className="mp-firstparty__links" style={{ marginTop: 30 }}>
          <Link href="/wordpress/plugins">Browse plugins</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/themes">Browse themes</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/blocks">Browse blocks</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/patterns">Browse patterns</Link>
        </div>

        <EcosystemRack />
      </section>

      {/* Live discovery */}
      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">EXPLORE WORDPRESS.ORG</span>
            <h2 className="block-head__title">
              Most used plugins,
              <br />
              right now.
            </h2>
          </div>
          <p className="block-head__aside">
            Six entries read live from the official plugin directory. Open the full route to search, filter and
            page through the directory.
          </p>
        </div>
        {plugins.state === 'ok' ? (
          <ul className="mp-grid mp-grid--compact">
            {plugins.items.map((item, index) => (
              <li key={item.slug}>
                <ExternalItemCard item={item} index={index} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mp-state" role="status">
            <span className="label label--signal">UPSTREAM UNAVAILABLE</span>
            <p className="mp-state__body">{plugins.note}</p>
          </div>
        )}
        <div className="mp-firstparty__links" style={{ marginTop: 24 }}>
          <Link href="/wordpress/plugins">Search all plugins</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/themes">Search all themes</Link>
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">EXPLORE WORDPRESS.ORG</span>
            <h2 className="block-head__title">
              Recent themes
              <br />
              from the directory.
            </h2>
          </div>
          <p className="block-head__aside">
            Six theme entries with the screenshots published upstream, served through the asset proxy on this
            site.
          </p>
        </div>
        {themes.state === 'ok' ? (
          <ul className="mp-grid mp-grid--compact">
            {themes.items.map((item, index) => (
              <li key={item.slug}>
                <ExternalItemCard item={item} index={index} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mp-state" role="status">
            <span className="label label--signal">UPSTREAM UNAVAILABLE</span>
            <p className="mp-state__body">{themes.note}</p>
          </div>
        )}
      </section>

      {/* Operating services */}
      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">OPERATING WORK</span>
            <h2 className="block-head__title">
              What KNOuX
              <br />
              performs today.
            </h2>
          </div>
          <p className="block-head__aside">
            These are engineering services rather than files, so they are available now. They carry no price and
            no duration; scope is agreed in conversation.
          </p>
        </div>
        <details className="evidence-disclosure"><summary>VIEW OPERATING SERVICE INDEX</summary><div className="index-rows" style={{ marginTop: 40 }}>
          {wordPressServices.map((service) => (
            <div key={service.id} className="index-row">
              <span className="index-row__index">{service.code}</span>
              <span className="index-row__name">{service.name}</span>
              <span className="index-row__meta">
                <span>{service.summary}</span>
                <span className="mono">{service.activities.slice(0, 3).join(' / ')}</span>
              </span>
              <span className="index-row__arrow" aria-hidden="true">
                ·
              </span>
            </div>
          ))}
        </div></details>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <p className="meta-row" style={{ marginBottom: 30 }}>
          <span>KNOuX RELEASES: {wordPressItems.length}</span>
          <span>EXTERNAL: WORDPRESS.ORG DIRECTORIES</span>
          <span>SERVICES: {wordPressServices.length}</span>
          <span>GOALS: 5</span>
        </p>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="WordPress rarely stands alone."
          body="An install usually sits inside a wider system: a storefront, a portal, a campaign. The Composer assembles those from the same registry this division publishes."
          href="/build"
          action="Open the Composer"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Next division" name="Web engineering" href="/web" />
        </div>
      </section>
    </main>
  );
}
