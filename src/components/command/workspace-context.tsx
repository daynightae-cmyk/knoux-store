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
import type { Client } from '@/lib/growth/types';


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
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children, initialData }: Readonly<{ children: ReactNode; initialData: WorkspaceDataset }>) {
  const clients = initialData.clients;
  const [activeClientId, setActiveClientId] = useState<string>(clients[0]?.id ?? '');

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeClient = clients.find((client) => client.id === activeClientId) ?? clients[0];

    const records = initialData.recordsByClient[activeClient.id];
    const connections = records.connections;
    // A platform counts as connected only when a connection record exists AND
    // its state says so. Fixture records never say CONNECTED, so this is empty
    // today — which is the correct reading of a workspace with no credentials.
    const connectedPlatformIds = connections
      .filter((connection) => connection.state === 'CONNECTED')
      .map((connection) => connection.platform);

    const isDemoWorkspace = initialData.source === 'FIXTURE' || activeClient.origin === 'FIXTURE';

    return {
      clients,
      records,
      activeClient,
      setActiveClientId,
      connectedPlatformIds,
      isDemoWorkspace,
      demoReason: !isDemoWorkspace
        ? null
        : 'This workspace is explicitly DEMO/FIXTURE. Values are demonstration data.',
    };
  }, [activeClientId, clients, initialData]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace must be used inside a WorkspaceProvider.');
  }
  return value;
}
