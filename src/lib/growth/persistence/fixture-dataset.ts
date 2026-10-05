/**
 * KNOuX Growth — the Phase 1 dataset as repository input.
 *
 * Adapts the fixtures that Phase 1 shipped into the `FixtureDataset` shape, so
 * demo mode and the production repository expose one interface. The Phase 1
 * modules are unchanged and still used directly by the screens; this is the
 * persistence-shaped view of the same records.
 *
 * Every value here is a labelled demo fixture. Serving it is a deliberate choice
 * made by setting `KNOUX_GROWTH_DATA_SOURCE=fixture`.
 */

import { DEMO_CLIENTS } from '@/data/growth/clients';
import {
  DEMO_CAMPAIGNS,
  DEMO_CONTENT,
  DEMO_CREATIVES,
  DEMO_LEADS,
  DEMO_PERFORMANCE_ROWS,
} from '@/data/growth/workspace';
import { DEMO_COMMUNITIES, DEMO_DISTRIBUTION_LISTS } from '@/data/growth/communities';
import { DEMO_ACTIVITY, connectionsFor } from '@/data/growth/connections';
import type { FixtureDataset, MetricRow } from './repository';

/** A fixed window wide enough to contain every fixture row. */
export const FIXTURE_WINDOW = {
  periodStart: '2026-01-01',
  periodEnd: '2026-12-31',
} as const;

export function buildFixtureDataset(): FixtureDataset {
  const clientIds = DEMO_CLIENTS.map((client) => client.id);

  const clients: Record<string, Record<string, unknown>> = {};
  for (const client of DEMO_CLIENTS) clients[client.id] = { ...client };

  const campaigns: Record<string, Record<string, unknown>[]> = {};
  const campaignsById: Record<string, Record<string, unknown>> = {};
  for (const campaign of DEMO_CAMPAIGNS) {
    (campaigns[campaign.clientId] ??= []).push({ ...campaign });
    campaignsById[campaign.id] = { ...campaign };
  }

  // Community records are workspace reference data. They are attached to every
  // client rather than to one, because a community is a place rather than a
  // client's property; `clientId` on the row is which workspace is viewing it.
  const communities: Record<string, Record<string, unknown>[]> = {};
  for (const clientId of clientIds) {
    communities[clientId] = DEMO_COMMUNITIES.map((community) => ({ ...community }));
  }

  const leads: Record<string, Record<string, unknown>[]> = {};
  for (const clientId of clientIds) {
    leads[clientId] = DEMO_LEADS.filter((lead) => lead.clientId === clientId).map((lead) => ({
      ...lead,
    }));
  }

  const connections: Record<string, Record<string, unknown>[]> = {};
  for (const clientId of clientIds) {
    connections[clientId] = connectionsFor(clientId).map((connection) => ({ ...connection }));
  }

  /*
   * The performance fixtures are wide — one row per provider, with different
   * metrics present per provider. The repository stores long-format rows, so each
   * populated metric becomes its own row. A metric the provider did not report is
   * simply absent, which is how "not reported" stays distinguishable from zero.
   */
  const metrics: Record<string, (MetricRow & { periodStart: string; periodEnd: string })[]> = {};
  for (const clientId of clientIds) {
    const rows: (MetricRow & { periodStart: string; periodEnd: string })[] = [];
    for (const row of DEMO_PERFORMANCE_ROWS.filter((entry) => entry.clientId === clientId)) {
      for (const [metricKey, sourced] of Object.entries(row.metrics)) {
        if (!sourced) continue;
        const isMoney = metricKey === 'spend' || metricKey === 'revenue';
        rows.push({
          channel: row.platformLabel,
          ...(row.campaignId ? { campaignId: row.campaignId } : {}),
          metricKey,
          value: sourced.value,
          ...(isMoney ? { currency: clientId === 'cl_nile' ? 'EGP' : 'AED' } : {}),
          origin: 'FIXTURE',
          evidence: 'demo fixture, not a provider call',
          periodStart: FIXTURE_WINDOW.periodStart,
          periodEnd: FIXTURE_WINDOW.periodEnd,
        });
      }
    }
    metrics[clientId] = rows;
  }

  const audit: Record<string, Record<string, unknown>[]> = {};
  for (const clientId of clientIds) {
    audit[clientId] = DEMO_ACTIVITY.filter((entry) => entry.clientId === clientId).map((entry) => ({
      ...entry,
    }));
  }

  return { clientIds, clients, campaigns, campaignsById, communities, leads, connections, metrics, audit };
}

/**
 * Content, creative and distribution records, which the repository interface does
 * not yet expose as methods.
 *
 * Returned here rather than dropped so demo mode keeps the Phase 1 screens
 * complete. When these gain repository methods this moves into the interface.
 */
export function buildFixtureSupplementary(clientId: string) {
  return {
    content: DEMO_CONTENT.filter((item) => item.clientId === clientId).map((item) => ({ ...item })),
    creatives: DEMO_CREATIVES.filter((item) => item.clientId === clientId).map((item) => ({ ...item })),
    distributionLists: DEMO_DISTRIBUTION_LISTS.filter((list) => list.clientId === clientId).map(
      (list) => ({ ...list }),
    ),
  };
}