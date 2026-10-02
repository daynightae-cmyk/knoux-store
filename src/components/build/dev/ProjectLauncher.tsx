'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BridgeStatus } from '@/lib/build/bridge-config';
import type { GitHubRepository } from '@/lib/build/integration-types';
import type { ProjectSnapshot } from '@/lib/build/types';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { WorkspaceDialog } from './WorkspaceDialog';

export function ProjectLauncher({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useBuildWorkspace();
  const [mode, setMode] = useState<'local' | 'github' | 'connect'>('local');
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [bridgeError, setBridgeError] = useState('Reading trusted bridge status…');
  const [root, setRoot] = useState('.');
  const [repository, setRepository] = useState('');
  const [destination, setDestination] = useState('');
  const [metadata, setMetadata] = useState<GitHubRepository | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { let cancelled = false; void fetch('/api/build/bridge/status', { cache: 'no-store' }).then(async (response) => { const result = await response.json(); if (!cancelled) { if (response.ok) setBridge(result); else setBridgeError(result.message ?? 'Bridge status unavailable.'); } }).catch(() => { if (!cancelled) setBridgeError('Bridge status could not be read.'); }); return () => { cancelled = true; }; }, []);
  const local = !!bridge?.handshake && bridge.reachable && !!bridge.capabilities?.filesystem;
  const blocker = bridge?.blocker ?? bridgeError;
  async function action(kind: 'inspect' | 'resolve' | 'list' | 'import') {
    if (busy) return; setBusy(true); setMessage(null);
    try {
      const url = kind === 'inspect' ? `/api/build/project?project=${encodeURIComponent(root)}` : kind === 'import' ? '/api/build/project/import' : kind === 'list' ? '/api/build/github?list=1' : `/api/build/github?repository=${encodeURIComponent(repository)}`;
      const response = await fetch(url, kind === 'import' ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ repository: metadata?.url, destination, approved }) } : { cache: 'no-store' });
      const result = await response.json() as { snapshot?: ProjectSnapshot; repository?: GitHubRepository; repositories?: GitHubRepository[]; message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Project operation unavailable.');
      if (result.repository) setMetadata(result.repository);
      if (result.repositories) setRepositories(result.repositories);
      if (result.snapshot) {
        dispatch({ type: 'project/activate', path: kind === 'import' ? destination : root, name: result.snapshot.name });
        dispatch({ type: 'activity/record', message: kind === 'import' ? `Repository imported: ${metadata?.fullName}` : `Project selected: ${result.snapshot.name}` });
        onClose();
      }
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Project operation failed.'); }
    finally { setBusy(false); }
  }
  return <WorkspaceDialog title="Project launcher" onClose={onClose}>
    <div className="dev-dialog-tabs" role="group" aria-label="Project source">{(['local', 'github', 'connect'] as const).map((tab) => <button type="button" key={tab} aria-pressed={mode === tab} onClick={() => setMode(tab)}>{tab === 'local' ? 'OPEN EXISTING PROJECT' : tab === 'github' ? 'IMPORT FROM GITHUB' : 'CONNECT REPOSITORY'}</button>)}</div>
    {mode === 'local' ? <><p>Inspect a project inside your paired machine&apos;s configured root. Opening never runs project code.</p><dl className="dev-kv"><dt>Trusted root</dt><dd>{bridge?.handshake?.root ?? 'UNAVAILABLE'}</dd><dt>Machine</dt><dd>{bridge?.handshake?.hostname ?? 'NOT PAIRED'}</dd></dl><label className="dev-input-label">Project folder relative to trusted root<input value={root} onChange={(event) => setRoot(event.target.value)} /></label><button type="button" disabled={!local || busy || !root.trim()} title={!local ? blocker : 'Inspect this project'} onClick={() => void action('inspect')}>{busy ? 'INSPECTING…' : 'INSPECT & OPEN'}</button>{!local ? <p className="dev-note">{blocker} <Link href="/build/settings" onClick={onClose}>Bridge setup ↗</Link></p> : null}<div className="dev-list">{state.recentProjects.map((project) => <button type="button" key={project.path} disabled={!local} onClick={() => { dispatch({ type: 'project/activate', path: project.path, name: project.name }); onClose(); }}>{project.name} · {project.path}</button>)}</div></> : mode === 'github' ? <><p>Resolve real GitHub metadata, then choose a new local folder for a public import.</p><label className="dev-input-label">Public repository URL or owner/repository<input value={repository} onChange={(event) => { setRepository(event.target.value); setMetadata(null); setApproved(false); }} placeholder="owner/repository" /></label><div className="dev-actions"><button type="button" disabled={!repository.trim() || busy} onClick={() => void action('resolve')}>RESOLVE REPOSITORY</button><button type="button" disabled={busy || !state.integrations?.platforms.find((p) => p.id === 'github')?.facts.some((f) => f.name.startsWith('Private') && f.state === 'configured')} title="Requires operator authentication and KNOUX_BUILD_GITHUB_TOKEN" onClick={() => void action('list')}>LIST MY REPOSITORIES</button></div>
      {repositories.length ? <><label className="dev-input-label">Search repositories<input value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="dev-input-label">Owner / organization<input value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} /></label><label className="dev-input-label">Visibility<select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="all">All</option><option value="public">Public</option><option value="private">Private</option></select></label><p className="dev-note">Up to 100 repositories by updated time. Select a repository to resolve its latest commit.</p><div className="dev-list">{repositories.filter((r) => r.fullName.toLowerCase().includes(search.toLowerCase()) && r.owner.toLowerCase().includes(ownerFilter.toLowerCase()) && (visibility === 'all' || r.private === (visibility === 'private'))).map((r) => <button type="button" key={r.fullName} onClick={() => { setRepository(r.fullName); setMetadata(r); setApproved(false); }}>{r.fullName} · {r.private ? 'PRIVATE' : 'PUBLIC'} · {r.language ?? 'UNKNOWN'} · {r.updatedAt}</button>)}</div></> : null}
      {metadata ? <><dl className="dev-kv"><dt>Repository</dt><dd><a href={metadata.url} target="_blank" rel="noreferrer">{metadata.fullName} ↗</a></dd><dt>Visibility</dt><dd>{metadata.private ? 'PRIVATE' : 'PUBLIC'}</dd><dt>Default branch</dt><dd>{metadata.defaultBranch}</dd><dt>Latest commit</dt><dd>{metadata.latestCommit ?? 'UNMEASURED — resolve repository'}</dd><dt>Language</dt><dd>{metadata.language ?? 'UNDECLARED'}</dd><dt>Updated</dt><dd>{metadata.updatedAt}</dd></dl><label className="dev-input-label">New folder inside trusted root<input value={destination} onChange={(e) => setDestination(e.target.value)} /></label><label className="dev-check"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />Approve public clone into this new folder. No install or scripts will run.</label><button type="button" disabled={!local || !bridge?.handshake?.projectImport || metadata.private || !approved || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(destination) || busy} title={metadata.private ? 'Private clone has no secure credential transport.' : !local ? blocker : !bridge?.handshake?.projectImport ? 'Set allowProjectImport=true on the bridge.' : 'Approve clone and choose an unused folder.'} onClick={() => void action('import')}>{busy ? 'IMPORTING…' : 'IMPORT & INSPECT'}</button></> : null}
      <p className="dev-note">{!local ? `CLONE BLOCKED · ${blocker}` : !bridge?.handshake?.projectImport ? 'CLONE BLOCKED · Set allowProjectImport=true in bridge config.' : 'Existing destinations are refused. A failed clone retains its reserved folder for inspection.'}</p>
    </> : <><p>Public repository metadata works in Import from GitHub. An account connection requires server credentials and an operator allowlist.</p><p className="dev-note">REQUIRES AUTHENTICATION · Set KNOUX_BUILD_GITHUB_TOKEN and KNOUX_BUILD_OPERATOR_IDS server-side. A per-user OAuth connection is not configured.</p><button type="button" disabled title="GitHub OAuth client, callback and secure token vault are not configured.">CONNECT GITHUB</button></>}
    {message ? <p role="status" className="dev-note">{message}</p> : null}
  </WorkspaceDialog>;
}
