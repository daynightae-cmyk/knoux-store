'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { Blocked, Empty, Pane, Section, StatusBadge } from '../workspace/Primitives';
import { changedLineRange } from '@/lib/build/source-diff';
import { tokenize } from '@/lib/build/tokenizer';
import type { ProjectFileDocument, ProjectFileSaveReceipt, ProjectFileSaveRequest, SourceFileEntry } from '@/lib/build/types';
import { currentWorkspaceVerificationChecks } from '../dev/verification-results';
import styles from '../generator/code-constellation.module.css';

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
  const saveRequest = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<{project: string; path: string; hash: string; content: string} | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const capabilities = state.adapter.capabilities;
  const currentChecks = currentWorkspaceVerificationChecks(state);
  const files = state.snapshot?.files ?? EMPTY_FILES;
  const loading = !state.snapshot && (state.status === 'idle' || state.status === 'loading');
  const readOnlyReason = state.adapter.blockers['project.write'] ?? null;

  useEffect(() => () => {
    fileRequest.current?.abort();
    saveRequest.current?.abort();
  }, [state.projectRef]);

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
      if (saveRequest.current) return;
      fileRequest.current?.abort();
      const controller = new AbortController();
      fileRequest.current = controller;
      setFileError(null);
      setReview(null);
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
        const body = (await response.json()) as ProjectFileDocument;
        if (controller.signal.aborted) return;
        setSaveError(null);
        dispatch({
          type: 'file/open',
          keepDraft: true,
          file: {
            path: body.path,
            language: body.language,
            bytes: body.bytes,
            lines: body.lines,
            role: entry.role,
            content: body.content,
            draft: null,
            readOnly: body.readOnly,
            hash: body.hash,
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

  const selected = state.workspace.openFiles.find(
    (file) => file.path === state.workspace.selectedFilePath,
  );
  const canEdit = Boolean(state.projectRef && selected?.hash && !selected.readOnly
    && capabilities['project.write'] === 'available');
  const confirmedReview = review && selected && review.project === state.projectRef
    && review.path === selected.path && review.hash === selected.hash && review.content === selected.draft
    ? review : null;

  async function save() {
    if (!canEdit || !confirmedReview || saveRequest.current) return;
    const { project, path, hash, content } = confirmedReview;
    const controller = new AbortController();
    saveRequest.current = controller;
    setSaving(true);
    setSaveError(null);
    const input: ProjectFileSaveRequest = { path, content, expectedHash: hash };
    const query = new URLSearchParams({ project });
    try {
      const response = await fetch('/api/build/file?' + query, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]),
      });
      const result = await response.json().catch(() => null) as (ProjectFileSaveReceipt & { message?: string }) | null;
      if (controller.signal.aborted) return;
      if (!response.ok || !result?.ok || !/^[a-f0-9]{64}$/.test(result.hash) || !Number.isSafeInteger(result.bytes)) {
        throw new Error(result?.message ?? 'Save could not be confirmed. Reload and compare before retrying.');
      }
      dispatch({ type: 'file/saved', projectRef: project, ...input, hash: result.hash, bytes: result.bytes });
      setReview(null);
    } catch (error) {
      if (!controller.signal.aborted) {
        setReview(null);
        setSaveError(error instanceof Error ? error.message : 'Save could not be confirmed.');
      }
    } finally {
      saveRequest.current = null;
      setSaving(false);
    }
  }

  const tokenised = useMemo(
    () => (selected ? tokenize(selected.draft ?? selected.content, selected.language) : []),
    [selected],
  );
  const diff = useMemo(
    () => confirmedReview && selected ? changedLineRange(selected.content, confirmedReview.content) : null,
    [confirmedReview, selected],
  );

  function reviewChanges() {
    if (canEdit && !saving && !saveError && state.projectRef && selected?.hash && selected.draft !== null) {
      setReview({ project: state.projectRef, path: selected.path, hash: selected.hash, content: selected.draft });
    }
  }

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
                {canEdit ? (
                  <>
                    <textarea
                      aria-label={'Edit ' + selected.path}
                      className="bo-code__body"
                      rows={18}
                      value={selected.draft ?? selected.content}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                          event.preventDefault();
                          reviewChanges();
                        }
                      }}
                      onChange={(event) => {
                        setReview(null);
                        dispatch({ type: 'file/draft', path: selected.path, draft: event.target.value === selected.content ? null : event.target.value });
                      }}
                    />
                    <button type="button" disabled={selected.draft === null || saving || Boolean(saveError)} onClick={reviewChanges}>
                      Review changes
                    </button>
                    {saveError ? <p role="alert">{saveError}</p> : null}
                    {saveError ? <button type="button" onClick={() => void open(selected)}>Reload saved version</button> : null}
                    {diff ? (
                      <section aria-label="Review file changes">
                        <p>Changed lines from {diff.startLine}</p>
                        <p>Saved version</p><pre>{diff.before || 'No lines'}</pre>
                        <p>Proposed version</p><pre>{diff.after || 'No lines'}</pre>
                        <button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save file'}</button>
                      </section>
                    ) : null}
                  </>
                ) : (
                <div className="bo-code" style={{ border: '1px solid var(--bo-line-faint)' }}>
                  <div className="bo-code__gutter" aria-hidden="true">
                    {tokenised.map((_, index) => (
                      <div key={index}>{index + 1}</div>
                    ))}
                  </div>
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
                )}
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
