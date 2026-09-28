import { PageIntro } from '@/components/PageIntro';
import { DivisionBridge, NextLink } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import { CaseFileArchive } from '@/components/SpecialistArchives';

export const metadata = pageMetadata(
  'Work',
  'Verified KNOuX product and engineering records presented as evidence-backed case files without invented clients, metrics or outcomes.',
  '/work',
);

export default function WorkPage() {
  return (
    <main id="main-content">
      <PageIntro
        index="10"
        label="Work"
        title="The work"
        italic="stays checkable."
        description="An interactive archive of systems KNOuX actually maintains. Every public statement resolves to repository evidence; unsupported client stories and performance claims stay out."
      />

      <section
        className="shell specialist-intro"
        style={{ paddingTop: 'clamp(64px, 7vw, 118px)', paddingBottom: 'clamp(76px, 8vw, 132px)' }}
      >
        <div className="specialist-intro__head">
          <span className="label label--signal">CASE FILES / VERIFIED PRODUCTS</span>
          <p>
            These are product and engineering records, not fictional client case studies. Technology, constraints,
            implementation evidence and repository sources come from the maintained KNOuX product registry.
          </p>
        </div>
        <CaseFileArchive />
      </section>
      <section className="shell" style={{ paddingBottom: 'clamp(80px, 9vw, 150px)' }}>
        <DivisionBridge
          label="ACROSS DIVISIONS"
          title="Want the implementation detail?"
          body="The Engineering archive opens the same verified systems at a deeper layer: implementation evidence, declared constraints, technology and system relationships."
          href="/engineering"
          action="Open Engineering"
        />
        <div style={{ marginTop: 60 }}>
          <NextLink label="Institution" name="About KNOuX" href="/about" />
        </div>
      </section>
    </main>
  );
}
