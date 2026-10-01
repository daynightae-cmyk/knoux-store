import { PageIntro } from '@/components/PageIntro';
import { DivisionBridge, NextLink } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { labExperiments, repositoryLedger, softwareProducts } from '@/data/software';
import { TrackOnView } from '@/components/TrackOnView';
import { ExperimentChamberV2 } from '@/components/labs/ExperimentChamberV2';

export const metadata = pageMetadata(
  'Labs',
  'KNOuX research and unfinished systems: experiments kept deliberately visible so the state of the practice is inspectable.',
  '/labs',
);

export default function LabsPage() {
  const nonCanonical = repositoryLedger.filter(
    (record) => record.classification === 'LAB' || record.classification === 'PLACEHOLDER' || record.classification === 'DUPLICATE',
  );

  return (
    <main id="main-content" tabIndex={-1}>
      <TrackOnView event={{ type: 'division_opened', division: 'labs', route: '/labs' }} />
      <PageIntro
        index="09"
        label="Labs"
        title="What is still"
        italic="unfinished."
        description="Research, concept documents and repositories that exist but are not products. Kept visible rather than quietly removed, because the state of the practice should be inspectable."
      />

      <section className="shell" style={{ paddingTop: 'clamp(56px, 7vw, 110px)', paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">EXPERIMENTS</span>
            <h2 className="block-head__title">
              In the
              <br />
              lab.
            </h2>
          </div>
          <p className="block-head__aside">
            Each entry states what the repository actually contains. Where a repository is a design document rather
            than a build, this page says so.
          </p>
        </div>

        <ExperimentChamberV2 />
        <details className="evidence-disclosure"><summary>VIEW EXPERIMENT EVIDENCE</summary><div className="index-rows" style={{ marginTop: 34 }}>
          {labExperiments.map((lab) => (
            <article key={lab.id} className="lab-row">
              <span className="lab-row__code">{lab.code}</span>
              <div className="lab-row__body">
                <h3>
                  {lab.name}
                  <span className={`mark mark--${lab.status}`}>{lab.status}</span>
                </h3>
                <p>{lab.statement}</p>
                <p className="lab-row__evidence">
                  <span className="label">EVIDENCE</span>
                  {lab.evidence}
                </p>
                <div className="tags" style={{ marginTop: 14 }}>
                  {lab.stack.split(', ').map((tech) => (
                    <span key={tech} className="tag">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <a className="lab-row__link" href={lab.repository} target="_blank" rel="noreferrer noopener">
                REPOSITORY <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div></details>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(70px, 8vw, 130px)' }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">NOT PRODUCTS</span>
            <h2 className="block-head__title">
              Repositories that
              <br />
              stay unpublished.
            </h2>
          </div>
          <p className="block-head__aside">
            These exist under the KNOuX account but carry no product identity, overlap a maintained repository, or
            are empty. Publishing them would imply a release that does not exist.
          </p>
        </div>
        <details className="evidence-disclosure"><summary>VIEW UNPUBLISHED REPOSITORIES</summary><div className="registry" style={{ marginTop: 30 }}>
          {nonCanonical.map((record) => (
            <div key={record.repository} className="registry-row" style={{ gridTemplateColumns: 'minmax(0,1fr) 130px minmax(0,1.4fr)' }}>
              <span className="registry-row__name mono" style={{ fontSize: 12 }}>
                {record.repository}
              </span>
              <span className="registry-row__compat">{record.classification}</span>
              <span className="registry-row__purpose">{record.basis}</span>
            </div>
          ))}
        </div></details>
        <p className="meta-row" style={{ marginTop: 22 }}>
          <span>{softwareProducts.length} canonical products</span>
          <span>{labExperiments.length} research items</span>
          <span>{nonCanonical.length} held back</span>
        </p>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="Looking for something released?"
          body="The product universe lists only what a repository establishes. Everything held back is on this page with the reason."
          href="/products"
          action="KNOuX Software"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Institution" name="About KNOuX" href="/about" />
        </div>
      </section>
    </main>
  );
}
