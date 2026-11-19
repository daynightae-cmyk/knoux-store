'use client';

/**
 * Code surface.
 *
 * Reads real files from the deployment through the adapter, with a content
 * path that is validated server-side. Editing is presented honestly: the
 * adapter has no write method, so the editor is read-only and says so, and the
 * Save control is absent rather than present-and-failing.
 *
 * No editor dependency is added. A viewport reading real source is what this
 * surface can truthfully be in the hosted product, and a 1MB editor bundle to
 * render text that cannot be saved would be the opposite of honest.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { Blocked, Empty, Pane, Section, StatusBadge } from '../workspace/Primitives';
import { tokenize } from '@/lib/build/tokenizer';
import type { SourceFileEntry } from '@/lib/build/types';
import { currentWorkspaceVerificationChecks } from '../dev/verification-results';
import styles from '../generator/code-constellation.module.css';

type FileResponse = {
  path: string;
  content: string;
  language: string;
  bytes: number;
  lines: number;
  readOnly: boolean;
  readOnlyReason: string | null;
};
const EMPTY_FILES: SourceFileEntry[] = [];

/** Files a reader actually wants, in a deliberate order. */
function groupFor(role: string): string {
  if (role === 'app-route' || role === 'api-route') return 'Routes';
  if (role === 'component') return 'Components';
  if (role === 'library') return 'Libraries';
  if (role === 'registry') return 'Registries';
  if (role === 'test') return 'Tests';
  if (role === 'manifest') return 'Manifest';
  return 'Other';
}

