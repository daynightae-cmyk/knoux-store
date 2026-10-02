'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { WorkspaceDialog } from './WorkspaceDialog';
import { useWorkspaceVerification } from './useWorkspaceVerification';
export function WorkspaceCommandPalette({ onClose, onLaunch }: { onClose: () => void; onLaunch: () => void }) {
  const { state, dispatch, refresh } = useBuildWorkspace(); const router = useRouter();
  const [query, setQuery] = useState('');
  const { run, blocker } = useWorkspaceVerification();
  const commands = [
    ...[{ name: 'Open Workspace', href: '/build' }, { name: 'Open Terminal', href: '/build/terminal' }, { name: 'Open PowerShell', href: '/build/powershell' }, { name: 'Open Providers', href: '/build/providers' }].map((c) => ({ name: c.name, blocker: null, run: () => { router.push(c.href); onClose(); } })),
    { name: 'Open Preview', blocker: state.adapter.capabilities['preview.live'] !== 'available' ? state.adapter.blockers['preview.live'] ?? 'A readable runtime is required.' : null, run: () => { dispatch({ type: 'surface/active', surface: 'preview' }); router.push('/build'); onClose(); } },
    ...['New Build', 'Switch Project', 'Import GitHub Repository'].map((name) => ({ name, blocker: null, run: () => { onClose(); onLaunch(); } })),
    { name: 'Refresh Project Facts', blocker: state.access === 'refused' ? 'Sign in to inspect workspace facts.' : null, run: () => { void refresh(); onClose(); } },
    ...['lint', 'typecheck', 'test', 'build'].map((task) => ({ name: `Run ${task === 'test' ? 'Tests' : task}`, blocker: blocker(task), run: () => { void run(task); onClose(); } })),
  ];
  return <WorkspaceDialog title="Command palette" onClose={onClose}><label className="dev-input-label">Search workspace commands<input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search actions…" /></label><div className="dev-command-list">{commands.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).map((c) => <div key={c.name}><button type="button" disabled={!!c.blocker} title={c.blocker ?? c.name} onClick={c.run}>{c.name}<span>↗</span></button>{c.blocker ? <small>{c.blocker}</small> : null}</div>)}</div></WorkspaceDialog>;
}
export function WorkspaceActivity({ onClose }: { onClose: () => void }) {
  const { state } = useBuildWorkspace();
  return <WorkspaceDialog title="Session activity" onClose={onClose}><p className="dev-note">Real events in this browser session · bounded to 60 entries.</p>{state.activity.length ? <ol className="dev-activity">{state.activity.map((event) => <li key={event.id}><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time><span>{event.message}</span></li>)}</ol> : <p>No workspace events have been recorded.</p>}</WorkspaceDialog>;
}
