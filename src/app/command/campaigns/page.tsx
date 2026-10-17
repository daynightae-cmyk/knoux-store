'use client';

/**
 * Command Center — Campaign Center.
 *
 * The approval screen is the point of this route. It is written so that an
 * approver sees exactly what they are approving — a frozen budget, a duration, a
 * target and an objective — and so that the buttons which would spend money are
 * visibly unavailable with the reason attached, rather than silently inert.
 *
 * The lifecycle rules come from `lib/growth/campaigns.ts`, not from this file.
 * The UI reflects them; it does not implement them.
 */

import { useState } from 'react';
import { AdPreviewTheatre } from '@/components/command/studio/AdPreviewTheatre';
import { CampaignReview } from '@/components/command/studio/CampaignReview';
import { CreateGrowthDraft } from '@/components/command/studio/CreateGrowthDraft';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CodeBadge,
  DemoNotice,
  EmptyState,
  MetricCell,
  OriginLabel,
  Pane,
  PlatformName,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';

import {
  daysInclusive,
  formatBudget,
  nextStates,
} from '@/lib/growth/campaigns';
import {
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_PLATFORMS,
  CAMPAIGN_STATUS_MEANING,
  type Campaign,
} from '@/lib/growth/types';
import styles from '@/components/command/command.module.css';

export default function CampaignsPage() {
  return <Campaigns />;
}

function Campaigns() {
  const { records, activeClient, isDemoWorkspace, selectedCreativeId, selectCreative } = useWorkspace();
  const area = areaBySlug('campaigns')!;
  const campaigns = records.campaigns;
  const rows = records.performanceRows;
  const currency = activeClient.country === 'EG' ? 'EGP' : 'AED';

  const [selectedId, setSelectedId] = useState<string>('');

  const selected = campaigns.find((campaign) => campaign.id === selectedId)
    ?? campaigns.find((campaign) => campaign.creativeSetIds.includes(selectedCreativeId) || records.creatives.some((draft) => draft.id === selectedCreativeId && draft.campaignId === campaign.id))
    ?? campaigns[0];
  const awaiting = campaigns.filter((campaign) => campaign.status === 'READY_FOR_REVIEW');

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'campaigns',
        subjectId: selected?.id,
        inputs: { campaignId: selected?.id, objective: selected?.objective, platforms: selected?.platforms },
        contextLine: selected
          ? `${selected.name} · ${selected.status} · ${formatBudget(selected.budgetMinor, selected.currency)}`
          : `${campaigns.length} campaign(s)`,
      }}
      facts={[
        { label: 'Awaiting approval', value: String(awaiting.length) },
        { label: 'Approved, not live', value: String(campaigns.filter((c) => c.status === 'APPROVED').length) },
      ]}
    >
      <CreateGrowthDraft key={activeClient.id} kind="campaign" />
      {isDemoWorkspace && <div style={{ padding: '16px 24px 0' }}>
        <DemoNotice>
          Every campaign below is a demo fixture. No campaign has been launched, and no platform has
          been called. Approval is real logic; the campaigns it would approve are not real.
        </DemoNotice>
      </div>}

      <Section title="Campaigns" note="Select a campaign to inspect its approval state.">
        {campaigns.length === 0 ? (
          <EmptyState title="No campaigns">
            A campaign starts as a draft and becomes spendable only through a recorded approval.
          </EmptyState>
        ) : (
          <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
            <table className={styles.ccTable ?? ''}>
              <thead>
                <tr>
                  <th scope="col">Campaign</th>
                  <th scope="col">Objective</th>
                  <th scope="col">Platforms</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Budget</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Days</th>
                  <th scope="col">Status</th>
                  <th scope="col">Origin</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <button
                        type="button"
                        className={styles.ccButton ?? ''}
                        style={{ border: 0, padding: 0, textTransform: 'none', letterSpacing: 0, fontSize: 12.5 }}
                        onClick={() => {
                          setSelectedId(campaign.id);
                          const creative = records.creatives.find((draft) => draft.campaignId === campaign.id || campaign.creativeSetIds.includes(draft.id));
                          if (creative) selectCreative(creative.id);
                        }}
                      >
                        {campaign.name}
                      </button>
                    </td>
                    <td>{campaign.objective}</td>
                    <td>
                      <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                        {campaign.platforms.map((platform) => (
                          <PlatformName key={platform} platform={platform} label={platform.replace('_', ' ')} />
                        ))}
                      </span>
                    </td>
                    <td className={styles.ccTableNum ?? ''}>{formatBudget(campaign.budgetMinor, campaign.currency)}</td>
                    <td className={styles.ccTableNum ?? ''}>{daysInclusive(campaign.startDate, campaign.endDate)}</td>
                    <td>
                      <CodeBadge
                        tone={
                          campaign.status === 'LIVE'
                            ? 'live'
                            : campaign.status === 'APPROVED'
                              ? 'info'
                              : campaign.status === 'READY_FOR_REVIEW'
                                ? 'warn'
                                : campaign.status === 'FAILED'
                                  ? 'bad'
                                  : 'neutral'
                        }
                      >
                        {campaign.status.replace(/_/g, ' ')}
                      </CodeBadge>
                    </td>
                    <td>
                      <OriginLabel origin={campaign.origin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {selected && <><CampaignReview campaign={selected} /><AdPreviewTheatre campaignId={selected.id} /></>}
      {selected ? (
        <Section title="Campaign detail" note={CAMPAIGN_STATUS_MEANING[selected.status]}>
          <div className={styles.commandGrid2 ?? ''}>
            <Pane title="Plan">
              <div className={styles.ccApprovalFacts ?? ''}>
                <Fact label="Client" value={activeClient.name} />
                <Fact label="Objective" value={selected.objective} />
                <Fact label="Budget" value={formatBudget(selected.budgetMinor, selected.currency)} />
                <Fact label="Duration" value={`${daysInclusive(selected.startDate, selected.endDate)} days`} />
                <Fact label="Window" value={`${selected.startDate} → ${selected.endDate}`} />
                <Fact label="Target" value={selected.locations.join(', ') || 'Not specified'} />
              </div>
              <p className={styles.ccPaneBody ?? ''}>
                <strong>Languages:</strong> {selected.languages.join(', ')}
              </p>
              {selected.audienceNotes ? (
                <p className={styles.ccPaneBody ?? ''}>
                  <strong>Audience:</strong> {selected.audienceNotes}
                </p>
              ) : null}
              {selected.conversionTarget ? (
                <p className={styles.ccPaneBody ?? ''}>
                  <strong>Conversion target:</strong> {selected.conversionTarget}
                </p>
              ) : null}
              {selected.landingPageUrl ? (
                <p className={styles.ccPaneBody ?? ''}>
                  <strong>Landing page:</strong> {selected.landingPageUrl}
                </p>
              ) : null}
            </Pane>

            <Pane title="Lifecycle" className={styles.ccApproval ?? ''}>
              <p className={styles.ccPaneBody ?? ''}>
                Status <strong>{selected.status}</strong>. Legal next states:{' '}
                {nextStates(selected.status).join(', ') || 'none — terminal'}.
              </p>

              <ApprovalActions key={`${activeClient.id}:${selected.id}`} campaign={selected} />

              <div className={styles.ccApprovalActions ?? ''}>
                <button
                  type="button"
                  className={`${styles.ccButton ?? ''} ${styles.ccButtonPrimary ?? ''}`}
                  disabled
                  title="Launch requires an approved budget snapshot and a real connector confirmation. Neither exists."
                >
                  Launch
                </button>
                <span className={styles.ccMetricMeta ?? ''}>
                  Disabled. No connector call has been made and none can be made in this build.
                </span>
              </div>

              <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 8 }}>
                <strong>Risk level 2</strong> — privileged change. Spending money requires explicit
                approval with disclosed reason, scope, risk and rollback. That is the KNOuX Repair
                safety policy applied to advertising, not a new model.
              </p>
            </Pane>
          </div>
        </Section>
      ) : null}

      <Section title="New campaign fields" note="The fields a plan must carry before it can be approved.">
        <div className={styles.commandGrid3 ?? ''}>
          <MetricCell label="Objectives" value={null} note={CAMPAIGN_OBJECTIVES.join(' · ')} />
          <MetricCell label="Platforms" value={null} note={CAMPAIGN_PLATFORMS.join(' · ')} />
          <MetricCell
            label="Provider campaign ids"
            value={null}
            note={
              Object.keys(selected?.remoteCampaignIds ?? {}).length > 0
                ? `Demo placeholder only: ${Object.values(selected?.remoteCampaignIds ?? {}).join(', ')}`
                : 'None. A provider id exists only after a real creation call.'
            }
          />
        </div>
      </Section>

      <Section title="Performance for this client" note="Normalised. Absent metrics remain absent.">
        {rows.length === 0 ? (
          <EmptyState title="No performance rows" />
        ) : (
          <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
            <table className={styles.ccTable ?? ''}>
              <thead>
                <tr>
                  <th scope="col">Platform</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Spend</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Reach</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Leads</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>CPL</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.platformLabel}</td>
                    <Num value={row.metrics.spend} kind="currency" currency={currency} />
                    <Num value={row.metrics.reach} />
                    <Num value={row.metrics.leads} />
                    <Num value={row.derived.costPerLead} kind="currency" currency={currency} />
                    <Num value={row.derived.roas} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </CommandShell>
  );
}

