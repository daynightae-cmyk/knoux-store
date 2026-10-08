import Link from 'next/link';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, BlockHead } from '@/components/blocks';
import { WordPressGoalIndex } from '@/components/WordPressCatalog';
import { pageMetadata } from '@/lib/metadata';
import { wordPressItems, wordPressServices, wordPressGoals } from '@/data/wordpress';
import { TrackOnView } from '@/components/TrackOnView';
import { EcosystemHero } from '@/components/wordpress/EcosystemHero';
import { DomainFinder } from '@/components/wordpress/DomainFinder';
import { DomainProvenance, DomainConnectionSummary } from '@/components/wordpress/DomainProvenance';
import { HostingRack } from '@/components/wordpress/HostingRack';
import { WordPressLibraryGateway } from '@/components/wordpress/WordPressLibraryGateway';
import { BuildAndOperate } from '@/components/wordpress/BuildAndOperate';
import { EcosystemComposer } from '@/components/wordpress/EcosystemComposer';
import { ProcessArchitecture } from '@/components/ProcessArchitecture';

export const metadata = pageMetadata(
  'WordPress Ecosystem',
  'KNOuX Web Ecosystem: domain discovery, infrastructure, the live WordPress.org library, and the operating work that keeps a WordPress install correct — with registrar and commerce state reported honestly, and no invented availability or pricing.',
  '/wordpress',
);

/**
 * /wordpress — the ecosystem command centre.
 *
 * Six chapters, in the order the work actually happens:
 *
 *   00  hero        the stack, stated once
 *   01  domain      the name, verified by a registrar
 *   02  hosting     where it runs and who owns it
 *   03  library     the live WordPress.org directories
 *   04  operate     the engineering that keeps it alive
 *   05  launch      the composition request
 *
 * Two constraints shape the whole page.
 *
 * The first is that this overview does not fetch the catalogue. It links to the
 * four directories, each of which paginates and searches server-side. A landing
 * page that preloaded a slice of a hundred-thousand-entry directory in order to
 * look large would make a live external request per card, on every cold render,
 * for data a visitor is about to request deliberately.
 *
 * The second is that nothing here states a commercial fact. The domain section
 * reads the server's provider configuration at request time and reports which
 * state it is in. The hosting section publishes no plan, no specification and
 * no price, because no source for them is configured. Both surfaces are
 * complete and fully designed in that state, which is the honest version of
 * this page rather than a reduced one.
 *
 * The page itself stays statically generated. It reads no environment variable
 * and makes no external request, which is why it can be cached; the provider
 * state is fetched at request time by `DomainProvenance` rather than baked in
 * at build time, so connecting a registrar does not require a rebuild to be
 * reflected honestly.
 */
