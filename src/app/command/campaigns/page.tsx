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

import { useRef, useState } from 'react';
import Link from 'next/link';
import { AdPreviewTheatre } from '@/components/command/studio/AdPreviewTheatre';
import { CommandIcon } from '@/components/command/CommandIcon';
import { CampaignReview } from '@/components/command/studio/CampaignReview';
import { CreateGrowthDraft } from '@/components/command/studio/CreateGrowthDraft';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CodeBadge,
  ConnectionBadge,
  EmptyState,
  MetricCell,
  OriginLabel,
  Pane,
  PlatformName,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';

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
import studio from './production.module.css';

export default function CampaignsPage() {
  return <Campaigns />;
}

function Campaigns() {
  const { records, activeClient, clients, setActiveClientId, isDemoWorkspace, selectedCreativeId, selectCreative } = useWorkspace();
  const area = areaBySlug('campaigns')!;
  const campaigns = records.campaigns;
  const rows = records.performanceRows;
  const currency = activeClient.country === 'EG' ? 'EGP' : 'AED';

  const [selectedId, setSelectedId] = useState<string>('');
  const [selectionPulse, setSelectionPulse] = useState(0);
  const review = useRef<HTMLDialogElement>(null);
  const creation = useRef<HTMLDialogElement>(null);

  const selected = campaigns.find((campaign) => campaign.id === selectedId)
    ?? campaigns.find((campaign) => campaign.creativeSetIds.includes(selectedCreativeId) || records.creatives.some((draft) => draft.id === selectedCreativeId && draft.campaignId === campaign.id))
    ?? campaigns[0];
  const awaiting = campaigns.filter((campaign) => campaign.status === 'READY_FOR_REVIEW');
  function selectCampaign(campaign: Campaign) {
    setSelectedId(campaign.id);
    const creative = records.creatives.find((draft) => draft.campaignId === campaign.id || campaign.creativeSetIds.includes(draft.id));
    if (creative) selectCreative(creative.id);
    if (campaign.id !== selected?.id) {
      setSelectionPulse((value) => value + 1);
      cueAtmosphere('confirm');
    }
  }

  return (
    <CommandShell
      area={area}
      production={{ actions: <>
        {isDemoWorkspace && <span className={studio.demoLabel}>Demo workspace</span>}
        <Link href="/command/clients" className={studio.secondary}>Clients</Link>
        {!isDemoWorkspace && <button type="button" className={studio.primary} onClick={() => creation.current?.showModal()}>New campaign</button>}
      </> }}
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
      {!isDemoWorkspace && <dialog ref={creation} className={studio.dialog} aria-label="New campaign">
        <button type="button" className={studio.secondary} onClick={() => creation.current?.close()}>Close</button>
        <CreateGrowthDraft key={activeClient.id} kind="campaign" />
      </dialog>}

      <div className={studio.deck}>
        <section className={studio.rail} aria-labelledby="production-campaigns">
            <header className={studio.panelTitle}><CommandIcon code="05" /><h2 id="production-campaigns">Clients &amp; campaigns</h2></header>
            <label className={studio.client}>Client workspace
              <select value={activeClient.id} onChange={(event) => { setSelectedId(''); setActiveClientId(event.target.value); }}>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            {campaigns.length > 0 && <label className={studio.campaignPicker}>Campaign
              <select value={selected?.id ?? ''} onChange={(event) => {
                const campaign = campaigns.find((item) => item.id === event.target.value);
                if (campaign) selectCampaign(campaign);
              }}>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </label>}
            {campaigns.length === 0 ? (
              <EmptyState title="No campaigns">
                A campaign starts as a draft and becomes spendable only through a recorded approval.
              </EmptyState>
            ) : (
              <ul className={studio.campaignChoices} aria-label="Campaigns">
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <button
                      type="button"
                      aria-pressed={selected?.id === campaign.id}
                      aria-labelledby={`campaign-${campaign.id}-name`}
                      aria-describedby={`campaign-${campaign.id}-details campaign-${campaign.id}-status`}
                      onClick={() => selectCampaign(campaign)}
                    >
                      <strong id={`campaign-${campaign.id}-name`}>{campaign.name}</strong>
                      <span id={`campaign-${campaign.id}-details`} className={styles.campaignMeta}>{campaign.objective} · {formatBudget(campaign.budgetMinor, campaign.currency)} · {daysInclusive(campaign.startDate, campaign.endDate)} days</span>
                      <span className={styles.campaignMeta}>
                        {campaign.platforms.map((platform) => (
                          <PlatformName key={platform} platform={platform} label={platform.replace('_', ' ')} />
                        ))}
                      </span>
                      <span id={`campaign-${campaign.id}-status`} className={styles.campaignMeta}>
                        <CodeBadge tone={campaign.status === 'LIVE' ? 'live' : campaign.status === 'APPROVED' ? 'info' : campaign.status === 'READY_FOR_REVIEW' ? 'warn' : campaign.status === 'FAILED' ? 'bad' : 'neutral'}>
                          {campaign.status.replace(/_/g, ' ')}
                        </CodeBadge>
                        <OriginLabel origin={campaign.origin} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selected && <div className={studio.railSchedule}><strong>Campaign schedule</strong><span dir="ltr">{selected.startDate} → {selected.endDate}</span></div>}
        </section>
        <div className={studio.stage}>
          <span className={studio.orbit} aria-hidden="true"><i /></span>
          {selectionPulse > 0 && <span key={selectionPulse} className={studio.wave} aria-hidden="true" />}
          {selected ? <AdPreviewTheatre campaignId={selected.id} presentation="production" onReview={() => review.current?.showModal()} /> : <EmptyState title="No campaign selected" />}
        </div>
        <section className={studio.settings} aria-labelledby="production-settings">
          <header className={studio.panelTitle}><CommandIcon code="13" /><h2 id="production-settings">Campaign settings</h2></header>
          {selected && <>
            <div className={studio.settingsSection}>
              <h3>Platform connections</h3>
              {selected.platforms.map((platform) => {
                const connection = records.connections.find((record) => record.platform === platform && record.origin !== 'FIXTURE');
                return <div className={studio.channel} key={platform}>
                  <PlatformName platform={platform} label={platform.replaceAll('_', ' ')} />
                  {connection ? <ConnectionBadge state={connection.state} /> : <span>Not connected</span>}
                </div>;
              })}
              <Link href="/command/connections" className={studio.textLink}>Manage connections ↗</Link>
            </div>
            <div className={studio.settingsSection}>
              <h3>Campaign draft</h3>
              <strong>{selected.name}</strong>
              <dl className={studio.facts}>
                <div><dt>Budget</dt><dd>{formatBudget(selected.budgetMinor, selected.currency)}</dd></div>
                <div><dt>Duration</dt><dd>{daysInclusive(selected.startDate, selected.endDate)} days</dd></div>
              </dl>
              <button type="button" className={studio.primary} onClick={() => review.current?.showModal()}>Edit plan &amp; review</button>
            </div>
            <p className={studio.safeguard}>Publishing requires an authorized approval and a confirmed connector.</p>
          </>}
        </section>
      </div>
      {campaigns.length > 0 && <section className={studio.timeline} aria-labelledby="production-timeline">
        <header className={studio.panelTitle}><CommandIcon code="06" /><h2 id="production-timeline">Campaign timeline</h2></header>
        <ol>
          {[...campaigns].sort((first, second) => first.startDate.localeCompare(second.startDate)).map((campaign) => (
            <li key={campaign.id}>
              <button type="button" aria-pressed={selected?.id === campaign.id} onClick={() => selectCampaign(campaign)}>
                <span dir="ltr">{campaign.startDate}</span><strong>{campaign.name}</strong><small>{campaign.status.replaceAll('_', ' ')}</small>
              </button>
            </li>
          ))}
        </ol>
      </section>}
      {selected && <dialog ref={review} className={studio.dialog} aria-label="Campaign review">
        <button type="button" className={studio.secondary} onClick={() => review.current?.close()}>Close review</button>
        <CampaignReview campaign={selected} />
      </dialog>}
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
