'use client';

/**
 * Command Center — Analytics.
 *
 * The screen whose hardest job is absence. Providers disagree about what they
 * report: Meta gives reach and no revenue, Google Ads gives revenue and no reach
 * for Search, a Business Profile gives calls and direction requests and no spend.
 *
 * So this table renders "Not reported" rather than 0 for a metric a provider does
 * not supply, and the ROAS column is empty for every Meta row because there is no
 * revenue to divide by. That is the correct rendering, not a gap in the build.
 */

import { useMemo, useState } from 'react';
import { CommandShell } from '@/components/command/CommandShell';
import { areaBySlug } from '@/components/command/navigation';
import {
  DemoNotice,
  EmptyState,
  MetricCell,
  OriginLabel,
  Section,
} from '@/components/command/primitives';
import { useWorkspace } from '@/components/command/workspace-context';
import { performanceRowsFor } from '@/data/growth/workspace';
import { mergeMetrics, PROVIDERS } from '@/lib/growth/metrics';
import type { Sourced } from '@/lib/growth/states';
import styles from '@/components/command/command.module.css';

export default function AnalyticsPage() {
  return <Analytics />;
}

const METRIC_COLUMNS = [
  { key: 'spend', label: 'Spend', kind: 'currency' },
  { key: 'impressions', label: 'Impressions', kind: 'number' },
  { key: 'reach', label: 'Reach', kind: 'number' },
  { key: 'clicks', label: 'Clicks', kind: 'number' },
  { key: 'leads', label: 'Leads', kind: 'number' },
  { key: 'calls', label: 'Calls', kind: 'number' },
  { key: 'whatsappStarts', label: 'WA starts', kind: 'number' },
  { key: 'bookings', label: 'Bookings', kind: 'number' },
  { key: 'revenue', label: 'Revenue', kind: 'currency' },
] as const;

function Analytics() {
  const { activeClient } = useWorkspace();
  const area = areaBySlug('analytics')!;
  const rows = performanceRowsFor(activeClient.id);
  const currency = activeClient.country === 'EG' ? 'EGP' : 'AED';
  const [provider, setProvider] = useState<string>('all');

  const totals = useMemo(() => mergeMetrics(rows.map((row) => row.metrics)), [rows]);
  const filtered = provider === 'all' ? rows : rows.filter((row) => row.platformLabel.toLowerCase().includes(provider));

  return (
    <CommandShell
      area={area}
      dock={{
        surface: 'analytics',
        contextLine: `${activeClient.name} · ${rows.length} provider row(s) · ${PROVIDERS.length} normalisers`,
      }}
      facts={[
        { label: 'Provider rows', value: String(rows.length) },
        { label: 'Currency', value: currency },
      ]}
    >
      <div className={styles.commandFilters ?? ''}>
        <label className={styles.ccField ?? ''}>
          <span className={styles.ccFieldLabel ?? ''}>Provider</span>
          <select
            className={styles.ccFieldControl ?? ''}
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            <option value="all">All providers</option>
            {PROVIDERS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Section
        title="Workspace totals"
        note="A total is only shown when every contributing row reported the metric. A mixed-provenance sum is refused."
      >
        <div className={styles.commandGrid3 ?? ''}>
          {METRIC_COLUMNS.map((column) => (
            <MetricCell
              key={column.key}
              label={column.label}
              kind={column.kind}
              currency={currency}
              value={totals[column.key]}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Cross-platform performance"
        note="Each row is one provider's own vocabulary, normalised to KNOuX's canonical metrics."
      >
        {filtered.length === 0 ? (
          <EmptyState title="No rows for this filter" />
        ) : (
          <div className={styles.ccTableWrap ?? ''}>
            <table className={styles.ccTable ?? ''}>
              <caption>Canonical metrics. A blank cell means the provider did not report it.</caption>
              <thead>
                <tr>
                  <th scope="col">Provider row</th>
                  {METRIC_COLUMNS.map((column) => (
                    <th key={column.key} scope="col" className={styles.ccTableNum ?? ''}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.key}>
                    <td>{row.platformLabel}</td>
                    {METRIC_COLUMNS.map((column) => (
                      <Cell
                        key={column.key}
                        value={row.metrics[column.key]}
                        kind={column.kind}
                        currency={currency}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Derived metrics" note="A ratio is computed only when both inputs exist and the divisor is non-zero.">
        <div className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Provider row</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>CTR</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>CPC</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>CPM</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>ROAS</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Cost / lead</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Cost / qualified</th>
                <th scope="col" className={styles.ccTableNum ?? ''}>Cost / booking</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.key}>
                  <td>{row.platformLabel}</td>
                  <Cell value={row.derived.ctr} kind="percent" />
                  <Cell value={row.derived.cpc} kind="currency" currency={currency} />
                  <Cell value={row.derived.cpm} kind="currency" currency={currency} />
                  <Cell value={row.derived.roas} />
                  <Cell value={row.derived.costPerLead} kind="currency" currency={currency} />
                  <Cell value={row.derived.costPerQualifiedLead} kind="currency" currency={currency} />
                  <Cell value={row.derived.costPerBooking} kind="currency" currency={currency} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Why cells are blank" note="Stated rather than assumed, so an operator can tell a gap from a zero.">
        <div className={styles.ccTableWrap ?? ''}>
          <table className={styles.ccTable ?? ''}>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Reports</th>
                <th scope="col">Does not report</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Meta</td>
                <td>Spend, impressions, reach, clicks, leads, actions</td>
                <td className={styles.ccTableAbsent ?? ''}>
                  Revenue. There is no ROAS input, so ROAS is not computed.
                </td>
              </tr>
              <tr>
                <td>Google Ads</td>
                <td>Spend, impressions, clicks, conversions, conversion value</td>
                <td className={styles.ccTableAbsent ?? ''}>
                  Reach, which has no meaning for Search.
                </td>
              </tr>
              <tr>
                <td>Business Profile</td>
                <td>Clicks, calls, bookings, direction requests</td>
                <td className={styles.ccTableAbsent ?? ''}>
                  Spend, impressions and reach. A profile is not an ad surface.
                </td>
              </tr>
              <tr>
                <td>GA4</td>
                <td>Sessions, page views, key events, revenue</td>
                <td className={styles.ccTableAbsent ?? ''}>Spend, reach, impressions.</td>
              </tr>
              <tr>
                <td>Search Console</td>
                <td>Clicks, impressions</td>
                <td className={styles.ccTableAbsent ?? ''}>Spend, leads, revenue.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div style={{ padding: '0 24px 20px' }}>
        <DemoNotice>
          These rows are demo fixtures. Each carries <OriginLabel origin="FIXTURE" /> provenance, and a
          live row would carry the provider call that produced it instead.
        </DemoNotice>
      </div>
    </CommandShell>
  );
}

function Cell({
  value,
  kind = 'number',
  currency = 'AED',
}: {
  value: Sourced<number> | null | undefined;
  kind?: 'number' | 'currency' | 'percent';
  currency?: string;
}) {
  if (!value) {
    return <td className={`${styles.ccTableNum ?? ''} ${styles.ccTableAbsent ?? ''}`}>Not reported</td>;
  }

  const text =
    kind === 'currency'
      ? `${currency} ${value.value.toFixed(2)}`
      : kind === 'percent'
        ? `${value.value.toFixed(2)}%`
        : value.value.toLocaleString('en-AE', { maximumFractionDigits: 0 });

  return (
    <td className={styles.ccTableNum ?? ''}>
      {text}
      {value.origin === 'FIXTURE' ? <OriginLabel origin="FIXTURE" /> : null}
    </td>
  );
}