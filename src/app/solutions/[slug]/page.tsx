import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { SignalRail } from '@/components/DivisionShell';
import { DivisionBridge, NextLink, IndexRow } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { findSolution, solutionEntityIds, solutions, type Solution } from '@/data/solutions';
import { entityById } from '@/data/composer-rules';
import { TrackOnView } from '@/components/TrackOnView';

export function generateStaticParams() {
  return solutions.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solution = findSolution(slug);
  if (!solution) return pageMetadata('Solution not found', 'This KNOuX solution does not exist.', '/solutions');
  return pageMetadata(solution.title, solution.objective, `/solutions/${solution.slug}`);
}

function Layer({
  layer,
  kind,
}: {
  layer: Solution['core'][number];
  kind: 'core' | 'optional';
}) {
  const items = layer.entityIds
    .map((id) => entityById.get(id))
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));

  return (
    <div className="solution-layer">
      <div className="solution-layer__head">
        <span className="assembly__key">
          {kind === 'core' ? 'CORE' : 'OPTIONAL'}
          <span>{items.length} ITEM{items.length === 1 ? '' : 'S'}</span>
        </span>
        <h3>{layer.label}</h3>
        <p>{layer.because}</p>
      </div>
      <div className="assembly__items">
        {items.map((entity) => (
          <div key={entity.id} className="assembly__item">
            <div>
              <p className="assembly__item-name">
                <Link href={entity.route ?? '#'}>{entity.name}</Link>
              </p>
              <p className="assembly__item-note">{entity.summary}</p>
            </div>
            <span className="registry-row__id">{entity.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const solution = findSolution(slug);
  if (!solution) notFound();

  const others = solutions.filter((entry) => entry.id !== solution.id);
  const composed = solutionEntityIds(solution).filter((id) => entityById.has(id));
  const divisionsTouched = [...new Set(composed.map((id) => entityById.get(id)!.division))];

  return (
    <main id="main-content">
      <TrackOnView event={{ type: 'solution_opened', slug: solution.slug }} />
      <PageIntro
        index={solution.code}
        label="Solution"
        title={solution.title.replace(/^(Start|Build|Create|Promote|Launch|Digitise|Modernise) /, '')}
        italic={solution.group === 'reach' ? 'found.' : 'built.'}
        description={solution.objective}
      />
      <SignalRail division="solutions" path={`/solutions/${solution.slug}`} />

      <section className="shell" style={{ paddingTop: 'clamp(56px, 7vw, 110px)', paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <dl className="telemetry-strip">
          <div>
            <dt>Objective</dt>
            <dd style={{ fontFamily: 'inherit', fontSize: 14 }}>{solution.objective}</dd>
          </div>
          <div>
            <dt>Suits</dt>
            <dd style={{ fontFamily: 'inherit', fontSize: 14 }}>{solution.suits}</dd>
          </div>
          <div>
            <dt>Divisions involved</dt>
            <dd>{divisionsTouched.length}</dd>
          </div>
          <div>
            <dt>Composed entities</dt>
            <dd>{composed.length}</dd>
          </div>
        </dl>

        <p className="dossier__prose" style={{ fontSize: 18, marginTop: 46, maxWidth: '70ch' }}>
          {solution.statement}
        </p>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">SYSTEMS</span>
            <h2 className="block-head__title">What is usually needed.</h2>
          </div>
          <p className="block-head__aside">
            These layers are what this objective normally requires. They are not a quote, and you are not expected
            to need all of them.
          </p>
        </div>
        <div className="assembly" style={{ marginTop: 34 }}>
          {solution.core.map((layer) => (
            <Layer key={layer.label} layer={layer} kind="core" />
          ))}
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">OPTIONAL MODULES</span>
            <h2 className="block-head__title">
              What may or
              <br />
              may not apply.
            </h2>
          </div>
          <p className="block-head__aside">
            Each of these is contingent. Whether any of it is needed depends on your situation, and the right
            answer is sometimes none of them.
          </p>
        </div>
        <div className="assembly" style={{ marginTop: 34 }}>
          {solution.optional.map((layer) => (
            <Layer key={layer.label} layer={layer} kind="optional" />
          ))}
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="dev-state" data-reveal>
          <p className="dev-state__mark">
            <span className="dev-state__pulse" aria-hidden="true" />
            <span className="label label--signal">NEXT STEP</span>
          </p>
          <h2>{solution.nextStep}</h2>
          <p>
            Nothing on this page carries a price, a delivery window or an outcome claim. Those follow from a scope,
            and a scope follows from a conversation.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
            <Link href={`/contact?requestType=solution&solution=${solution.slug}`} className="action action--primary">
              Start that conversation
              <span className="action-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
            <Link href={`/build?preset=${encodeURIComponent(solution.objective)}`} className="action">
              Compose it in the Composer
            </Link>
          </div>
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <span className="label label--signal">OTHER SOLUTIONS</span>
        <div className="index-rows" style={{ marginTop: 22 }}>
          {others.map((entry) => (
            <IndexRow key={entry.id} index={entry.index} name={entry.title} meta={entry.objective} href={`/solutions/${entry.slug}`} />
          ))}
        </div>
        <div style={{ marginTop: 60 }}>
          <DivisionBridge
            label="ACROSS DIVISIONS"
            title="Build the exact stack for this."
            body="Describe the situation in your own words. The Composer resolves it against the same registries this page is assembled from."
            href={`/build?preset=${encodeURIComponent(solution.objective)}`}
            action="Open the Composer"
          />
        </div>
        <div style={{ marginTop: 60 }}>
          <NextLink label="Back to" name="All solutions" href="/solutions" />
        </div>
      </section>
    </main>
  );
}
