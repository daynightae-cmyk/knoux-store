import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, RevealGroup } from '@/components/blocks';
import { DevState } from '@/components/DivisionShell';
import { pageMetadata } from '@/lib/metadata';
import { creativeDisciplines } from '@/data/services';
import { capabilityById } from '@/data/capabilities';
import { entityById } from '@/data/composer-rules';
import { TrackOnView } from '@/components/TrackOnView';
import { MaterialLab } from '@/components/SpatialExperiences';

export const metadata = pageMetadata(
  'Creative',
  'KNOuX Creative: brand identity, interface architecture, art direction, campaign creative, social content, motion, product visuals and presentation systems.',
  '/creative',
);

export default function CreativePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <TrackOnView event={{ type: 'division_opened', division: 'creative', route: '/creative' }} />
      <PageIntro
        index="05"
        label="Creative"
        title="Systems that"
        italic="hold together."
        description="Eight capability systems rather than a gallery. Each one produces a specification somebody else can implement without asking what was meant."
      />
      <SignalRail division="creative" path="/creative" />

      <section className="shell" style={{ paddingTop: 'clamp(60px, 7vw, 120px)' }}><MaterialLab /></section>

      <section className="shell" style={{ paddingTop: 'clamp(50px, 6vw, 100px)', paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <nav aria-label="Creative disciplines" className="finder-chips">
          {creativeDisciplines.map((discipline) => (
            <Link key={discipline.id} className="tag tag--button" href={`/creative/${discipline.slug}`}>
              {discipline.shortName.toUpperCase()}
            </Link>
          ))}
        </nav>
      </section>

      <RevealGroup>
        <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
          <div className="discipline-list">
            {creativeDisciplines.map((discipline, index) => (
              <article key={discipline.id} className="discipline" id={discipline.slug}>
                <span className="discipline__index">
                  {String(index + 1).padStart(2, '0')} / {discipline.code}
                </span>
                <div>
                  <h3>{discipline.title}</h3>
                  <p className="discipline__sub">{discipline.subtitle}</p>
                  <p className="discipline__statement">{discipline.statement}</p>
                  <Link href={`/creative/${discipline.slug}`} className="action" style={{ marginTop: 18 }}>EXPLORE DISCIPLINE <span className="action-arrow" aria-hidden="true">↗</span></Link>
                  <div className="discipline__list">
                    <h4>DELIVERABLES</h4>
                    <ul>
                      {discipline.deliverables.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <h4>PRINCIPLES</h4>
                    <ul>
                      {discipline.principles.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <span className="dossier-card__label">PAIRS WITH</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {discipline.pairsWith.map((pairId) => {
                      const entity = entityById.get(pairId);
                      const capability = capabilityById.get(pairId);
                      const href = entity?.route ?? (capability?.providedBy.includes('web') ? '/web#matrix' : capability?.providedBy.includes('wordpress') ? '/wordpress' : capability?.providedBy.includes('growth') ? '/growth' : capability?.providedBy.includes('creative') ? '/creative' : capability?.providedBy.includes('software') ? '/products' : null);
                      if (!href) return null;
                      return (
                        <Link key={pairId} href={href} className="action" style={{ padding: '11px 14px', fontSize: 12 }}>
                          {entity?.name ?? capability?.label ?? pairId}
                          <span className="action-arrow" aria-hidden="true">
                            ↗
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <span className="dossier-card__label" style={{ marginTop: 24 }}>
                    ENQUIRY
                  </span>
                  <Link
                    href={`/contact?requestType=creative&discipline=${discipline.slug}`}
                    className="action"
                    style={{ padding: '11px 14px', fontSize: 12 }}
                  >
                    Request this
                    <span className="action-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </RevealGroup>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <DevState
          title="No project archive is published."
          mark="HONEST STATE"
          detail={[
            {
              heading: 'Why there is no gallery here',
              body: 'Case studies require verified work with a named context, a real constraint and an outcome that can be checked. None have been documented to that standard yet, so no project images, client names or results are shown.',
            },
            {
              heading: 'What replaces the gallery',
              body: 'The capability systems above. Each one states what is delivered and the principles it is designed against, which is more useful than a portfolio image without a brief.',
            },
            {
              heading: 'Where it will appear',
              body: 'The work archive is a real route with real architecture. When documented work exists, it publishes there rather than being retrofitted into this page.',
            },
          ]}
        >
          <p>
            This division presents capability, not outcomes. A visual archive would imply finished client work that
            is not documented, and the layouts, media placeholders and metrics that usually accompany one would be
            invented.
          </p>
        </DevState>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="Creative usually serves a build."
          body="Identity, interface and motion are most valuable when they are specified alongside the thing they describe. KNOuX Web and KNOuX Composer both accept them as first-class components."
          href="/build"
          action="Open the Composer"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Next division" name="Solutions" href="/solutions" />
        </div>
      </section>
    </main>
  );
}
