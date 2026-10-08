import 'server-only';
import type { GrowthRepository, RepositoryResult } from './repository';
import type { WorkspaceDataset, WorkspaceRecords } from './workspace-data';
import { projectClient, projectWorkspace } from './workspace-projection';
import { selectRepository } from './selection';

export async function loadLiveWorkspace(allowedClientIds: readonly string[]): Promise<RepositoryResult<WorkspaceDataset>> {
  const selected = await selectRepository(allowedClientIds, { ...process.env, KNOUX_GROWTH_DATA_SOURCE: 'supabase' });
  if (selected.source === 'unavailable') return { ok: false, failure: selected.failure, message: selected.message };
  return assembleLiveWorkspace(selected.repository);
}

/** No fixture path exists here, including on an empty store, transport error or missing schema. */
export async function assembleLiveWorkspace(repository: GrowthRepository): Promise<RepositoryResult<WorkspaceDataset>> {
  if (!repository.holdsLiveData) return { ok: false, failure: 'FIXTURE_FALLBACK_REFUSED', message: 'Live persistence requires a live repository.' };
  const listed = await repository.listClientIds();
  if (!listed.ok) return listed;
  try {
    const clients = [];
    const recordsByClient: Record<string, WorkspaceRecords> = {};
    for (const clientId of listed.data.value) {
      const storedClient = await repository.getClient(clientId);
      if (!storedClient.ok) return storedClient;
      const client = projectClient(storedClient.data.value);
      const resources = await Promise.all([
        repository.listCampaigns(clientId), repository.listCommunities(clientId), repository.listLeads(clientId),
        repository.listConnections(clientId), repository.listAudit(clientId, 100),
        repository.listWorkspaceRecords(clientId, 'content'), repository.listWorkspaceRecords(clientId, 'creatives'),
        repository.listWorkspaceRecords(clientId, 'collections'), repository.listWorkspaceRecords(clientId, 'distribution'),
        repository.listWorkspaceRecords(clientId, 'automations'),
      ]);
      const keys = ['campaigns', 'communities', 'leads', 'connections', 'activity', 'content', 'creatives', 'collections', 'distribution', 'automations'];
      const data: Record<string, Record<string, unknown>[]> = {};
      for (const [index, result] of resources.entries()) {
        if (!result.ok) return result;
        data[keys[index]] = result.data.value;
      }
      const metrics = await repository.listMetrics(clientId, { periodStart: '1970-01-01', periodEnd: '9999-12-31' });
      if (!metrics.ok) return metrics;
      recordsByClient[clientId] = projectWorkspace(client, data, metrics.data.value);
      client.connectedPlatforms = recordsByClient[clientId].connections.filter(row => row.state === 'CONNECTED').map(row => row.platform);
      clients.push(client);
    }
    return { ok: true, data: { value: { source: 'LIVE', clients, recordsByClient }, meta: { origin: 'LIVE', store: repository.id, stored: true } } };
  } catch {
    return { ok: false, failure: 'QUERY_FAILED', message: 'Stored workspace records could not be projected. Demo data was not substituted.' };
  }
}

/** The public demonstration path is selected separately, before any live query. */
export async function loadDemoWorkspace(): Promise<WorkspaceDataset> {
  const [{ DEMO_CLIENTS }, { campaignsFor, leadsFor, performanceRowsFor, contentFor, creativesFor, locationsFor }, { DEMO_COMMUNITIES, distributionListsFor }, { connectionsFor, activityFor }, { templateRules }] = await Promise.all([
    import('@/data/growth/clients'), import('@/data/growth/workspace'), import('@/data/growth/communities'),
    import('@/data/growth/connections'), import('../automation'),
  ]);
  const recordsByClient: Record<string, WorkspaceRecords> = {};
  for (const client of DEMO_CLIENTS) recordsByClient[client.id] = {
    campaigns: campaignsFor(client.id), communities: [...DEMO_COMMUNITIES],
    leads: leadsFor(client.id), connections: connectionsFor(client.id),
    performanceRows: performanceRowsFor(client.id), activity: activityFor(client.id),
    content: contentFor(client.id), creatives: creativesFor(client.id),
    distributionLists: distributionListsFor(client.id), locations: locationsFor(client.id),
    automations: templateRules(client.id, '2026-10-04T00:00:00.000Z'),
  };
  return { source: 'FIXTURE', clients: [...DEMO_CLIENTS], recordsByClient };
}