export function CodeSurface() {
  const { state, dispatch } = useBuildWorkspace();
  const [fileError, setFileError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const paneRef = useRef<HTMLDivElement>(null);
  const fileRequest = useRef<AbortController | null>(null);

  const capabilities = state.adapter.capabilities;
  const currentChecks = currentWorkspaceVerificationChecks(state);
  const files = state.snapshot?.files ?? EMPTY_FILES;
  const loading = !state.snapshot && (state.status === 'idle' || state.status === 'loading');
  const readOnlyReason = state.adapter.blockers['project.write'] ?? null;

  useEffect(() => () => fileRequest.current?.abort(), [state.projectRef]);

  const grouped = useMemo(() => {
    const map = new Map<string, SourceFileEntry[]>();
    const filter = query.trim().toLowerCase();
    for (const file of files) {
      if (filter && !file.path.toLowerCase().includes(filter)) continue;
      const group = groupFor(file.role);
      const list = map.get(group) ?? [];
      list.push(file);
      map.set(group, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [files, query]);

  const open = useCallback(
    async (entry: SourceFileEntry) => {
      fileRequest.current?.abort();
      const controller = new AbortController();
      fileRequest.current = controller;
      setFileError(null);
      try {
        const query = new URLSearchParams({ path: entry.path });
        if (state.projectRef) query.set('project', state.projectRef);
        const response = await fetch(`/api/build/file?${query}`, {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `Reading ${entry.path} responded ${response.status}.`);
        }
        const body = (await response.json()) as FileResponse;
        if (controller.signal.aborted) return;
        dispatch({
          type: 'file/open',
          file: {
            path: body.path,
            language: body.language,
            bytes: body.bytes,
            lines: body.lines,
            role: entry.role,
            content: body.content,
            draft: null,
            readOnly: body.readOnly,
            cursorLine: 1,
            cursorColumn: 1,
          },
        });
      } catch (error) {
        if (!controller.signal.aborted) setFileError(error instanceof Error ? error.message : 'The file could not be read.');
      }
    },
    [dispatch, state.projectRef],
  );

  // Ctrl/Cmd+S must never attempt a write. It says so instead of failing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        setFileError(
          'Save is unavailable: the Build OS ships a read-only project adapter, so no write path exists. Use a connected build service to modify source.',
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selected = state.workspace.openFiles.find(
    (file) => file.path === state.workspace.selectedFilePath,
  );
  const tokenised = useMemo(
    () => (selected ? tokenize(selected.draft ?? selected.content, selected.language) : []),
    [selected],
  );

  if (loading) {
    return <Pane title="Code"><Empty title="Reading tree" body="Waiting for the workspace snapshot." /></Pane>;
  }

  if (capabilities['project.files'] !== 'available') {
    return (
      <Pane title="Code">
        <Blocked
          title="Source unavailable"
          body="This deployment cannot read project files."
          requirement={state.adapter.blockers['project.files']}
        />
      </Pane>
    );
  }

  return (
    <Pane
      title="Code"
      meta={
        <>
          <span>{files.length} FILES</span>
          <StatusBadge status={capabilities['project.write'] === 'available' ? 'available' : 'unavailable'} label={capabilities['project.write'] === 'available' ? 'WRITABLE' : 'READ ONLY'} />
        </>
      }
    >
      <div className={styles.layout}>
        <aside className={styles.tree} aria-label="Project files">
          <div className={styles.fileConstellation} aria-label="File groups in the current filter">
            {grouped.map(([group, entries]) => <span key={group}><i aria-hidden="true" />{group} <small>{entries.length}</small></span>)}
          </div>
          <label className={styles.search}>Filter source files<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          {!grouped.length ? <Empty title="No matching files" body="Try another path from the project snapshot." /> : null}
          {grouped.map(([group, entries]) => (
            <div key={group}>
              <div className="bo-cortex__lane" style={{ padding: '10px 12px 6px' }}>
                <span className="bo-label">{group}</span>
              </div>
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  className="bo-row-btn"
                  aria-current={state.workspace.selectedFilePath === entry.path}
                  style={{
                    display: 'block',
                    padding: '5px 12px',
                    borderBottom: '1px solid color-mix(in srgb, var(--bo-line-faint) 45%, transparent)',
                    background:
                      state.workspace.selectedFilePath === entry.path
                        ? 'color-mix(in srgb, var(--bo-violet) 10%, transparent)'
                        : 'none',
                    color: state.workspace.selectedFilePath === entry.path ? 'var(--bo-ink)' : 'var(--bo-ink-3)',
                    fontSize: 12,
                  }}
                  onClick={() => void open(entry)}
                >
                  {entry.path}
                  <span style={{ color: 'var(--bo-ink-4)', marginLeft: 6, fontSize: 12 }}>
                    {entry.lines}L
                  </span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div ref={paneRef} style={{ minWidth: 0, overflow: 'auto' }}>
          {fileError ? (
            <Blocked
              title="File could not be opened"
              body={fileError}
              requirement="A repository-relative path inside this deployment is required."
            />
          ) : null}
          {!selected && !fileError ? (
            <Empty
              title="No file open"
              body="Choose a file to read the real source that produced this deployment. Lines, bytes and language are measured, not estimated."
            />
          ) : null}
          {selected ? (
            <div>
              <div className="bo-splitbar">
                <span className="bo-label" style={{ color: 'var(--bo-ink-2)' }}>
                  {selected.path}
                </span>
                <span className="bo-status" data-status={selected.readOnly ? 'blocked' : 'available'}>
                  {selected.readOnly ? 'READ ONLY' : 'EDITABLE'}
                </span>
                <span className="bo-status" data-status="not-run">
                  LN {selected.cursorLine} · COL {selected.cursorColumn}
                </span>
                <span className="bo-status" data-status="not-run">
                  {selected.language.toUpperCase()}
                </span>
              </div>
              <Section label="Editor">
                <div className="bo-code" style={{ border: '1px solid var(--bo-line-faint)' }}>
                  <div className="bo-code__gutter" aria-hidden="true">
                    {tokenised.map((_, index) => (
                      <div key={index}>{index + 1}</div>
                    ))}
                  </div>
                  {/* Read-only, so no draft is ever produced and Save stays absent. */}
                  <div className="bo-code__body" role="region" aria-label={`Source of ${selected.path}`} tabIndex={0}>
                    {tokenised.map((tokens, index) => (
                      <span className="bo-code__line" key={index}>
                        {tokens.map((token, tokenIndex) => (
                          <span className={`tok-${token.kind}`} key={tokenIndex}>
                            {token.text}
                          </span>
                        ))}
                        {'\n'}
                      </span>
                    ))}
                  </div>
                </div>
              </Section>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <dl className="bo-kv">
                  <dt>Path</dt>
                  <dd>{selected.path}</dd>
                  <dt>Language</dt>
                  <dd>{selected.language}</dd>
                  <dt>Size</dt>
                  <dd>
                    {selected.lines} lines · {selected.bytes} bytes
                  </dd>
                  <dt>Write capability</dt>
                  <dd>
                    <StatusBadge
                      status={selected.readOnly ? 'blocked' : 'available'}
                      label={selected.readOnly ? 'BLOCKED' : 'AVAILABLE'}
                    />
                  </dd>
                </dl>
                {readOnlyReason ? (
                  <p className="bo-blocked__req">{readOnlyReason}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <aside className={styles.activity} aria-label="Code activity">
          <h3>Workspace activity</h3>
          <dl>
            <dt>Active file</dt><dd>{selected?.path ?? 'None selected'}</dd>
            <dt>Planning state</dt><dd>{state.engineering.stage.replaceAll('_', ' ')}</dd>
            <dt>Project writes</dt><dd>{capabilities['project.write'] === 'available' ? 'Available' : 'Read-only workspace'}</dd>
          </dl>
          <h4>Current checkout verification</h4>
          {currentChecks.length ? <ul>
            {currentChecks.map((check) => <li key={check.id}><strong>{check.label}</strong><span>{check.status}</span></li>)}
          </ul> : <p>No verification belongs to the current clean checkout. Bounded task output is available in Build pipeline.</p>}
        </aside>
      </div>
    </Pane>
  );
}
