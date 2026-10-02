import { softwareProducts } from '@/data/software';
import type { BuildWorkspaceState } from '@/lib/build/workspace-state';

/** A display projection of observed facts; no status is promoted to success. */
export function workspaceFacts(state: BuildWorkspaceState) {
  const refused = state.access === 'refused';
  const provider = state.ai.providers.find((item) => item.id === state.ai.providerId);
  const checks = state.verification?.checks ?? [];
  return {
    project: state.project?.name ?? (refused ? 'PROJECT WITHHELD' : 'PROJECT UNAVAILABLE'),
    adapter: refused ? 'SIGN IN REQUIRED' : state.adapter.id === 'pending' ? 'NOT RESOLVED' : state.adapter.label,
    environment: state.adapter.id === 'pending' ? 'UNKNOWN' : state.adapter.environment.toUpperCase(),
    runtime: state.runtime.url ? state.runtime.status.toUpperCase() : 'NO RUNTIME REPORTED',
    provider: provider ? `${provider.displayName} · ${provider.status.toUpperCase()}` : refused ? 'STATE WITHHELD' : 'NO PROVIDER SELECTED',
    verification: checks.length ? `${checks.filter((check) => check.status === 'pass').length}/${checks.length} CHECKS PASS` : 'VERIFICATION NOT RUN',
    deployment: state.adapter.capabilities['deploy.history'] === 'available' ? 'HISTORY NOT READ' : state.adapter.capabilities['deploy.history']?.toUpperCase() ?? 'HISTORY UNKNOWN',
    registryCount: softwareProducts.length,
  };
}
