import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, RevealGroup, SystemIndex, IndexRow } from '@/components/blocks';
import { CapabilityMatrix, SystemsStudio } from '@/components/WebSystems';
import { pageMetadata } from '@/lib/metadata';
import { engineeringStages, webSystemCategories, webSystems } from '@/data/services';
import { TrackOnView } from '@/components/TrackOnView';
import { SystemBlueprint } from '@/components/SpatialExperiences';

export const metadata = pageMetadata(
  'Web Engineering',
  'KNOuX Web Engineering organised by system type: corporate sites, e-commerce, web applications, portals, admin systems and interactive experiences.',
  '/web',
);

export default function WebPage() {
  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'division_opened', division: 'web', route: '/web' }} />
      <PageIntro
        index="03"
        label="Web"
        title="Systems, not"
        italic="pages."
        description="KNOuX web engineering is organised by what the system has to do. No prices, no delivery windows, no client counts — those are agreed per project, not published as claims."
      />
      <SignalRail division="web" path="/web" />

      <section className="shell" style={{ paddingTop: 'clamp(60px, 7vw, 120px)' }}><SystemBlueprint /></section>

      <section className="shell" id="systems" style={{ paddingTop: 'clamp(60px, 7vw, 120px)', paddingBottom: 'clamp(80px, 9vw, 150px)', scrollMarginTop: 80 }}>
        <RevealGroup>
          <div className="block-head">
            <div>
              <span className="label label--signal">SYSTEMS STUDIO</span>
              <h2 className="block-head__title">
                What are you
                <br />
                building?
              </h2>
            </div>
            <p className="block-head__aside">
              The answer determines the disciplines, the artefacts and the platform choice. Each system type below
              is a different shape of problem.
            </p>
          </div>
        </RevealGroup>
        <div style={{ marginTop: 40 }}>
          <SystemsStudio systems={webSystems} />
        </div>
      </section>

      <section className="shell" id="matrix" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)', scrollMarginTop: 80 }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">CAPABILITY MATRIX</span>
            <h2 className="block-head__title">
              One vocabulary,
              <br />
              five divisions.
            </h2>
          </div>
          <p className="block-head__aside">
            Capabilities are shared across the institution. A capability with a marker in more than one column can be
            delivered either way, and the choice is a scoping decision rather than a sales one.
          </p>
        </div>
        <details className="evidence-disclosure"><summary>VIEW CAPABILITY MATRIX</summary><div style={{ marginTop: 34 }}>
          <CapabilityMatrix />
        </div></details>
      </section>

      <RevealGroup>
        <SystemIndex
          eyebrow="SYSTEM TYPES"
          title={<>Indexed by<br />what it does.</>}
          statement="Six system types cover most of what KNOuX builds. The index is the same set the selector above uses."
        >
          <div className="index-rows">
            {webSystems.map((system) => (
              <IndexRow
                key={system.id}
                index={system.code}
                name={system.title}
                meta={system.tagline}
                metaSecondary={`${system.disciplines.length} DISCIPLINES / ${system.artefacts.length} ARTEFACTS`}
                href={`/web/${system.slug}`}
              />
            ))}
          </div>
        </SystemIndex>
      </RevealGroup>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">CATEGORIES</span>
            <h2 className="block-head__title">The short form.</h2>
          </div>
          <p className="block-head__aside">One sentence on what each system type is for.</p>
        </div>
        <div className="index-rows" style={{ marginTop: 34 }}>
          {webSystemCategories.map((category, index) => (
            <div key={category.id} className="index-row">
              <span className="index-row__index">{String(index + 1).padStart(2, '0')}</span>
              <span className="index-row__name">{category.label}</span>
              <span className="index-row__meta">
                <span>{category.question}</span>
              </span>
              <span className="index-row__arrow" aria-hidden="true">
                ·
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">PRACTICE</span>
            <h2 className="block-head__title">
              The same four
              <br />
              stages.
            </h2>
          </div>
          <p className="block-head__aside">
            Whatever the system type, the work runs through the same engineering stages. The{' '}
            <a href="/engineering" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              engineering page
            </a>{' '}
            sets out what each one covers.
          </p>
        </div>
        <div className="index-rows" style={{ marginTop: 34 }}>
          {engineeringStages.map((stage) => (
            <IndexRow key={stage.id} index={stage.index} name={stage.title} meta={stage.detail} />
          ))}
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="Ready to acquire customers for it?"
          body="A build is only half a system. KNOuX Growth covers campaign structure, measurement and the content that gives a site something to be found for."
          href="/growth"
          action="KNOuX Growth"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Next division" name="Growth" href="/growth" />
        </div>
      </section>
    </main>
  );
}
