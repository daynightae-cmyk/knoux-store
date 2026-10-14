import { EngineeringExperience } from '@/components/engineering/EngineeringExperience';
import { EngineeringCaseFiles } from '@/components/SpecialistArchives';
import { DivisionBridge, NextLink } from '@/components/blocks';
import { pageMetadata } from '@/lib/metadata';
import styles from './engineering.module.css';

export const metadata = pageMetadata(
  'Engineering',
  'Evidence-backed KNOuX engineering dossiers: implementation, constraints, technology, repository evidence and system relationships.',
  '/engineering',
);

export default function Engineering() {
  return (
    <main id="main-content" tabIndex={-1}>
      <EngineeringExperience />

      <section
        id="engineering-dossiers"
        className={`shell specialist-intro ${styles.dossiers}`}
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
      <section className={`shell ${styles.closing}`}>
        <DivisionBridge
          label="FROM EVIDENCE TO PRODUCT"
          title="Need the public product view?"
          body="Product dossiers keep the same evidence boundary while presenting each system for evaluation and discovery."
          href="/products"
          action="Explore products"
        />
        <div className={styles.next}>
          <NextLink label="Next archive" name="Work" href="/work" />
        </div>
      </section>
    </main>
  );
}
