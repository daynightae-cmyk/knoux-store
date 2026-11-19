'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import styles from './operational-v3.module.css';

const DOCS = [
  { label: 'Integration setup', path: 'docs/build/INTEGRATION_SETUP.md', group: 'SETUP' },
  { label: 'Interaction matrix', path: 'docs/build/BUILD_INTERACTION_MATRIX.md', group: 'EVIDENCE' },
  { label: 'Project README', path: 'README.md', group: 'PROJECT' },
  { label: 'KNOuX DEV reference map', path: 'references/dev/REFERENCE_MAP.md', group: 'DEV WORKSPACE' },
  { label: 'Build OS architecture', path: 'references/build/KNOuX_BUILD_OS_ARCHITECTURE.md', group: 'BUILD OS' },
  { label: 'Build OS capability matrix', path: 'references/build/KNOuX_BUILD_OS_CAPABILITY_MATRIX.md', group: 'BUILD OS' },
  { label: 'Build OS verification', path: 'references/build/KNOuX_BUILD_OS_VERIFICATION.md', group: 'BUILD OS' },
  { label: 'Reference implementation audit', path: 'references/REFERENCE_IMPLEMENTATION_AUDIT.md', group: 'EVIDENCE' },
  { label: 'QA closure', path: 'references/QA_CLOSURE.md', group: 'EVIDENCE' },
];

export function DocsPage() {
  const { state } = useBuildWorkspace();
  const docs = state.snapshot ? state.snapshot.files.filter((file) => file.path.endsWith('.md') && /^(README\.md|AGENTS\.md|docs\/|references\/)/.test(file.path)).map((file) => ({ label: file.path, path: file.path, group: 'PROJECT FILE' })) : DOCS;
  const params = useSearchParams();
  const requested = params.get('file');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [result, setResult] = useState<{ path: string; project: string | null; content?: string; error?: string } | null>(null);
  const [query, setQuery] = useState('');
  const selected = docs.find((doc) => doc.path === selectedPath) ?? docs.find((doc) => doc.path === requested) ?? docs[0] ?? DOCS[0];
  const document = result?.path === selected.path && result.project === state.projectRef ? result : null;
  useEffect(() => {
    const request = new AbortController();
    const timeout = AbortSignal.timeout(25_000);
    void fetch(`/api/build/file?path=${encodeURIComponent(selected.path)}${state.projectRef ? '&project=' + encodeURIComponent(state.projectRef) : ''}`, { cache: 'no-store', signal: AbortSignal.any([request.signal, timeout]) }).then(async (response) => {
      if (!response.ok) throw new Error(`Document unavailable (${response.status})`);
      return response.json() as Promise<{ content: string }>;
    }).then((file) => { if (!request.signal.aborted) setResult({ path: selected.path, project: state.projectRef, content: file.content }); }).catch((cause) => { if (!request.signal.aborted) setResult({ path: selected.path, project: state.projectRef, error: timeout.aborted ? 'The document request timed out.' : cause instanceof Error ? cause.message : 'Document unavailable' }); });
    return () => request.abort();
  }, [selected.path, state.projectRef]);
  return <div className={`dev-route ${styles.page} ${styles.docs}`} data-reduced={state.preferences.motion === 'reduced' ? '' : undefined}><DevPageHeading eyebrow="DOCS / KNOWLEDGE" title="Documentation" description="Read files that exist in this project checkout. Contents come from the read-only project adapter." detail={`${docs.length} indexed documents`} /><div className="dev-docs-grid"><DevPanel title="Document index"><label className="dev-search-label" htmlFor="dev-doc-search">SEARCH INDEX</label><input id="dev-doc-search" className="dev-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a document…" /><div className="dev-list dev-list--select">{docs.filter((doc) => `${doc.label} ${doc.path}`.toLowerCase().includes(query.toLowerCase())).map((doc) => <button type="button" key={doc.path} className={selected.path === doc.path ? 'dev-list--selected' : ''} aria-pressed={selected.path === doc.path} onClick={() => setSelectedPath(doc.path)}><span><strong>{doc.label}</strong><small>{doc.group}</small></span><span>↗</span></button>)}</div></DevPanel><DevPanel title={selected.label}><div className="dev-doc-meta">{selected.path} · READ ONLY</div>{document?.error ? <DevEmpty title="DOCUMENT UNAVAILABLE" body={document.error} /> : document?.content === undefined ? <p className="dev-note">Reading document…</p> : <pre className="dev-doc-content" style={{ whiteSpace: state.preferences.editorWrap ? 'pre-wrap' : 'pre' }}>{document.content}</pre>}</DevPanel></div></div>;
}
