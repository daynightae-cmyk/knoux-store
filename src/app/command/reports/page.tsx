'use client';

/**
 * Command Center — Reports.
 *
 * A client-facing report, print-ready. The print stylesheet in the module strips
 * the rail, the dock and the context bar, so `Cmd-P` produces a clean document
 * rather than a screenshot of an application.
 *
 * The report shows its own provenance in the footer. A report is the artefact a
 * client is most likely to forward, so it is the last place where an unqualified
 * number would do the most damage.
 */

import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import { CodeBadge, DemoNotice, EmptyState, OriginLabel, Section } from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';


import { formatBudget, daysInclusive } from '@/lib/growth/campaigns';
import { LEAD_STATUSES } from '@/lib/growth/types';
import styles from '@/components/command/command.module.css';

export default function ReportsPage() {
  return <Reports />;
}

function Reports() {
  const { records, activeClient } = useWorkspace();
  const area = areaBySlug('reports')!;

  const campaigns = records.campaigns;
  const rows = records.performanceRows;
  const leads = records.leads;
  const content = records.content;
  const creatives = records.creatives;
  const locations = records.locations;
  const lists = records.distributionLists;
  const currency = activeClient.country === 'EG' ? 'EGP' : 'AED';

  const committed = campaigns
    .filter((campaign) => campaign.status !== 'DRAFT')
    .reduce((sum, campaign) => sum + campaign.budgetMinor, 0);

  const distributed = lists.reduce(
    (sum, list) => sum + list.entries.filter((entry) => entry.status === 'POSTED').length,
    0,
  );

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'reports',
        contextLine: `${activeClient.name} · ${activeClient.city} · reporting period not set`,
      }}
      facts={[
        { label: 'Committed', value: campaigns.length ? formatBudget(committed, currency) : 'No accessible campaign budgets' },
        { label: 'Locations', value: String(locations.length) },
      ]}
    >
      <div style={{ padding: '16px 24px 0' }}>
        <DemoNotice>
          This report is assembled from demo fixtures and is not shareable as a client deliverable
          until a platform connection provides verified data.
        </DemoNotice>
      </div>

      <Section title="Campaign performance" note="Every figure carries its provenance.">
        {rows.length === 0 ? (
          <EmptyState title="Nothing to report">
            A report needs provider data. Nothing is estimated from campaign budget.
          </EmptyState>
        ) : (
          <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
            <table className={styles.ccTable ?? ''}>
              <thead>
                <tr>
                  <th scope="col">Channel</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Spend</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Impressions</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Reach</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Leads</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>CPL</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>ROAS</th>
                  <th scope="col">Provenance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.platformLabel}</td>
                    <Money value={row.metrics.spend} currency={currency} />
                    <ReportNumber value={row.metrics.impressions} />
                    <ReportNumber value={row.metrics.reach} />
                    <ReportNumber value={row.metrics.leads} />
                    <Money value={row.derived.costPerLead} currency={currency} />
                    <ReportNumber value={row.derived.roas} />
                    <td>
                      <OriginLabel origin={row.metrics.spend?.origin ?? 'FIXTURE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Lead quality" note="Source attribution across every channel.">
        <div className={styles.commandGrid4 ?? ''}>
          {LEAD_STATUSES.map((status) => (
            <div key={status} className={styles.ccMetric ?? ''}>
              <span className={styles.ccMetricLabel ?? ''}>{status}</span>
              <span className={styles.ccMetricValue ?? ''}>
                {leads.filter((lead) => lead.status === status).length}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Community distribution" note="Manual-assisted posting, counted from operator confirmations.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">List</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Destinations</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Marked posted</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Awaiting approval</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Skipped</th>
              </tr>
            </thead>
            <tbody>
              {lists.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.ccTableAbsent ?? ''}>
                    No distribution lists for this client.
                  </td>
                </tr>
              ) : (
                lists.map((list) => (
                  <tr key={list.id}>
                    <td>{list.name}</td>
                    <td className={styles.ccTableNum ?? ''}>{list.communityIds.length}</td>
                    <td className={styles.ccTableNum ?? ''}>
                      {list.entries.filter((entry) => entry.status === 'POSTED').length}
                    </td>
                    <td className={styles.ccTableNum ?? ''}>
                      {list.entries.filter((entry) => entry.status === 'NEEDS_APPROVAL').length}
                    </td>
                    <td className={styles.ccTableNum ?? ''}>
                      {list.entries.filter((entry) => entry.status === 'SKIPPED').length}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.ccPaneBody ?? ''} style={{ marginTop: 8, fontSize: 12 }}>
          {distributed} post(s) confirmed as distributed by an operator. KNOuX posts nothing itself.
        </p>
      </Section>

      <Section title="Content output" note="Volume only. Quality is not scored here.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Content items</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Creative drafts</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Awaiting approval</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{activeClient.name}</td>
                <td className={styles.ccTableNum ?? ''}>{content.length}</td>
                <td className={styles.ccTableNum ?? ''}>{creatives.length}</td>
                <td className={styles.ccTableNum ?? ''}>
                  {content.filter((item) => item.status === 'APPROVAL_REQUIRED').length}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Campaign ledger" note="Committed budget by plan.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Campaign</th>
                <th scope="col">Objective</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Budget</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Days</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td>{campaign.name}</td>
                  <td>{campaign.objective}</td>
                  <td className={styles.ccTableNum ?? ''}>{formatBudget(campaign.budgetMinor, campaign.currency)}</td>
                  <td className={styles.ccTableNum ?? ''}>
                    {daysInclusive(campaign.startDate, campaign.endDate)}
                  </td>
                  <td>
                    <CodeBadge>{campaign.status.replace(/_/g, ' ')}</CodeBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Report options" note="Formats the product supports.">
        <div className={styles.commandGrid3 ?? ''}>
          <div className={styles.ccPane ?? ''}>
            <span className={styles.ccPaneTitle ?? ''}>Web report</span>
            <p className={styles.ccPaneBody ?? ''}>This view. Readable in English and Arabic.</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <CodeBadge tone="live">AVAILABLE</CodeBadge>
            </div>
          </div>
          <div className={styles.ccPane ?? ''}>
            <span className={styles.ccPaneTitle ?? ''}>Print / PDF</span>
            <p className={styles.ccPaneBody ?? ''}>
              The print stylesheet removes the rail, the dock and the context bar, so a browser print
              yields a clean document.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <CodeBadge tone="live">AVAILABLE</CodeBadge>
              <button type="button" onClick={() => window.print()} className={`${styles.ccButton ?? ''} ${styles.ccButtonSm ?? ''}`}>
                Print
              </button>
            </div>
          </div>
          <div className={styles.ccPane ?? ''}>
            <span className={styles.ccPaneTitle ?? ''}>Shareable client view</span>
            <p className={styles.ccPaneBody ?? ''}>
              Requires an authenticated client role bound to exactly this client. Not built.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <CodeBadge tone="warn">NOT BUILT</CodeBadge>
            </div>
          </div>
        </div>
      </Section>

      <p className={styles.ccFoot ?? ''}>
        <strong>Report provenance.</strong> Values above are{' '}
        <OriginLabel origin="FIXTURE" /> unless a cell is marked otherwise. A blank numeric cell means
        the provider did not report that metric — not zero.
      </p>
    </CommandShell>
  );
}

function Money({
  value,
  currency,
}: {
  value: { value: number; origin: string } | null | undefined;
  currency: string;
}) {
  if (!value) return <td className={`${styles.ccTableNum ?? ''} ${styles.ccTableAbsent ?? ''}`}>Not reported</td>;
  return (
    <td className={styles.ccTableNum ?? ''}>
      {currency} {value.value.toFixed(2)}
    </td>
  );
}

function ReportNumber({ value }: { value: { value: number; origin: string } | null | undefined }) {
  if (!value) return <td className={`${styles.ccTableNum ?? ''} ${styles.ccTableAbsent ?? ''}`}>Not reported</td>;
  return (
    <td className={styles.ccTableNum ?? ''}>{value.value.toLocaleString('en-AE', { maximumFractionDigits: 2 })}</td>
  );
}
