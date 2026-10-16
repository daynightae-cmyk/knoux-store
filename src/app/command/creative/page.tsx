'use client';

/**
 * Command Center — Creative Studio.
 *
 * Every AI output here is an editable draft. That is enforced in the data model
 * (`aiGenerated`, `status: 'DRAFT'`) and restated on screen, because a draft
 * that reads as final copy is how a forbidden claim reaches a client.
 *
 * The brand panel is shown alongside the drafts rather than behind a link,
 * because the forbidden-claims list is what a copywriter needs open while
 * writing, not after.
 */

import { AdPreviewTheatre } from '@/components/command/studio/AdPreviewTheatre';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import { Pane, Section } from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';

import styles from '@/components/command/command.module.css';

export default function CreativePage() {
  return <Creative />;
}

function Creative() {
  const { records, activeClient } = useWorkspace();
  const area = areaBySlug('creative')!;
  const creatives = records.creatives;

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'creative-studio',
        contextLine: `${activeClient.name} · ${creatives.length} draft(s) · ${creatives.filter((c) => c.aiGenerated).length} AI-generated`,
      }}
      facts={[
        { label: 'Drafts', value: String(creatives.length) },
        { label: 'Approved', value: String(creatives.filter((c) => c.status === 'APPROVED').length) },
      ]}
    >
      <AdPreviewTheatre />
      <Section title="Brand context" note="What constrains every draft below.">
        <div className={styles.commandGrid3 ?? ''}>
          <Pane title="Forbidden claims">
            <ul className={styles.ccPaneList ?? ''}>
              {activeClient.brand.forbiddenClaims.map((claim) => (
                <li key={claim} style={{ display: 'flex', gap: 8 }}>
                  <span aria-hidden="true" style={{ color: 'var(--cc-red)' }}>
                    ×
                  </span>
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
          </Pane>

          <Pane title="Register">
            <p className={styles.ccPaneBody ?? ''}>{activeClient.brand.tone}</p>
            {activeClient.brand.arabicStyle ? (
              <p className={styles.ccPaneBody ?? ''}>
                <strong>AR:</strong> {activeClient.brand.arabicStyle}
              </p>
            ) : null}
            {activeClient.brand.englishStyle ? (
              <p className={styles.ccPaneBody ?? ''}>
                <strong>EN:</strong> {activeClient.brand.englishStyle}
              </p>
            ) : null}
          </Pane>

          <Pane title="Approved assets">
            <ul className={styles.ccPaneList ?? ''}>
              {activeClient.brand.approvedAssets.map((asset) => (
                <li key={asset}>{asset}</li>
              ))}
            </ul>
            {activeClient.brand.previousWinningCreativeIds.length > 0 ? (
              <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 6, fontSize: 12 }}>
                <strong>Previously winning:</strong>{' '}
                {activeClient.brand.previousWinningCreativeIds.join(', ')}
              </p>
            ) : null}
          </Pane>
        </div>
      </Section>


    </CommandShell>
  );
}
