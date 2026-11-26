'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { EngineeringContext } from '@/lib/build/engineering-context';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPanel } from './DevUI';
import styles from './operational-v3.module.css';

const AREAS = ['overview', 'agents', 'worktrees', 'projects', 'host', 'capabilities', 'sessions', 'permissions', 'diagnostics'] as const;
const AGENT_PROFILES = ['Architect', 'Builder', 'UI', 'Research', 'Release'] as const;
export type EngineeringArea = (typeof AREAS)[number];
export function EngineeringConsole({ area }: { area: string }) {
  const active: EngineeringArea = AREAS.includes(area as EngineeringArea) ? area as EngineeringArea : 'overview';
  const { state } = useBuildWorkspace();
  const [inspectedAgent, setInspectedAgent] = useState<(typeof AGENT_PROFILES)[number]>('Architect');
  const planningAgent = inspectedAgent === 'Architect';
  const [context, setContext] = useState<EngineeringContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [request, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = AbortSignal.timeout(15_000);
    const signal = AbortSignal.any([controller.signal, timeout]);

    async function measureHost() {
      try {
        const response = await fetch('/api/build/context', { cache: 'no-store', signal });
        if (!response.ok) throw new Error(response.status === 401 ? 'AUTH_REQUIRED · Sign in to inspect the active host.' : 'Host context could not be measured.');
        const value = await response.json();
        if (!controller.signal.aborted) setContext(value);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(timeout.aborted ? 'The active host did not respond within 15 seconds. Refresh to try again.' : cause instanceof Error ? cause.message : 'Context unavailable.');
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }

    void measureHost();
    return () => controller.abort();
  }, [request]);
  const host = context?.host;
  return <div className="dev-route dev-engineering-console"><header className="dev-engineering-head"><span className="dev-mini-label">ENGINEERING / ACTIVE ENVIRONMENT</span><h1>{active.charAt(0).toUpperCase() + active.slice(1)}</h1><p>Measured host and project facts, resolved capabilities, and explicit operating boundaries.</p><span className="dev-engineering-head__detail">{context ? `Last checked ${context.measuredAt}` : 'UNTESTED'}</span></header>
    <nav className="dev-engineering-tabs" aria-label="Engineering areas">{AREAS.map((item) => <Link key={item} aria-current={active === item ? 'page' : undefined} href={`/build/engineering?area=${item}`}>{item}</Link>)}</nav>
    <div className="dev-actions"><button type="button" disabled={busy} onClick={() => { setBusy(true); setError(null); retry((current) => current + 1); }}><span aria-hidden="true">⟳</span>{busy ? 'Measuring…' : 'Refresh host facts'}</button></div>
    {error ? <p role="alert" className="dev-plan-error">{error}</p> : null}
    {active === 'host' || active === 'overview' ? <DevPanel title="Viewing — Active Host"><dl className="dev-kv"><dt>Identity</dt><dd>{host?.name ?? 'UNKNOWN'} · {host?.kind ?? 'UNTESTED'}</dd><dt>OS / architecture</dt><dd>{host?.os ?? 'UNKNOWN'} / {host?.architecture ?? 'UNKNOWN'}</dd><dt>CPU</dt><dd>{host?.cpu ?? 'UNKNOWN'} · {host?.cores ?? 'UNKNOWN'} cores</dd><dt>RAM</dt><dd>{host ? `${(host.ramBytes / 2 ** 30).toFixed(1)} GiB total / ${(host.freeRamBytes / 2 ** 30).toFixed(1)} GiB free` : 'UNKNOWN'}</dd><dt>Disk</dt><dd>{host?.disk ? `${(host.disk.totalBytes / 2 ** 30).toFixed(1)} GiB total / ${(host.disk.freeBytes / 2 ** 30).toFixed(1)} GiB free` : 'UNKNOWN'}</dd><dt>Node</dt><dd>{host?.node ?? 'UNKNOWN'}</dd><dt>Project root</dt><dd>{host?.root ?? 'UNKNOWN'}</dd></dl><div className="dev-list">{context?.tools.filter((tool) => tool.category === 'runtime').map((tool) => <div key={tool.id}><span><strong>{tool.label}</strong><small>{tool.binary ?? 'No executable detected in PATH'}</small></span><span>{tool.state} · {tool.version ?? 'VERSION UNKNOWN'}</span></div>)}</div><p className="dev-note">These facts describe the server handling this request. A local machine is a separate host and requires an authenticated paired Bridge.</p></DevPanel> : null}
    {active === 'agents' ? <>
      <DevPanel title="Logical agent profiles">
        <div className={styles.agentLayout}>
          <div className={styles.agentDirectory} role="group" aria-label="Inspect agent profile">
            {AGENT_PROFILES.map((name) => <button type="button" key={name} aria-pressed={inspectedAgent === name} onClick={() => setInspectedAgent(name)}>
              <strong>KNOuX {name}</strong><small>{name === 'Architect' ? 'PLANNING' : 'UNAVAILABLE'}</small>
            </button>)}
          </div>
          <article className={styles.agentProfile} aria-label="Selected agent evidence">
            <span className="dev-mini-label">{planningAgent ? 'CANONICAL PLANNER' : 'LOGICAL PROFILE'}</span>
            <h2>KNOuX {inspectedAgent}</h2>
            <dl className="dev-kv">
              <dt>Provider / model</dt><dd>{planningAgent ? (state.engineering.selection ? `${state.engineering.selection.providerId} / ${state.engineering.selection.modelId}` : 'Resolved per planning request') : 'UNBOUND'}</dd>
              <dt>Project</dt><dd>{state.project?.name ?? 'NOT CONNECTED'}</dd>
              <dt>Worktree</dt><dd>{state.project?.root ?? 'NOT CONNECTED'}</dd>
              <dt>Tools / MCP / plugins / skills</dt><dd>No connected capability binding</dd>
              <dt>Shell / browser / Git writes</dt><dd>Trusted executor approval required</dd>
              <dt>Execution</dt><dd>{planningAgent ? 'Planning available when a provider resolves' : 'AGENT_UNAVAILABLE'}</dd>
            </dl>
            <div className="dev-actions">
              {planningAgent ? <Link href="/build">Open planning workspace ↗</Link> : null}
              <Link href="/build/engineering?area=permissions">Inspect permissions ↗</Link>
            </div>
          </article>
        </div>
      </DevPanel>
      <DevPanel title="Detected CLI tooling"><div className="dev-list">{context?.tools.filter((tool) => tool.category === 'agent').map((tool) => <div key={tool.id}><span><strong>{tool.label}</strong><small>{tool.binary ?? 'Discovery target · absent from PATH'}</small></span><span>{tool.state} · {tool.version ?? 'VERSION UNKNOWN'} · auth {tool.authenticated}</span></div>)}</div><p className="dev-note">Detection proves a binary exists. It does not prove login, permissions, generation, agent execution or a connection to this workspace. Fallback selection is recorded by the canonical provider router.</p></DevPanel></> : null}
    {active === 'worktrees' || active === 'projects' ? <DevPanel title="Repository worktrees"><p>{context?.worktreeCount ?? 'UNKNOWN'} registered worktrees · read-only inspection · no recovery cleanup</p>{context?.worktreeBlocker ? <p>{context.worktreeBlocker}</p> : null}<div className="dev-worktree-list">{context?.worktrees.map((tree) => <article key={tree.path}><h2>{tree.branch ?? 'Detached HEAD'}</h2><p>{tree.path}</p><dl className="dev-kv"><dt>Repository / HEAD</dt><dd>{tree.repository} / {tree.head ?? 'UNKNOWN'}</dd><dt>Dirty / untracked</dt><dd>{tree.dirtyFiles ?? 'UNKNOWN'} / {tree.untracked ?? 'UNKNOWN'}</dd><dt>Ahead / behind upstream</dt><dd>{tree.ahead ?? 'UNKNOWN'} / {tree.behind ?? 'UNKNOWN'}</dd><dt>Last commit</dt><dd>{tree.lastCommitAt ?? 'UNKNOWN'}</dd><dt>Linked task / agent</dt><dd>UNKNOWN / UNKNOWN</dd><dt>State</dt><dd>{tree.state}{tree.locked ? ' · LOCKED' : ''}{tree.prunable ? ' · Git reports prunable; preserved' : ''}</dd></dl><p className="dev-note">Opening another checkout or its editor requires a paired host capability. No local application launch adapter is connected.</p>{tree.path.replaceAll('\\', '/') === host?.root.replaceAll('\\', '/') ? <div className="dev-actions"><Link href="/build/docs">Inspect current files ↗</Link><Link href="/build/terminal">Open terminal surface ↗</Link></div> : null}</article>)}</div></DevPanel> : null}
    {active === 'capabilities' ? <DevPanel title="MCP · Plugins · Skills"><DevEmpty title="EXECUTOR_NOT_CONNECTED" body="No authenticated capability inventory adapter is connected to KNOuX Build. The assistant's own integrations are not application capabilities." /><dl className="dev-kv"><dt>Source</dt><dd>{context?.capabilities.source ?? 'UNTESTED'}</dd><dt>Installed / connected / authenticated</dt><dd>UNKNOWN / UNKNOWN / UNKNOWN</dd><dt>Version / permissions / supported actions</dt><dd>UNKNOWN</dd><dt>Last inventory check</dt><dd>{context?.measuredAt ?? 'UNTESTED'}</dd></dl><Link href="/build/providers">Inspect actual platform adapters ↗</Link></DevPanel> : null}
    {active === 'sessions' ? <DevPanel title="Current workspace session"><p>No durable agent session store is connected. Only events measured in this browser session appear below.</p><ol className="dev-activity">{state.activity.map((event) => <li key={event.id}><time dateTime={event.at}>{event.at}</time><span>{event.message}</span></li>)}</ol>{!state.activity.length ? <DevEmpty title="NO RECORDED ACTIVITY" body="No agent or project operation has been recorded in this browser session." /> : null}<Link href="/build/ai/usage">Actual runtime usage ↗</Link></DevPanel> : null}
    {active === 'permissions' ? <DevPanel title="Permission boundary"><dl className="dev-kv"><dt>Planning</dt><dd>Read-only proposal and provider generation</dd><dt>File / Git / shell / install / deployment</dt><dd>Trusted executor capability and explicit approval</dd><dt>Recovery deletion / reset / prune / force</dt><dd>No automatic actions; no destructive control exposed</dd><dt>Public deployment source</dt><dd>Never writable through a planning request</dd></dl>{state.permissions.decisions.map((decision) => <p key={decision.actionId}>{decision.at} · {decision.approved ? 'Approved' : 'Refused'} · {decision.reason}</p>)}</DevPanel> : null}
    {active === 'diagnostics' ? <DevPanel title="Measured diagnostics">{state.diagnostics.length ? state.diagnostics.map((item) => <p key={item.id}>{item.message}</p>) : <DevEmpty title="NOT RUN" body="No lint, typecheck or test diagnostics have been collected in this session." />}<Link href="/build/pipeline">Run available verification ↗</Link></DevPanel> : null}
  </div>;
}
