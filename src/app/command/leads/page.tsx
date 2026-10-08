'use client';

/**
 * Command Center — Leads & Inbox.
 *
 * A normalised pipeline over leads that arrived legitimately: someone submitted a
 * form, started a WhatsApp conversation, or an operator marked a manually posted
 * community message as having produced an enquiry.
 *
 * There is no enrichment step and no fabricated contact detail anywhere in this
 * product. A lead with no phone has no phone because the form did not collect
 * one, and the row says so rather than showing an empty input pretending to be
 * editable data.
 */

import { useMemo, useState } from 'react';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import { CodeBadge, DemoNotice, EmptyState, OriginLabel, Section } from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';

import { LEAD_STATUSES, type LeadStatus } from '@/lib/growth/types';
import styles from '@/components/command/command.module.css';

export default function LeadsPage() {
  return <Leads />;
}

const STATUS_TONE: Record<LeadStatus, 'live' | 'info' | 'warn' | 'bad' | 'neutral'> = {
  NEW: 'info',
  CONTACTED: 'neutral',
  QUALIFIED: 'live',
  BOOKED: 'live',
  WON: 'live',
  LOST: 'bad',
};

function Leads() {
  const { records, activeClient } = useWorkspace();
  const area = areaBySlug('leads')!;
  const leads = records.leads;
  const currency = activeClient.country === 'EG' ? 'EGP' : 'AED';

  const [status, setStatus] = useState<string>('all');
  const [source, setSource] = useState<string>('all');

  const sources = useMemo(() => [...new Set(leads.map((lead) => lead.source))].sort((a, b) => a.localeCompare(b)), [leads]);

  const filtered = leads
    .filter((lead) => (status === 'all' ? true : lead.status === status))
    .filter((lead) => (source === 'all' ? true : lead.source === source));

  const counts = LEAD_STATUSES.map((entry) => ({
    status: entry,
    count: leads.filter((lead) => lead.status === entry).length,
  }));

  const wonValue = leads
    .filter((lead) => lead.status === 'WON')
    .reduce((sum, lead) => sum + (lead.saleValueMinor ?? 0), 0);

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'leads',
        contextLine: `${activeClient.name} · ${leads.length} lead(s) · ${sources.length} source(s)`,
      }}
      facts={[
        { label: 'Open leads', value: String(leads.filter((lead) => lead.status !== 'WON' && lead.status !== 'LOST').length) },
        { label: 'Won value', value: `${currency} ${(wonValue / 100).toFixed(2)}` },
      ]}
    >
      <div className={styles.commandFilters ?? ''}>
        <label className={styles.ccField ?? ''}>
          <span className={styles.ccFieldLabel ?? ''}>Status</span>
          <select
            className={styles.ccFieldControl ?? ''}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.ccField ?? ''}>
          <span className={styles.ccFieldLabel ?? ''}>Source</span>
          <select
            className={styles.ccFieldControl ?? ''}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="all">All sources</option>
            {sources.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Section title="Pipeline" note="Counts by status. Nothing is inferred from spend.">
        <div className={styles.commandGrid3 ?? ''}>
          {counts.map((entry) => (
            <div key={entry.status} className={styles.ccPane ?? ''}>
              <span className={styles.ccPaneTitle ?? ''}>{entry.status}</span>
              <span style={{ fontSize: 24, color: 'var(--cc-ink)' }}>{entry.count}</span>
              <CodeBadge tone={STATUS_TONE[entry.status]}>{entry.status}</CodeBadge>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Leads" note="Contact fields exist only where the source legitimately collected them.">
        {filtered.length === 0 ? (
          <EmptyState title="No leads match this filter">
            Leads appear when a platform or an operator records an enquiry. Nothing is generated to
            fill this table.
          </EmptyState>
        ) : (
          <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
            <table className={styles.ccTable ?? ''}>
              <thead>
                <tr>
                  <th scope="col">Received</th>
                  <th scope="col">Source</th>
                  <th scope="col">Campaign</th>
                  <th scope="col">Name</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.ccTableNum ?? ''}>Value</th>
                  <th scope="col">Origin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>{lead.occurredAt.slice(0, 10)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <CodeBadge>{lead.source}</CodeBadge>
                        {lead.platform ? <CodeBadge>{lead.platform}</CodeBadge> : null}
                      </span>
                    </td>
                    <td className={styles.ccTableAbsent ?? ''}>{lead.campaignId ?? 'Unattributed'}</td>
                    <td>{lead.name ?? <span className={styles.ccTableAbsent ?? ''}>Not provided</span>}</td>
                    <td>
                      {lead.phone ?? lead.email ? (
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                          {lead.phone ?? lead.email}
                        </span>
                      ) : (
                        <span className={styles.ccTableAbsent ?? ''}>Not collected</span>
                      )}
                    </td>
                    <td>
                      <CodeBadge tone={STATUS_TONE[lead.status]}>{lead.status}</CodeBadge>
                    </td>
                    <td className={styles.ccTableNum ?? ''}>
                      {lead.saleValueMinor !== undefined
                        ? `${lead.currency ?? currency} ${(lead.saleValueMinor / 100).toFixed(2)}`
                        : '—'}
                    </td>
                    <td>
                      <OriginLabel origin={lead.origin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Source attribution" note="Where enquiries actually came from, including manual community posts.">
        <div tabIndex={0} role="group" aria-label="Scrollable table" className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Leads</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Qualified</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Won</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((entry) => {
                const rows = leads.filter((lead) => lead.source === entry);
                return (
                  <tr key={entry}>
                    <td>{entry}</td>
                    <td className={styles.ccTableNum ?? ''}>{rows.length}</td>
                    <td className={styles.ccTableNum ?? ''}>
                      {rows.filter((lead) => lead.qualification === 'QUALIFIED' || lead.qualification === 'HOT').length}
                    </td>
                    <td className={styles.ccTableNum ?? ''}>{rows.filter((lead) => lead.status === 'WON').length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div style={{ padding: '0 24px 20px' }}>
        <DemoNotice>
          Demo leads. Names are placeholders and numbers are in reserved ranges. KNOuX performs no
          enrichment, and no contact detail is ever scraped or inferred.
        </DemoNotice>
      </div>
    </CommandShell>
  );
}
