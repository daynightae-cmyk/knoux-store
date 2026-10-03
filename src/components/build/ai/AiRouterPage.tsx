'use client';
import { useCallback, useEffect, useState } from 'react';
import { AiCenterPage } from './AiCenterLayout';
import { DevPanel, DevEmpty } from '../dev/DevUI';

type RouterDecision = {
  taskClass: string;
  mode: 'auto' | 'manual';
  selected: { providerId: string; modelId: string; displayName: string } | null;
  candidates: { providerId: string; modelId: string; displayName: string; score: number; accepted: boolean; rejectionReason: string | null }[];
  fallbackChain: { providerId: string; modelId: string; displayName: string }[];
  estimatedCost: { amount: number | null; basis: string } | null;
  health: Record<string, string>;
  contextFit: string;
  reasons: string[];
  status: 'resolved' | 'unavailable';
  blocker: string | null;
};

const TASK_CLASSES = ['general', 'fast-edit', 'architecture', 'debugging', 'vision', 'refactor', 'long-context', 'test-repair', 'search'];

export function AiRouterPage() {
  const [prompt, setPrompt] = useState('');
  const [taskClass, setTaskClass] = useState('general');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [visionReq, setVisionReq] = useState(false);
  const [toolsReq, setToolsReq] = useState(false);
  const [structuredReq, setStructuredReq] = useState(false);
  const [noFallback, setNoFallback] = useState(false);
  const [manualProvider, setManualProvider] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [decision, setDecision] = useState<RouterDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runRouter() {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        taskClass,
        mode,
        prompt,
        visionRequired: visionReq,
        toolsRequired: toolsReq,
        structuredOutputRequired: structuredReq,
        noFallback,
      };
      if (mode === 'manual' && manualProvider && manualModel) {
        body.manualSelection = { providerId: manualProvider, modelId: manualModel };
      }
      const res = await fetch('/api/build/ai/router', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: RouterDecision = await res.json();
      setDecision(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Router failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AiCenterPage heading={
      <header className="dev-page-heading" style={{ marginBottom: 16 }}>
        <span className="dev-mini-label">AI RUNTIME / ROUTER</span>
        <h1>Router v2</h1>
        <p>Score-based routing with health, latency, cost, and context-fit factors. AUTO explains its decision. MANUAL is never silently overridden.</p>
      </header>
    }>
      <DevPanel title="Router Input">
        <textarea
          className="dev-field"
          style={{ width: '100%', minHeight: 60, padding: 12, fontFamily: 'inherit' }}
          placeholder="Enter a prompt to route…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <select value={taskClass} onChange={(e) => setTaskClass(e.target.value)} className="dev-field" style={{ padding: 8 }}>
            {TASK_CLASSES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="dev-tabs" role="tablist" aria-label="Routing mode">
            <button type="button" role="tab" aria-selected={mode === 'auto'} className={`dev-tab ${mode === 'auto' ? 'dev-tab--active' : ''}`} onClick={() => setMode('auto')}>AUTO</button>
            <button type="button" role="tab" aria-selected={mode === 'manual'} className={`dev-tab ${mode === 'manual' ? 'dev-tab--active' : ''}`} onClick={() => setMode('manual')}>MANUAL</button>
          </div>
        </div>

        {mode === 'manual' ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="dev-field" style={{ flex: 1, padding: 8 }} placeholder="Provider ID" value={manualProvider} onChange={(e) => setManualProvider(e.target.value)} />
            <input className="dev-field" style={{ flex: 1, padding: 8 }} placeholder="Model ID" value={manualModel} onChange={(e) => setManualModel(e.target.value)} />
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <label className="dev-check"><input type="checkbox" checked={visionReq} onChange={(e) => setVisionReq(e.target.checked)} />Vision required</label>
          <label className="dev-check"><input type="checkbox" checked={toolsReq} onChange={(e) => setToolsReq(e.target.checked)} />Tools required</label>
          <label className="dev-check"><input type="checkbox" checked={structuredReq} onChange={(e) => setStructuredReq(e.target.checked)} />Structured output</label>
          <label className="dev-check"><input type="checkbox" checked={noFallback} onChange={(e) => setNoFallback(e.target.checked)} />No fallback</label>
        </div>

        <div className="dev-actions" style={{ marginTop: 8 }}>
          <button type="button" className="bo-action bo-action--primary" disabled={loading} onClick={() => void runRouter()}>
            {loading ? 'ROUTING…' : 'ROUTE'}
          </button>
        </div>
      </DevPanel>

      <div style={{ height: 16 }} />

      {error ? <p role="status" className="dev-note" style={{ color: 'var(--dev-bad)' }}>{error}</p> : null}

      {decision ? (
        <>
          <DevPanel title="Routing Decision">
            {decision.status === 'resolved' && decision.selected ? (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="dev-tag" data-tone="ok">SELECTED</span>
                  <span className="dev-tag">{decision.selected.providerId} / {decision.selected.modelId}</span>
                  <span className="dev-tag">Context: {decision.contextFit}</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong>WHY</strong>
                  <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                    {decision.reasons.map((r, i) => <li key={i} className="dev-note">{r}</li>)}
                  </ul>
                </div>
                {decision.fallbackChain.length > 0 ? (
                  <div>
                    <strong>FALLBACK</strong>
                    <div style={{ marginTop: 6 }}>
                      {decision.fallbackChain.map((f, i) => (
                        <span key={i} className="dev-tag" style={{ marginRight: 6 }}>{f.providerId} / {f.modelId}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div style={{ padding: 12, border: '1px solid var(--dev-bad)', borderRadius: 4 }}>
                <strong style={{ color: 'var(--dev-bad)' }}>UNAVAILABLE</strong>
                <p className="dev-note" style={{ marginTop: 6 }}>{decision.blocker}</p>
              </div>
            )}
          </DevPanel>

          {decision.candidates.length > 0 ? (
            <>
              <div style={{ height: 16 }} />
              <DevPanel title={`Candidates (${decision.candidates.length})`}>
                <table className="dev-kv-table" style={{ width: '100%' }}>
                  <thead><tr><th>Provider</th><th>Model</th><th>Score</th><th>Accepted</th><th>Reason</th></tr></thead>
                  <tbody>
                    {decision.candidates.map((c, i) => (
                      <tr key={i}>
                        <td>{c.providerId}</td>
                        <td>{c.modelId}</td>
                        <td>{c.score.toFixed(1)}</td>
                        <td><span className="dev-tag" data-tone={c.accepted ? 'ok' : 'bad'}>{c.accepted ? 'YES' : 'NO'}</span></td>
                        <td>{c.rejectionReason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DevPanel>
            </>
          ) : null}
        </>
      ) : null}
    </AiCenterPage>
  );
}
