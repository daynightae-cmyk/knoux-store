'use client';

/**
 * Command Center — Overview.
 *
 * The first screen answers three operator questions and refuses to answer a
 * fourth: what needs my decision, what is actually running, and what is not
 * connected. It does not show a vanity total, because a total assembled from
 * fixtures is the first thing that makes an operator trust a number.
 */

import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  CapabilityBadge,
  CodeBadge,
  ConnectionBadge,
  DemoNotice,
  EmptyState,
  MetricCell,
  OriginLabel,
  Pane,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import { campaignsFor, performanceRowsFor } from '@/data/growth/workspace';
import { connectionsFor, activityFor } from '@/data/growth/connections';
import { distributionListsFor } from '@/data/growth/communities';
import { CAMPAIGN_STATUS_MEANING } from '@/lib/growth/types';
import { budgetMajor, daysInclusive } from '@/lib/growth/campaigns';
import type { CanonicalMetrics, PerformanceRow } from '@/lib/growth/types';
import styles from '@/components/command/command.module.css';

export default function OverviewPage() {
  return <Overview />;
}

function Overview() {
  const { activeClient, isDemoWorkspace, demoReason } = useWorkspace();
  const area = areaBySlug('')!;

  const campaigns = campaignsFor(activeClient.id);
  const rows = performanceRowsFor(activeClient.id);
  const connections = connectionsFor(activeClient.id);
  const activity = activityFor(activeClient.id);
  const lists = distributionListsFor(activeClient.id);

  const awaitingApproval = campaigns.filter((campaign) => campaign.status === 'READY_FOR_REVIEW');
  const committedMinor = campaigns
    .filter((campaign) => campaign.status !== 'DRAFT' && campaign.status !== 'CHANGES_REQUESTED')
    .reduce((sum, campaign) => sum + campaign.budgetMinor, 0);
  const currency = activeClient.country === 'EG' ? 'EGP' : 'AED';
  const liveConnections = connections.filter((connection) => connection.state === 'CONNECTED').length;
  const queuedPosts = lists.reduce(
    (sum, list) => sum + list.entries.filter((entry) => entry.status === 'QUEUED').length,
    0,
  );

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'overview',
        contextLine: `${activeClient.name} · ${campaigns.length} campaign(s) · ${connections.length} connection(s)`,
      }}
      facts={[
        { label: 'Awaiting approval', value: String(awaitingApproval.length) },
        { label: 'Committed budget', value: `${currency} ${(committedMinor / 100).toFixed(2)}` },
        { label: 'Queued posts', value: String(queuedPosts) },
      ]}
    >
      {isDemoWorkspace ? (
        <div style={{ padding: '16px 24px 0' }}>
          <DemoNotice>{demoReason}</DemoNotice>
        </div>
      ) : null}

      <Section
        title="Needs your decision"
        note="A plan cannot spend money until a named human approves a frozen budget."
      >
        {awaitingApproval.length === 0 ? (
          <EmptyState title="Nothing awaiting approval">
            When a campaign is submitted for review it appears here with its budget, duration, target
            and objective.
          </EmptyState>
        ) : (
          <div className={styles.commandGrid2 ?? ''}>
            {awaitingApproval.map((campaign) => (
              <Pane key={campaign.id} title={`${campaign.name} · ${campaign.status}`}>
                <p className={styles.ccPaneBody ?? ''}>
                  {CAMPAIGN_STATUS_MEANING[campaign.status]}
                </p>
                <div className={styles.ccApprovalFacts ?? ''}>
                  <Fact label="Budget" value={`${currency} ${budgetMajor(campaign).toFixed(2)}`} />
                  <Fact label="Duration" value={`${daysInclusive(campaign.startDate, campaign.endDate)} days`} />
                  <Fact label="Target" value={campaign.locations.join(', ') || 'Not specified'} />
                  <Fact label="Objective" value={campaign.objective} />
                </div>
                <div className={styles.ccApprovalActions ?? ''}>
                  <a className={styles.ccButton ?? ''} href={`/command/campaigns?campaign=${campaign.id}`}>
                    Open approval
                  </a>
                  <span className={styles.ccMetricMeta ?? ''}>No money has moved</span>
                </div>
              </Pane>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Cross-platform performance"
        note="Normalised across providers. A metric a provider does not report stays unreported."
      >
        {rows.length === 0 ? (
          <EmptyState title="No performance rows">
            Performance appears once a platform connection reports data. Nothing is inferred from
            campaign budget.
          </EmptyState>
        ) : (
          <div className={styles.commandGrid4 ?? ''}>
            <MetricCell
              label="Total spend"
              kind="currency"
              currency={currency}
              value={sumOf(rows, 'spend')}
            />
            <MetricCell label="Impressions" value={sumOf(rows, 'impressions')} />
            <MetricCell label="Clicks" value={sumOf(rows, 'clicks')} />
            <MetricCell label="Leads" value={sumOf(rows, 'leads')} />
            <MetricCell label="Reach" value={sumOf(rows, 'reach')} note="Not all providers report reach" />
            <MetricCell label="WhatsApp starts" value={sumOf(rows, 'whatsappStarts')} />
            <MetricCell label="Bookings" value={sumOf(rows, 'bookings')} />
            <MetricCell
              label="Revenue"
              kind="currency"
              currency={currency}
              value={sumOf(rows, 'revenue')}
              note="Only providers reporting conversion value"
            />
          </div>
        )}
      </Section>

      <Section title="Connection state" note="Truthful states only. Nothing here reads as connected without a credential.">
        <div className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <caption>Platform connections for {activeClient.name}</caption>
            <thead>
              <tr>
                <th scope="col">Platform</th>
                <th scope="col">State</th>
                <th scope="col">Capability</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {connections.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.ccTableAbsent ?? ''}>
                    No connection records for this workspace.
                  </td>
                </tr>
              ) : (
                connections.map((connection) => (
                  <tr key={connection.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <CodeBadge>{connection.platform}</CodeBadge>
                      </span>
                    </td>
                    <td>
                      <ConnectionBadge state={connection.state} />
                    </td>
                    <td>
                      <CapabilityBadge state={connection.capabilityState} />
                    </td>
                    <td className={styles.ccTableAbsent ?? ''}>{connection.lastError ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Activity" note="Every sensitive operation is recorded. Secrets are never recorded.">
        {activity.length === 0 ? (
          <EmptyState title="No recorded activity">
            Connection changes, approvals, budget edits and distributed posts are logged here.
          </EmptyState>
        ) : (
          <ul className={styles.ccTimeline ?? ''}>
            {activity.map((entry) => (
              <li key={entry.id} className={styles.ccTimelineItem ?? ''}>
                <span className={styles.ccTimelineWhen ?? ''}>{entry.at.slice(0, 10)}</span>
                <div className={styles.ccTimelineWhat ?? ''}>
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <CodeBadge tone="info">{entry.action.replace(/_/g, ' ')}</CodeBadge>
                    <span>{entry.actor}</span>
                  </span>
                  {entry.detail ? <p className={styles.ccTimelineDetail ?? ''}>{entry.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className={styles.ccFoot ?? ''}>
        <strong>{liveConnections} of {connections.length}</strong> connections are live. Fixture-sourced
        values on this screen are labelled <OriginLabel origin="FIXTURE" /> at the point of use.
      </p>
    </CommandShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.ccApprovalFact ?? ''}>
      <span className={styles.ccApprovalFactLabel ?? ''}>{label}</span>
      <span className={styles.ccApprovalFactValue ?? ''}>{value}</span>
    </div>
  );
}

/**
 * Sums a canonical metric across rows, refusing to blend provenances.
 *
 * `sumSourced` returns null when the rows disagree about origin, which is
 * correct: a live total containing a fixture component is not a live total.
 */
function sumOf(rows: PerformanceRow[], key: keyof CanonicalMetrics) {
  const values = rows.map((row) => row.metrics[key]);
  const present = values.filter((value) => value != null);
  if (present.length === 0) return null;
  if (present.some((value) => value!.origin !== present[0]!.origin)) return null;

  const origin = present[0]!.origin;
  return {
    value: present.reduce((sum, value) => sum + value!.value, 0),
    origin,
    ...(origin === 'LIVE' ? { evidence: present[0]!.evidence } : {}),
  };
}