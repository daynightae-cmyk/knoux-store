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
import { DEMO_CLIENTS } from '@/data/growth/clients';
import type { Client } from '@/lib/growth/types';
import { connectionsFor } from '@/data/growth/connections';

export type WorkspaceContextValue = {
  clients: readonly Client[];
  activeClient: Client;
  setActiveClientId: (id: string) => void;
  /** Platform ids with a stored credential for the active client. */
  connectedPlatformIds: string[];
  /** True when no provider credential exists anywhere for this client. */
  isDemoWorkspace: boolean;
  /** Human-readable reason the workspace has no live data, or null. */
  demoReason: string | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeClientId, setActiveClientId] = useState<string>(DEMO_CLIENTS[0]?.id ?? '');

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeClient = DEMO_CLIENTS.find((client) => client.id === activeClientId) ?? DEMO_CLIENTS[0];

    const connections = activeClient ? connectionsFor(activeClient.id) : [];
    // A platform counts as connected only when a connection record exists AND
    // its state says so. Fixture records never say CONNECTED, so this is empty
    // today — which is the correct reading of a workspace with no credentials.
    const connectedPlatformIds = connections
      .filter((connection) => connection.state === 'CONNECTED')
      .map((connection) => connection.platform);

    const liveAnything = connections.some((connection) => connection.state === 'CONNECTED');

    return {
      clients: DEMO_CLIENTS,
      activeClient,
      setActiveClientId,
      connectedPlatformIds,
      isDemoWorkspace: !liveAnything,
      demoReason: liveAnything
        ? null
        : 'No platform credential is configured for this workspace. Every value shown is a labelled demo fixture.',
    };
  }, [activeClientId]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error('useWorkspace must be used inside a WorkspaceProvider.');
  }
  return value;
}