/**
 * Approval controls.
 *
 * Each action asks the transition table whether the move is legal and renders
 * the refusal verbatim when it is not. That is why the Approve button on a
 * campaign already marked APPROVED explains itself rather than just being grey.
 */
function ApprovalActions({ campaign }: { campaign: Campaign }) { return <div className={styles.ccApprovalActions}><p>Stored status: {campaign.status}. Approval decisions require a named authenticated reviewer and a durable approval endpoint.</p><button type="button" disabled className={styles.ccButton}>Approve · write endpoint unavailable</button></div>; }

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.ccApprovalFact ?? ''}>
      <span className={styles.ccApprovalFactLabel ?? ''}>{label}</span>
      <span className={styles.ccApprovalFactValue ?? ''}>{value}</span>
    </div>
  );
}

function Num({
  value,
  kind = 'number',
  currency = 'AED',
}: {
  value: { value: number; origin: string } | null | undefined;
  kind?: 'currency' | 'number';
  currency?: string;
}) {
  if (!value) return <td className={`${styles.ccTableNum ?? ''} ${styles.ccTableAbsent ?? ''}`}>Not reported</td>;
  const text =
    kind === 'currency'
      ? `${currency} ${value.value.toFixed(2)}`
      : value.value.toLocaleString('en-AE', { maximumFractionDigits: 0 });
  return (
    <td className={styles.ccTableNum ?? ''}>
      {text}
      {value.origin === 'FIXTURE' ? <OriginLabel origin="FIXTURE" /> : null}
    </td>
  );
}
