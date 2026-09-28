import { PageIntro } from '@/components/PageIntro';
import { EngineeringCaseFiles } from '@/components/SpecialistArchives';
import { DivisionBridge, NextLink } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata(
  'Engineering',
  'Evidence-backed KNOuX engineering dossiers: implementation, constraints, technology, repository evidence and system relationships.',
  '/engineering',
);

export default function Engineering() {
  return (
    <main id="main-content">
      <PageIntro
        index="02"
        label="Engineering"
        title="Systems are"
        italic="relationships."
        description="A technical archive of what is implemented, what is constrained, and where the evidence lives. Interface claims stop where repository evidence stops."
      />

      <section
        className="shell specialist-intro"
        style={{ paddingTop: 'clamp(64px, 7vw, 118px)', paddingBottom: 'clamp(76px, 8vw, 132px)' }}
      >
        <div className="specialist-intro__head">
          <span className="label label--signal">ENGINEERING DOSSIERS</span>
          <p>
            Persistent context follows the selected system while the implementation record scrolls independently.
            Each dossier exposes declared capabilities and limitations side by side instead of turning documentation
            into a wall of text.
          </p>
        </div>
        <EngineeringCaseFiles />
      </section>
      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="FROM EVIDENCE TO PRODUCT"
          title="Need the public product view?"
          body="Product dossiers keep the same evidence boundary while presenting each system for evaluation and discovery."
          href="/products"
          action="Explore products"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Next archive" name="Work" href="/work" />
        </div>
      </section>
    </main>
  );
}
