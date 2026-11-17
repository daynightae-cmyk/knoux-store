'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AiCenterPage } from './AiCenterLayout';
import { DevPanel } from '../dev/DevUI';
import { useCanonicalModels } from '../generator/useCanonicalModels';
import { ModelNavigator } from '../generator/ModelNavigator';
import { effortSupport } from '@/lib/build/profile';
import type { NormalizedModel, GenerationControls } from '@/lib/ai/types';


type GenerationResponse = {
  ok: boolean;
  text: string;
  finishReason: string | null;
  usage: { inputTokens: number | null; outputTokens: number | null; source: string } | null;
  latencyMs: number;
  ttftMs: number | null;
  modelUsed: string | null;
  estimatedCost: { amount: number | null; basis: string } | null;
  error: { category: string; safeMessage: string } | null;
  fallbackUsed: boolean;
  fallbackCount: number;
};

export function AiControlPage({ selection = {} }: { selection?: Record<string, string> }) {
  const headers = useMemo(() => ({
    ...(selection.profileId ? { 'x-knoux-provider-profile-id': selection.profileId } : {}),
    ...(selection.workspaceId ? { 'x-knoux-workspace-id': selection.workspaceId } : {}),
  }), [selection.profileId, selection.workspaceId]);
  const intelligence = useCanonicalModels(headers);
  const [chosen, setSelected] = useState<NormalizedModel | null>(null);
  const selected = intelligence.models.find(model => model.providerId === (chosen?.providerId ?? selection.providerId) && model.modelId === (chosen?.modelId ?? selection.modelId)) ?? null;
  const controller = useRef<AbortController | null>(null);
  const [streamFacts, setStreamFacts] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    return () => controller.current?.abort();
  }, []);
  const [prompt, setPrompt] = useState('');
  const [system, setSystem] = useState('');
  const [temp, setTemp] = useState(0.7);
  const [topP, setTopP] = useState(1);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [seed, setSeed] = useState('');
  const [stop, setStop] = useState('');
  const [response, setResponse] = useState<GenerationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');

  function exposedControls(): GenerationControls {
    if (!selected) return {};
    return {
      ...(selected.controls.temperature ? { temperature: temp } : {}),
      ...(selected.controls.topP ? { topP } : {}),
      ...(selected.controls.maxTokens ? { maxOutputTokens: Math.max(1, Math.min(maxTokens, selected.maxOutputTokens ?? 4096)) } : {}),
      ...(selected.controls.seed && seed ? { seed: Number(seed) } : {}),
      ...(selected.controls.stop && stop ? { stop: stop.split(',').map((item) => item.trim()).filter(Boolean) } : {}),
    };
  }

  async function generate() {
    if (!selected || !prompt.trim() || loading || streaming) return;
    controller.current = new AbortController();
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const body: Record<string, unknown> = {
        providerId: selected.providerId,
        modelId: selected.modelId,
        messages: [{ role: 'user', content: prompt }],
        controls: exposedControls(),
        noFallback: true,
      };
      if (system) body.system = system;
      const res = await fetch('/api/build/ai/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        signal: controller.current.signal,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error?.safeMessage ?? 'Generation refused.');
      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false); intelligence.refresh();
    }
  }

  async function stream() {
    if (!selected || !prompt.trim() || streaming || loading) return;
    controller.current = new AbortController();
    setStreamFacts(null);
    setStreaming(true);
    setStreamText('');
    setError(null);
    try {
      const body: Record<string, unknown> = {
        providerId: selected.providerId,
        modelId: selected.modelId,
        messages: [{ role: 'user', content: prompt }],
        controls: exposedControls(),
      };
      if (system) body.system = system;
      const res = await fetch('/api/build/ai/stream', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        signal: controller.current.signal,
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) { setError('Stream failed'); setStreaming(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const chunk = JSON.parse(trimmed.slice(6));
            if (chunk.error) { setError(chunk.error.safeMessage ?? 'Provider stream failed.'); await reader.cancel(); return; }
            if (chunk.delta) setStreamText((prev) => prev + chunk.delta);
            if (chunk.done) { completed = true; setStreamFacts(chunk); break; }
          } catch { /* skip */ }
        }
      }
      if (!completed) setError('Stream ended before completion. Partial output is not a completed run.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stream failed');
    } finally {
      setStreaming(false); intelligence.refresh();
    }
  }

  return (
    <AiCenterPage heading={
      <header className="dev-page-heading" style={{ marginBottom: 16 }}>
        <span className="dev-mini-label">AI RUNTIME / CONTROL</span>
        <h2>Model Control Center</h2>
        <p>Generation controls for the selected model. Unsupported controls disappear. Each control only appears when the model supports it.</p>
        <Link href="/build/providers">Connect provider / وصّل مزوّد ↗</Link>
      </header>
    }>
      <DevPanel title="Model Selection">
        <ModelNavigator {...intelligence} disabled={loading || streaming} selected={selected} onSelect={setSelected} />
        <p className="dev-note">Exact model selection · no automatic fallback. Hidden reasoning: {effortSupport(selected).replaceAll('_', ' ')}.</p>
      </DevPanel>
      {loading || streaming ? <button type="button" className="bo-action" onClick={() => controller.current?.abort()}>Cancel / إلغاء</button> : null}
      {streamFacts ? <details><summary>Run details / تفاصيل التشغيل</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(streamFacts, null, 2)}</pre></details> : null}

      <div style={{ height: 16 }} />

      {selected ? (
        <>
          <DevPanel title="Controls">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {selected.controls.temperature ? <>
              <label className="dev-input-label">Temperature
                <input type="number" step="0.1" min="0" max="2" value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </label>
              </> : <p className="dev-note">Temperature · FIXED BY PROVIDER</p>}
              {selected.controls.topP ? <>
              <label className="dev-input-label">Top P
                <input type="number" step="0.1" min="0" max="1" value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} style={{ width: '100%' }} />
              </label>
              </> : <p className="dev-note">Top P · FIXED BY PROVIDER</p>}
              {selected.controls.maxTokens ? <>
              <label className="dev-input-label">Max output tokens
                <input type="number" step="64" min="1" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))} style={{ width: '100%' }} />
              </label>
              </> : <p className="dev-note">Max output tokens · FIXED BY PROVIDER</p>}
              {selected.controls.seed ? <>
              <label className="dev-input-label">Seed (optional)
                <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="unset" style={{ width: '100%' }} />
              </label>
              </> : <p className="dev-note">Seed (optional) · FIXED BY PROVIDER</p>}
              {selected.controls.stop ? <>
              <label className="dev-input-label">Stop sequences (comma-separated)
                <input type="text" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="none" style={{ width: '100%' }} />
              </label>
              </> : <p className="dev-note">Stop sequences (comma-separated) · FIXED BY PROVIDER</p>}
            </div>
          </DevPanel>

          <div style={{ height: 16 }} />

          <DevPanel title="Prompt">
            <input aria-label="System prompt (optional)" className="dev-field" style={{ width: '100%', padding: 8, marginBottom: 8 }} placeholder="System prompt (optional)" value={system} onChange={(e) => setSystem(e.target.value)} />
            <textarea aria-label="Prompt" className="dev-field" style={{ width: '100%', minHeight: 80, padding: 12, fontFamily: 'inherit' }} placeholder="Enter your prompt…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <div className="dev-actions" style={{ marginTop: 8 }}>
              <button type="button" className="bo-action bo-action--primary" disabled={loading || streaming} onClick={() => void generate()}>
                {loading ? 'GENERATING…' : 'GENERATE'}
              </button>
              <button type="button" disabled={loading || streaming} onClick={() => void stream()}>
                {streaming ? 'STREAMING…' : 'STREAM'}
              </button>
            </div>
          </DevPanel>

          {error ? <p role="status" className="dev-note" style={{ color: 'var(--dev-bad)', marginTop: 12 }}>{error}</p> : null}

          {streaming || streamText ? (
            <div style={{ marginTop: 16 }}>
              <DevPanel title="Stream">
                <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6 }}>
                  {streamText}{streaming ? <span className="dev-blink">▋</span> : null}
                </pre>
              </DevPanel>
            </div>
          ) : null}

          {response ? (
            <div style={{ marginTop: 16 }}>
              <DevPanel title="Response">
                <details><summary>Run details / تفاصيل التشغيل</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(response, null, 2)}</pre></details>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="dev-tag" data-tone={response.ok ? 'ok' : 'bad'}>{response.ok ? 'OK' : 'FAIL'}</span>
                  <span className="dev-tag">{response.modelUsed ?? '—'}</span>
                  <span className="dev-tag">{response.latencyMs}ms</span>
                  {response.usage ? <span className="dev-tag">{response.usage.inputTokens ?? '?'}→{response.usage.outputTokens ?? '?'} tok</span> : null}
                  {response.estimatedCost?.amount != null ? <span className="dev-tag">{response.estimatedCost.basis} ${response.estimatedCost.amount.toFixed(6)}</span> : <span className="dev-tag">cost UNKNOWN</span>}
                  {response.fallbackCount > 0 ? <span className="dev-tag" data-tone="warn">fallback ×{response.fallbackCount}</span> : null}
                </div>
                {response.ok ? (
                  <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6 }}>{response.text}</pre>
                ) : (
                  <p className="dev-note" style={{ color: 'var(--dev-bad)' }}>{response.error?.category}: {response.error?.safeMessage}</p>
                )}
              </DevPanel>
            </div>
          ) : null}
        </>
      ) : null}
    </AiCenterPage>
  );
}
