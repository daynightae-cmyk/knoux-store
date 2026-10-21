'use client';

/**
 * Command Center — workspace context.
 *
 * The selected client is product state, not a URL parameter or a per-page
 * concern: the rail, the context bar, the command dock and every screen below
 * all read it. That is what makes KNOuX contextual — the assistant is told which
 * client workspace it is reasoning about, so it never has to be told in prose.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { WorkspaceDataset, WorkspaceRecords } from '@/lib/growth/persistence/workspace-data';
import type { Client, Campaign } from '@/lib/growth/types';
import { beginEdit, updateEdit, type StudioEdit, type PlacementId } from '@/lib/growth/studio';


export type WorkspaceContextValue = {
  clients: readonly Client[];
  records: WorkspaceRecords;
  activeClient: Client;
  setActiveClientId: (id: string) => void;
  /** Platform ids whose stored connection is verified and unexpired. */
  connectedPlatformIds: string[];
  /** Explicit fixture selection or an imported fixture client. */
  isDemoWorkspace: boolean;
  /** Human-readable reason the workspace has no live data, or null. */
  demoReason: string | null;
  studioEdits: Record<string, StudioEdit>;
  editCreative: (id: string, patch: Parameters<typeof updateEdit>[1]) => void;
  selectedCreativeId: string;
  selectCreative: (id: string) => void;
  placement: PlacementId;
  setPlacement: (id: PlacementId) => void;
  campaignPlans: Campaign[];
  stageCampaign: (id: string, patch: Partial<Campaign>) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children, initialData }: Readonly<{ children: ReactNode; initialData: WorkspaceDataset }>) {
  const clients = initialData.clients;
  const [activeClientId, setActiveClientId] = useState<string>(clients[0]?.id ?? '');
  const [edits, setEdits] = useState<Record<string, StudioEdit>>({});
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [placement, setPlacement] = useState<PlacementId>('instagram-feed');
  const [campaignDrafts, setCampaignDrafts] = useState<Record<string, Campaign>>({});

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeClient = clients.find((client) => client.id === activeClientId) ?? clients[0];

    const records = initialData.recordsByClient[activeClient.id];
    const connections = records.connections;
    // A platform counts as connected only when a connection record exists AND
    // its state says so. Fixture records never say CONNECTED, so this is empty
    // today — which is the correct reading of a workspace with no credentials.
    const connectedPlatformIds = connections
      .filter((connection) => connection.state === 'CONNECTED' && connection.origin !== 'FIXTURE')
      .map((connection) => connection.platform);

    const isDemoWorkspace = initialData.source === 'FIXTURE' || activeClient.origin === 'FIXTURE';

    return {
      clients,
      records,
      activeClient,
      setActiveClientId: (id) => { if (clients.some((client) => client.id === id)) setActiveClientId(id); },
      studioEdits: Object.fromEntries(records.creatives.filter((draft) => draft.clientId === activeClient.id).map((draft) => [draft.id, edits[`${activeClient.id}:${draft.id}`]?.baseUpdatedAt === draft.updatedAt ? edits[`${activeClient.id}:${draft.id}`] : beginEdit(draft, records.campaigns.find((campaign) => campaign.id === draft.campaignId)?.landingPageUrl ?? activeClient.website ?? '')])),
      selectedCreativeId: records.creatives.find((draft) => draft.id === selection[activeClient.id])?.id ?? records.creatives[0]?.id ?? '',
      selectCreative: (id) => { if (records.creatives.some((draft) => draft.id === id && draft.clientId === activeClient.id)) setSelection((previous) => ({ ...previous, [activeClient.id]: id })); },
      placement,
      setPlacement,
      campaignPlans: records.campaigns.map((campaign) => campaignDrafts[`${activeClient.id}:${campaign.id}`] ?? campaign),
      stageCampaign: (id, patch) => {
        const current = records.campaigns.find((campaign) => campaign.id === id && campaign.clientId === activeClient.id);
        if (!current || (patch.clientId && patch.clientId !== activeClient.id)) throw new Error('Cross-client campaign edit refused.');
        setCampaignDrafts((previous) => ({ ...previous, [`${activeClient.id}:${id}`]: { ...(previous[`${activeClient.id}:${id}`] ?? current), ...patch, id, clientId: activeClient.id, status: 'DRAFT', remoteCampaignIds: {} } }));
      },
      editCreative: (id, patch) => {
        const current = records.creatives.find((draft) => draft.id === id && draft.clientId === activeClient.id);
        if (!current) throw new Error('Cross-client creative edit refused.');
        if (patch.creative?.campaignId && !records.campaigns.some((campaign) => campaign.id === patch.creative?.campaignId && campaign.clientId === activeClient.id)) throw new Error('Cross-client campaign assignment refused.');
        setEdits((previous) => {
          const key = `${activeClient.id}:${id}`;
          const edit = previous[key] ?? beginEdit(current, records.campaigns.find((campaign) => campaign.id === current.campaignId)?.landingPageUrl ?? activeClient.website ?? '');
          return { ...previous, [key]: updateEdit(edit, patch, activeClient.id, current) };
        });
      },
      connectedPlatformIds,
      isDemoWorkspace,
      demoReason: !isDemoWorkspace
        ? null
        : 'This workspace is explicitly DEMO/FIXTURE. Values are demonstration data.',
    };
  }, [activeClientId, clients, initialData, edits, selection, placement, campaignDrafts]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace must be used inside a WorkspaceProvider.');
  }
  return value;
}
