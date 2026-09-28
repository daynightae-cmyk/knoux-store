'use client';

import { capabilityResolutions } from '@/lib/build/workspace-state';
import { useBuildWorkspace } from './KnouxBuildWorkspace';

/**
 * The status rail.
 *
 * Every capability the adapter declares, with its real state and the exact
 * requirement when it is not available. This is the surface that makes the
 * whole workspace auditable at a glance: a reader can see what the machine can
 * do and, more importantly, what it cannot and why.
 */
export function WorkspaceStatusRail() {
  const { state } = useBuildWorkspace();
  const resolutions = capabilityResolutions(state);

  const available = resolutions.filter((entry) => entry.status === 'available');
  const blocked = resolutions.filter((entry) => entry.status === 'blocked');
  const unconfigured = resolutions.filter((entry) => entry.status === 'unconfigured');
  const unknown = resolutions.filter((entry) => entry.status === 'unknown');

  return (
    <footer className="bo-statusrail">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="bo-label">Capability ledger</span>
        <span className="bo-status" data-status="pass">{available.length} AVAILABLE</span>
        <span className="bo-status" data-status="blocked">{blocked.length} BLOCKED</span>
        <span className="bo-status" data-status="unconfigured">{unconfigured.length} UNCONFIGURED</span>
        {unknown.length > 0 ? (
          <span className="bo-status" data-status="not-run">{unknown.length} DETECTING</span>
        ) : null}
        {state.error ? (
          <span className="bo-status" data-status="fail">{state.error}</span>
        ) : null}
      </div>

      <div className="bo-statusrail__grid">
        {[...available, ...blocked, ...unconfigured, ...unknown].map((entry) => (
          <div
            className="bo-cap"
            key={entry.capability}
            title={entry.requirement ? `${entry.reason}\n\nRequirement: ${entry.requirement}` : entry.reason}
          >
            <span className="bo-cap__name">{entry.capability}</span>
            <span className="bo-cap__value bo-status" data-status={entry.status}>
              {entry.status === 'available'
                ? 'AVAILABLE'
                : entry.status === 'unconfigured'
                  ? 'UNCONFIGURED'
                  : entry.status === 'unknown'
                    ? 'DETECTING'
                    : 'BLOCKED'}
            </span>
          </div>
        ))}
      </div>

      <p className="bo-blocked__req" style={{ marginTop: 16 }}>
        Capability states come from the project adapter, not from the interface. A control is never rendered as
        working for a capability the adapter reports false, and the adapter exposes no write path at all rather than
        hiding one behind a policy flag.
      </p>
    </footer>
  );
}
