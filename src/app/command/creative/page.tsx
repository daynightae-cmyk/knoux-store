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

import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import { CodeBadge, DemoNotice, EmptyState, OriginLabel, Pane, Section } from '@/components/command/primitives';
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
              <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 6, fontSize: 11.5 }}>
                <strong>Previously winning:</strong>{' '}
                {activeClient.brand.previousWinningCreativeIds.join(', ')}
              </p>
            ) : null}
          </Pane>
        </div>
      </Section>

      <Section title="Drafts" note="AI output is a starting point, never a finished asset.">
        {creatives.length === 0 ? (
          <EmptyState title="No drafts">
            KNOuX drafts concepts, hooks, headlines, primary text, visual prompts and video scripts
            against the brand rules above.
          </EmptyState>
        ) : (
          <div className={styles.commandGrid2 ?? ''}>
            {creatives.map((creative) => (
              <article key={creative.id} className={styles.ccPane ?? ''}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span className={styles.ccPaneTitle ?? ''}>{creative.format.replace(/_/g, ' ')}</span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {creative.aiGenerated ? <CodeBadge tone="info">AI DRAFT</CodeBadge> : <CodeBadge>HUMAN</CodeBadge>}
                    <CodeBadge
                      tone={creative.status === 'APPROVED' ? 'live' : creative.status === 'REJECTED' ? 'bad' : 'neutral'}
                    >
                      {creative.status.replace(/_/g, ' ')}
                    </CodeBadge>
                  </span>
                </div>

                <p className={styles.ccPaneBody ?? ''}>{creative.concept}</p>

                {creative.hooks.length > 0 ? (
                  <div>
                    <p className={styles.ccPaneTitle ?? ''} style={{ fontSize: 8.5 }}>
                      Hooks
                    </p>
                    <ul className={styles.ccPaneList ?? ''}>
                      {creative.hooks.map((hook) => (
                        <li key={hook}>“{hook}”</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {creative.headline ? (
                  <p className={styles.ccPaneBody ?? ''}>
                    <strong>Headline:</strong> {creative.headline}
                  </p>
                ) : null}
                {creative.primaryText ? (
                  <p className={styles.ccPaneBody ?? ''}>
                    <strong>Primary text:</strong> {creative.primaryText}
                  </p>
                ) : null}
                {creative.cta ? (
                  <p className={styles.ccPaneBody ?? ''}>
                    <strong>CTA:</strong> {creative.cta}
                  </p>
                ) : null}
                {creative.visualPrompt ? (
                  <p className={styles.ccPaneBody ?? ''}>
                    <strong>Visual prompt:</strong> {creative.visualPrompt}
                  </p>
                ) : null}

                {creative.videoScript && creative.videoScript.length > 0 ? (
                  <div>
                    <p className={styles.ccPaneTitle ?? ''} style={{ fontSize: 8.5 }}>
                      Video script
                    </p>
                    <ol className={styles.ccPaneList ?? ''} style={{ paddingLeft: 16, listStyle: 'decimal' }}>
                      {creative.videoScript.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <CodeBadge>{creative.languages.join(' / ')}</CodeBadge>
                  <OriginLabel origin={creative.origin} />
                  <span className={styles.ccMetricMeta ?? ''}>{creative.id}</span>
                </div>

                <div className={styles.ccCommunityActions ?? ''}>
                  <button type="button" className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                    disabled
                    title="Regenerating requires a language-model provider. The KNOuX Agent is unconfigured in this deployment."
                  >
                    Regenerate with KNOuX
                  </button>
                  <button
                    type="button"
                    className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}
                    disabled
                    title="Publishing requires an approved, connected account."
                  >
                    Publish
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      <div style={{ padding: '0 24px 20px' }}>
        <DemoNotice>
          Demo drafts. KNOuX could not generate copy in this deployment because no reasoning provider
          is configured, so the Regenerate control is disabled rather than silently returning
          placeholder text.
        </DemoNotice>
      </div>
    </CommandShell>
  );
}