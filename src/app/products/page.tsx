import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { ProductUniverse } from '@/components/ProductUniverse';
import { KnouxSoftwareUniverse } from '@/components/KnouxSoftwareUniverse';
import { RepositoryLedger } from '@/components/RepositoryLedger';
import { DivisionBridge, NextLink, RevealGroup, SystemIndex, IndexRow } from '@/components/blocks';
import { SignalRail } from '@/components/DivisionShell';
import { pageMetadata } from '@/lib/metadata';
import { softwareAuditDate, softwareAuditOwner, softwareProducts } from '@/data/software';
import { divisions } from '@/lib/entities';
import { ProjectRail } from '@/components/SpatialExperiences';

export const metadata = pageMetadata(
  'Software Universe',
  'Audited KNOuX software systems: desktop workspaces, engineering tooling, media capture and local security, indexed as a technical topology.',
  '/products',
);

export default function ProductsPage() {
  const families = new Set(softwareProducts.map((product) => product.family));

  return (
    <main id="main-content" tabIndex={-1}>
      <PageIntro
        index="01"
        label="Software"
        title="The product"
        italic="universe."
        description={`Every public KNOuX system, classified from repository evidence. Audited ${softwareAuditDate} against ${softwareAuditOwner}. Nothing is listed that a repository does not establish.`}
      />
      <SignalRail division="software" path="/products" />

      <KnouxSoftwareUniverse />

      <Suspense fallback={<div className="shell" style={{ minHeight: 620 }} />}>
        <ProductUniverse />
      </Suspense>

      <section className="shell" style={{ paddingTop: 'clamp(70px, 8vw, 130px)' }}>
        <div className="block-head"><div><span className="label label--signal">FEATURED ARCHIVE</span><h2 className="block-head__title">One system<br />at a time.</h2></div><p className="block-head__aside">Move through the same verified registry as the topology. Each system opens into its evidence backed dossier.</p></div>
        <ProjectRail />
      </section>

      <RevealGroup>
        <SystemIndex
          eyebrow="REGISTRY"
          title={<>Indexed by<br />family.</>}
          statement="The universe is organised by what a system is for, not by how recently it shipped. A family filter narrows the same audited set the topology draws from."
        >
          <div className="index-rows">
            {[...families].map((family, index) => {
              const members = softwareProducts.filter((product) => product.family === family);
              return (
                <IndexRow
                  key={family}
                  index={String(index + 1).padStart(2, '0')}
                  name={family}
                  meta={members.map((product) => product.shortName).join(' / ')}
                  metaSecondary={`${members.length} system${members.length === 1 ? '' : 's'}`}
                  href={`/products?q=${encodeURIComponent(family)}`}
                />
              );
            })}
          </div>
        </SystemIndex>
      </RevealGroup>

      <section className="shell" id="ledger" style={{ paddingBottom: 'clamp(72px, 8vw, 130px)', scrollMarginTop: 90 }}>
        <div className="block-head">
          <div>
            <span className="label label--signal">LEDGER</span>
            <h2 className="block-head__title">
              What was
              <br />
              audited.
            </h2>
          </div>
          <p className="block-head__aside">
            The full classification of KNOuX-branded repositories, including the ones deliberately not published
            as products. Repositories that are not KNOuX-branded are outside this catalogue and are not listed.
          </p>
        </div>
        <details className="evidence-disclosure"><summary>VIEW SYSTEM LEDGER</summary><RepositoryLedger /></details>
      </section>

      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <div className="shell" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <DivisionBridge
            label="NEXT LAYER"
            title="Need one of these running on your own machine?"
            body="KNOuX Software is built and maintained in-house. Custom implementation, deployment and support are handled by the Web and Composer divisions."
            href="/build"
            action="Compose a stack"
          />
        </div>
        <div style={{ marginTop: 60 }}>
          <NextLink label="The other divisions" name="WordPress ecosystem" href="/wordpress" />
        </div>
        <p className="meta-row" style={{ marginTop: 40 }}>
          {divisions.length} divisions / one engineering practice / one data model
        </p>
      </section>
    </main>
  );
}
