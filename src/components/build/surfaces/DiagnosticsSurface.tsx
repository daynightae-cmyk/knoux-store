'use client';

/**
 * Diagnostics surface.
 *
 * Renders whatever normalised diagnostics exist in workspace state. When none
 * exist it says so, because "no diagnostics" and "diagnostics not collected"
 * are different facts and a reader needs to know which one they are looking at.
 */

import { useMemo, useState } from 'react';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { Empty, KV, Pane, Section, StatusBadge } from '../workspace/Primitives';
import { summariseDiagnostics } from '@/lib/build/diagnostics';
import type { DiagnosticSource } from '@/lib/build/types';

const SOURCES: DiagnosticSource[] = [
  'typescript', 'eslint', 'runtime', 'browser', 'test', 'build', 'security', 'accessibility',
];

export function DiagnosticsSurface() {
  const { state, dispatch } = useBuildWorkspace();
  const [filter, setFilter] = useState<DiagnosticSource | 'all'>('all');
  const diagnostics = state.diagnostics;
  const summary = useMemo(() => summariseDiagnostics(diagnostics), [diagnostics]);
  const filtered = filter === 'all' ? diagnostics : diagnostics.filter((d) => d.source === filter);

  return (
    <Pane
      title="Diagnostics"
      meta={
        <>
          <span>{summary.errors} ERRORS</span>
          <span>{summary.warnings} WARNINGS</span>
        </>
      }
    >
      <div className="bo-pane__body--pad" style={{ padding: 20 }}>
        <Section label="Filter">
          <div className="bo-chips">
            <button
              type="button"
              className="bo-chip"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              ALL
            </button>
            {SOURCES.map((source) => (
              <button
                key={source}
                type="button"
                className="bo-chip"
                aria-pressed={filter === source}
                disabled={summary.bySource[source] === 0}
                onClick={() => setFilter(source)}
              >
                {source.toUpperCase()} {summary.bySource[source]}
              </button>
            ))}
          </div>
        </Section>

        <div style={{ height: 18 }} />

        {diagnostics.length === 0 ? (
          <Empty
            title="No diagnostics collected"
            body="Diagnostics are produced by the allowlisted verification runner. It is disabled on this deployment, so no tool output has been parsed. That is different from a clean run, and the surface says so rather than showing a green zero."
          />
        ) : (
          <Section label={`Findings · ${filtered.length}`}>
            {filtered.map((diagnostic) => (
              <div
                key={diagnostic.id}
                style={{
                  borderLeft: `2px solid ${diagnostic.severity === 'error' ? 'var(--bo-red)' : 'var(--bo-amber)'}`,
                  paddingLeft: 12,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge
                    status={diagnostic.status === 'fail' ? 'fail' : diagnostic.status === 'pass' ? 'pass' : 'not-run'}
                  />
                  <span className="bo-status" data-status="not-run">{diagnostic.source.toUpperCase()}</span>
                  <span className="bo-status" data-status="not-run" style={{ marginLeft: 'auto' }}>
                    {diagnostic.file ? `${diagnostic.file}:${diagnostic.line ?? '—'}:${diagnostic.column ?? '—'}` : 'NO LOCATION'}
                  </span>
                </div>
                <p className="bo-note" style={{ marginTop: 6, color: 'var(--bo-ink)' }}>{diagnostic.title}</p>
                <p className="bo-note" style={{ marginTop: 4 }}>{diagnostic.message}</p>
                <div style={{ height: 8 }} />
                <KV
                  rows={[
                    { k: 'Root cause', v: diagnostic.rootCause ?? 'NOT ESTABLISHED — evidence below is correlation only.' },
                    { k: 'Evidence', v: diagnostic.evidence },
                    { k: 'Related files', v: diagnostic.relatedFiles.length ? diagnostic.relatedFiles.join(', ') : 'NONE' },
                    { k: 'Verification', v: diagnostic.verificationMethod ?? 'NOT STATED' },
                  ]}
                />
              </div>
            ))}
          </Section>
        )}

        {diagnostics.length > 0 ? (
          <div className="bo-actions" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="bo-action"
              onClick={() => dispatch({ type: 'diagnostics/resolved', diagnostics: [] })}
            >
              CLEAR
            </button>
          </div>
        ) : null}
      </div>
    </Pane>
  );
}