export default async function WordPressPage() {
  const firstPartyCount = wordPressItems.length;

  return (
    <main id="main-content" tabIndex={-1}>
      <TrackOnView event={{ type: 'division_opened', division: 'wordpress', route: '/wordpress' }} />

      {/* 00 — Cinematic hero. This is the page's only <h1>; the breadcrumb and
          the scroll cue that used to live in a second `PageIntro` immediately
          below it are part of the hero now, so the page opens once rather than
          twice and a screen reader meets a single top-level heading. */}
      <EcosystemHero />
      <div className="shell"><ProcessArchitecture kind="wordpress" /></div>
      <SignalRail division="wordpress" path="/wordpress" />

      <section className="shell eco-section" id="system" aria-labelledby="system-heading">
        <div className="eco-section__body">
          <div id="system-heading" className="sr-only">
            <h2>What this division is</h2>
          </div>
          <p className="eco-thesis">
            A web presence is a name, an infrastructure decision, a software stack and an operating commitment. This
            division is organised in that order, because that is the order they depend on each other in — and each
            chapter below reports what is actually known about its layer rather
            than what would look most complete.
          </p>
        </div>
      </section>

      {/* 01 — Domain Finder */}
      <section className="shell eco-section" id="domain" aria-labelledby="domain-heading">
        <BlockHead
          code="01 / DOMAIN"
          title={
            <>
              The name comes
              <br />
              first.
            </>
          }
          aside="A registrar is the only authority on whether a domain can be registered. This section asks one, shows exactly what it said, and names the registrar that said it."
        />

        <div className="eco-section__body">
          <div id="domain-heading" className="sr-only">
            <h2>Domain finder</h2>
          </div>
          <DomainFinder />
          <DomainProvenance />
        </div>
      </section>

      {/* 02 — Infrastructure */}
      <section className="shell eco-section" id="infrastructure" aria-labelledby="infrastructure-heading">
        <BlockHead
          code="02 / HOSTING"
          title={
            <>
              Where it runs,
              <br />
              and who owns it.
            </>
          }
          aside="Infrastructure is a decision with a person attached to it, not a plan with a number attached to it. KNOuX states the boundary it works inside and performs the engineering on top of it."
        />
        <div className="eco-section__body">
          <div id="infrastructure-heading" className="sr-only">
            <h2>Hosting and infrastructure</h2>
          </div>
          <HostingRack />
        </div>
      </section>

      {/* 03 — WordPress library */}
      <section className="shell eco-section" id="library" aria-labelledby="library-heading">
        <BlockHead
          code="03 / LIBRARY"
          title={
            <>
              A live archive
              <br />
              of WordPress.
            </>
          }
          aside="Four official directories, read live and presented according to what each one actually is. Themes are images. Plugins are metadata. The overview routes into them rather than preloading a slice."
        />
        <div className="eco-section__body">
          <div id="library-heading" className="sr-only">
            <h2>WordPress library</h2>
          </div>
          <WordPressLibraryGateway />
        </div>
      </section>

      {/* 04 — Build & operate */}
      <section className="shell eco-section" id="operate" aria-labelledby="operate-heading">
        <BlockHead
          code="04 / OPERATE"
          title={
            <>
              What keeps it
              <br />
              correct.
            </>
          }
          aside="Seven services KNOuX performs today, in the order they have to happen. A launch without this layer is not finished, and the layer is where most of the engineering actually sits."
        />
        <div className="eco-section__body">
          <div id="operate-heading" className="sr-only">
            <h2>Build and operate</h2>
          </div>
          <BuildAndOperate />
        </div>
      </section>

      {/* Outcomes. This was on the page before the ecosystem restructure and was
          nearly lost in it. It is real first-party content: five outcomes that
          each resolve to KNOuX services that exist today, and to catalogue items
          once KNOuX releases any. It belongs between the operating work and the
          request, because it is the step that turns "we do seven services" into
          "this is the one you need". */}
      <WordPressGoalIndex />

      {/* 05 — Launch / compose */}
      <section className="shell eco-section" id="launch" aria-labelledby="launch-heading">
        <BlockHead
          code="05 / LAUNCH"
          title={
            <>
              Compose the
              <br />
              build.
            </>
          }
          aside="Choose the layers, and the request describes the work. There is no checkout on this site: no payment is taken here and nothing is registered automatically."
        />
        <div className="eco-section__body">
          <div id="launch-heading" className="sr-only">
            <h2>Launch and compose</h2>
          </div>
          <EcosystemComposer />
        </div>
      </section>

      {/* Evidence / provenance */}
      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <BlockHead
          code="06 / EVIDENCE"
          title="What this page is reporting."
          aside="Every count below is read from a registry or a provider, not from a design decision. A zero here is a real measurement."
        />

        <dl className="eco-ledger" style={{ marginTop: 34 }}>
          <div>
            <dt>KNOuX WordPress releases</dt>
            <dd>{firstPartyCount}</dd>
            <dd className="eco-ledger__note">
              First-party registry, <code>src/data/wordpress.ts</code>. Unchanged by this work.
            </dd>
          </div>
          <div>
            <dt>KNOuX operating services</dt>
            <dd>{wordPressServices.length}</dd>
            <dd className="eco-ledger__note">Real engineering services, available now. No price, no duration.</dd>
          </div>
          <div>
            <dt>WordPress.org directories</dt>
            <dd>4</dd>
            <dd className="eco-ledger__note">Plugins, themes, blocks, patterns. Read live on request through documented endpoints.</dd>
          </div>
          <div>
            <dt>Registrar provider</dt>
            <dd>
              <DomainConnectionSummary />
            </dd>
            <dd className="eco-ledger__note">
              Read at request time from the deployment&rsquo;s server configuration. See the provider state above.
            </dd>
          </div>
          <div>
            <dt>Commerce provider</dt>
            <dd>Not configured</dd>
            <dd className="eco-ledger__note">
              No hosting plans, prices, resource limits or renewal terms are published, because no source supplies them.
            </dd>
          </div>
          <div>
            <dt>Outcomes to start from</dt>
            <dd>{wordPressGoals.length}</dd>
            <dd className="eco-ledger__note">
              Each resolves to real services, and to catalogue items once KNOuX releases any.
            </dd>
          </div>
        </dl>

        <div className="mp-firstparty__links" style={{ marginTop: 34 }}>
          <Link href="/wordpress/plugins">Browse plugins</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/themes">Browse themes</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/blocks">Browse blocks</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/patterns">Browse patterns</Link>
          <span aria-hidden="true">·</span>
          <Link href="/wordpress/solutions">Composed services</Link>
        </div>

        {/*
          A `div`, not a `p`. This block was a paragraph containing a paragraph,
          which is invalid nesting and which React reports as a hydration
          mismatch on every render — the browser's parser closes the outer
          element before the inner one is read, so the client tree never matches
          the server tree.
        */}
        <div className="mp__footnote" style={{ marginTop: 30 }}>
          <p>
            Every plugin, theme, block and pattern in this division is third-party work published on WordPress.org and
            attributed to its own author. KNOuX publishes none of it, supports none of it, and makes no endorsement
            of any specific item. What KNOuX does is the engineering around a choice already made: installation,
            configuration, migration, performance, security and maintenance. See the{' '}
            <Link href="/wordpress#operate">operating services</Link>.
          </p>
        </div>

        <div style={{ marginTop: 56 }}>
          <DivisionBridge
            label="ACROSS DIVISIONS"
            title="WordPress rarely stands alone."
            body="An install usually sits inside a wider system: a storefront, a portal, a campaign. The Composer assembles those from the same registry this division publishes."
            href="/build"
            action="Open the Composer"
          />
        </div>

        <div style={{ marginTop: 60 }}>
          <NextLink label="Next division" name="Web engineering" href="/web" />
        </div>
      </section>
    </main>
  );
}
