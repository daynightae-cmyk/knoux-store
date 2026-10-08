'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRef, useState, type FormEvent } from 'react';
import { compileBuildIntent, summariseIntent } from '@/lib/build/intent';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { BuildEntryGate } from './BuildEntryGate';
import { workspaceFacts } from './workspace-facts';
import { consumePlanStream, parseEngineeringPlan, ENGINEERING_PLAN_SYSTEM, PLAN_SECTIONS, planPrompt, type EngineeringPlan, type EngineeringStage } from '@/lib/build/engineering-plan';

const Preview = dynamic(() => import('../surfaces/PreviewSurface').then((mod) => mod.PreviewSurface));
const Registry = dynamic(() => import('./ProductMachine').then((mod) => mod.ProductMachine));

// Each prompt uses vocabulary the existing intent compiler can resolve.
const QUICK_INTENTS = [
  { label: 'WEB APP', prompt: 'Build a web app with React and TypeScript' },
  { label: 'DESKTOP APP', prompt: 'Build a desktop app for Windows' },
  { label: 'ANDROID', prompt: 'Build a web app for Android' },
  { label: 'SYSTEM TOOL', prompt: 'Build a system tool for maintenance' },
  { label: 'AI SYSTEM', prompt: 'Build an AI application with a chatbot' },
] as const;

export function DevWorkspaceHome() {
  const { state, dispatch } = useBuildWorkspace();
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const view = state.workspace.activeSurface === 'preview' ? 'preview' : state.workspace.activeSurface === 'data' ? 'registry' : 'build';
  const setView = (view: 'build' | 'preview' | 'registry') => dispatch({ type: 'surface/active', surface: view === 'preview' ? 'preview' : view === 'registry' ? 'data' : 'genesis' });
  const input = useRef<HTMLTextAreaElement>(null);
  const draft = draftOverride ?? state.intent?.rawInput ?? '';
  const facts = workspaceFacts(state);
  const attempt = useRef<string | null>(state.engineering.requestId);
  const { stage, plan, error: planError, selection, characters, measurement } = state.engineering;
  const setStage = (stage: EngineeringStage) => dispatch({ type: 'engineering/update', requestId: attempt.current, patch: { stage } });
  const setPlan = (plan: EngineeringPlan | null) => dispatch({ type: 'engineering/update', requestId: attempt.current, patch: { plan } });
  const setPlanError = (error: string | null) => dispatch({ type: 'engineering/update', requestId: attempt.current, patch: { error } });
  const setSelection = (selection: typeof state.engineering.selection) => dispatch({ type: 'engineering/update', requestId: attempt.current, patch: { selection } });
  const setCharacters = (characters: number) => dispatch({ type: 'engineering/update', requestId: attempt.current, patch: { characters } });
  const setMeasurement = (measurement: typeof state.engineering.measurement) => dispatch({ type: 'engineering/update', requestId: attempt.current, patch: { measurement } });
  const [models, setModels] = useState<{ providerId: string; modelId: string; displayName: string }[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const planning = ['RESOLVING', 'ROUTING', 'GENERATING'].includes(stage);

  async function discoverModels() {
    setDiscovering(true); setPlanError(null);
    try {
      const response = await fetch('/api/build/ai/models', { cache: 'no-store' });
      if (!response.ok) throw new Error('Sign in to discover server-configured models.');
      const result = await response.json();
      setModels((result.providers ?? []).flatMap((provider: { providerId: string; models: { modelId: string; displayName: string }[] }) => provider.models.map((model) => ({ ...model, providerId: provider.providerId }))));
    } catch (cause) { setPlanError(cause instanceof Error ? cause.message : 'Model discovery failed.'); }
    finally { setDiscovering(false); }
  }

  async function compile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || planning) return;
    attempt.current = crypto.randomUUID();
    dispatch({ type: 'engineering/begin', requestId: attempt.current, context: { project: state.project?.name ?? null, worktree: state.project?.root ?? null, branch: state.git?.branch ?? null } });
    const intent = compileBuildIntent(draft);
    dispatch({ type: 'intent/compiled', intent });
    setPlan(null); setPlanError(null); setSelection(null); setMeasurement(null); setCharacters(0); setStage('RESOLVING');
    try {
      const prepared = await fetch('/api/build/ai/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: draft, mode: state.ai.routingMode, manualSelection: { providerId: state.ai.providerId, modelId: state.ai.modelId } }) });
      if (prepared.status === 401 || prepared.status === 403) { setStage('AUTH_REQUIRED'); setPlanError('Sign in with an authorized Build account to use the provider runtime.'); return; }
      if (!prepared.ok) throw new Error('The canonical provider runtime could not resolve this request.');
      const runtime = await prepared.json();
      if (!runtime.decision?.selected) { setStage(runtime.state === 'CONFIG_REQUIRED' ? 'CONFIG_REQUIRED' : 'PROVIDER_BLOCKED'); setPlanError(runtime.decision?.blocker ?? 'No runtime-eligible provider is available.'); return; }
      const selected = runtime.decision.selected as { providerId: string; modelId: string };
      setSelection({ ...selected, reasons: runtime.decision.reasons }); setStage('ROUTING');
      const stream = await fetch('/api/build/ai/stream', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...selected, system: ENGINEERING_PLAN_SYSTEM, messages: [{ role: 'user', content: planPrompt(intent, { project: state.project?.name ?? null, worktree: state.project?.root ?? null, branch: state.git?.branch ?? null }) }], controls: { maxOutputTokens: 4096 } }) });
      if (stream.status === 401 || stream.status === 403) { setStage('AUTH_REQUIRED'); setPlanError('The runtime refused access. No plan was generated.'); return; }
      if (!stream.ok || !stream.body) throw new Error('The provider stream could not be opened.');
      setStage('GENERATING');
      try {
        const result = await consumePlanStream(stream.body, setCharacters);
        setPlan(result.plan); setMeasurement(result.terminal); setStage('PLANNED');
        dispatch({ type: 'activity/record', message: `Engineering plan generated by ${selected.providerId}/${selected.modelId}. No project mutations.` });
      } catch (cause) {
        const alternatives = runtime.decision.fallbackChain as { providerId: string; modelId: string }[];
        if (state.ai.routingMode === 'manual' || !alternatives?.length) throw cause;
        const [primary, ...fallbackChain] = alternatives;
        const response = await fetch('/api/build/ai/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...primary, fallbackChain, system: ENGINEERING_PLAN_SYSTEM, messages: [{ role: 'user', content: planPrompt(intent, { project: state.project?.name ?? null, worktree: state.project?.root ?? null, branch: state.git?.branch ?? null }) }], controls: { maxOutputTokens: 4096 } }) });
        if (!response.ok) throw new Error('The canonical fallback runtime refused this request.');
        const result = await response.json();
        if (!result.ok || !result.actualProviderId || !result.actualModelId) throw new Error(result.error?.safeMessage ?? 'No eligible fallback completed the plan.');
        const artifact = parseEngineeringPlan(result.text);
        setSelection({ providerId: result.actualProviderId, modelId: result.actualModelId, reasons: [...runtime.decision.reasons, `Requested ${selected.providerId}/${selected.modelId}. Streaming failed; canonical generation fallback used ${result.actualProviderId}/${result.actualModelId}. ${1 + (result.fallbackCount ?? 0)} fallback attempts.`] });
        setPlan(artifact); setMeasurement(result); setStage('PLANNED');
        dispatch({ type: 'activity/record', message: `Engineering plan generated by fallback ${result.actualProviderId}/${result.actualModelId}. Requested ${selected.providerId}/${selected.modelId}. No project mutations.` });
      }
    } catch (cause) { setStage('PROVIDER_BLOCKED'); setPlanError(cause instanceof Error ? cause.message : 'Planning failed.'); }
  }

  return <>
    <BuildEntryGate />
    <section className={`dev-observatory dev-observatory--${view}`} aria-label="Build workspace">
      <header className="dev-stage-head">
        <span className="dev-mini-label">KNOuX / ENGINEERING ENVIRONMENT</span>
        <div className="dev-stage-views" role="group" aria-label="Workspace view">
          {(['build', 'preview', 'registry'] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item.toUpperCase()}</button>)}
        </div>
      </header>
      <dl className="dev-home-context"><div><dt>ACTIVE PROJECT</dt><dd>{state.project?.name ?? 'NOT CONNECTED'}</dd></div><div><dt>ACTIVE HOST</dt><dd>{state.engineering.host?.name ?? 'UNMEASURED'} · {state.engineering.host?.kind ?? facts.environment}</dd></div><div><dt>ACTIVE WORKTREE</dt><dd>{state.project?.root ?? 'NOT CONNECTED'}</dd></div><div><dt>ACTIVE AGENT</dt><dd>KNOuX Architect · planning profile</dd></div><div><dt>PROVIDER / MODEL</dt><dd>{selection ? `${selection.providerId} / ${selection.modelId}` : 'Resolved per request'}</dd></div><div><dt>ROUTING / AVAILABLE TOOLS</dt><dd>{state.ai.routingMode.toUpperCase()} · provider planning only</dd></div></dl>
      {view === 'build' ? <div className="dev-universe">
        <div className="dev-universe__orbit" aria-hidden="true" />
        <dl className="dev-hud dev-hud--project"><dt>PROJECT</dt><dd>{facts.project}</dd>{state.git?.branch ? <><dt>BRANCH</dt><dd>{state.git.branch}</dd></> : null}</dl>
        <dl className="dev-hud dev-hud--runtime"><dt>RUNTIME</dt><dd>{facts.runtime}</dd><dt>PROVIDER</dt><dd>{facts.provider}</dd></dl>
        <div className="dev-build-center">
          <p className="dev-build-center__eyebrow">KNOuX BUILD</p>
          <h1>What are we building today?</h1>
          <div className="dev-composer-routing"><label>Routing<select disabled={planning} value={state.ai.routingMode} onChange={(event) => dispatch({ type: 'ai/routing-mode', mode: event.target.value === 'manual' ? 'manual' : 'auto' })}><option value="auto">AUTO · eligible runtime</option><option value="manual">MANUAL · operator selection</option></select></label>{state.ai.routingMode === 'manual' ? <><button type="button" disabled={planning || discovering} onClick={() => void discoverModels()}>{discovering ? 'Discovering…' : 'Discover models'}</button><label>Model<select disabled={planning} value={JSON.stringify([state.ai.providerId, state.ai.modelId])} onChange={(event) => { const [providerId, modelId] = JSON.parse(event.target.value); dispatch({ type: 'ai/selection', providerId, modelId }); }}><option value={JSON.stringify([null, null])}>Select a discovered model</option>{models.map((model) => <option key={`${model.providerId}/${model.modelId}`} value={JSON.stringify([model.providerId, model.modelId])}>{model.providerId} / {model.displayName}</option>)}</select></label></> : null}</div>
          <form className="dev-floating-compose" onSubmit={(event) => void compile(event)}>
            <label className="dev-visually-hidden" htmlFor="dev-intent-input">Describe what you want to build</label>
            <textarea ref={input} id="dev-intent-input" maxLength={16000} disabled={planning} value={draft} onChange={(event) => setDraftOverride(event.target.value)} placeholder="Describe what you want to build…" rows={3} />
            <div className="dev-floating-compose__tools">
              <div className="dev-compose-modes" role="group" aria-label="Build actions"><span>BUILD</span><button type="button" onClick={() => setView('preview')}>PREVIEW</button><Link href="/build/pipeline">VERIFY ↗</Link></div>
              <div className="dev-compose-actions"><Link href="/build/docs" aria-label="Open project files" title="Docs & project files">▤</Link><Link href="/build/terminal" aria-label="Open terminal" title="Terminal">⌘</Link><button type="submit" disabled={!draft.trim() || planning} aria-label="Generate engineering plan" title="Generate a plan with the canonical provider runtime">↑</button></div>
            </div>
          </form>
          <div className="dev-quick-intents" role="group" aria-label="Intent suggestions">{QUICK_INTENTS.map((item) => <button type="button" key={item.label} onClick={() => { setDraftOverride(item.prompt); input.current?.focus(); }}>{item.label}</button>)}</div>
          <p className="dev-compiler-note" role="status">{stage}{planning ? ` · ${characters.toLocaleString()} characters received` : ''} · {selection ? `${selection.providerId} / ${selection.modelId}` : 'Canonical runtime · planning only'}</p>
          <div className="dev-intent-reading" role="status">{state.intent ? summariseIntent(state.intent) : 'Describe your next system to compile its intent.'}</div>
        </div>
        <div className="dev-universe__caption"><span>PROJECT CONSTELLATION</span><button type="button" onClick={() => setView('registry')}>EXPLORE {facts.registryCount} PRODUCTS ↗</button></div>
      </div> : <div className="dev-stage-surface"><h1 className="dev-surface-title">{view === 'preview' ? 'Project preview' : 'Product constellation'}</h1>{view === 'preview' ? <Preview cinematic /> : <Registry />}</div>}
      {planError ? <p className="dev-plan-error" role="alert">{planError} <Link href="/build/providers">Inspect providers ↗</Link></p> : null}
      {plan ? <section className="dev-engineering-plan" aria-label="Engineering plan">
        <header><div><span className="dev-mini-label">ENGINEERING ARTIFACT / PROPOSAL</span><h2>From intent to architecture.</h2></div><button type="button" onClick={() => setStage('REVIEWING')}>Review plan</button></header>
        <dl className="dev-plan-context"><div><dt>Agent</dt><dd>KNOuX Architect · logical planning profile</dd></div><div><dt>Runtime</dt><dd>{selection?.providerId} / {selection?.modelId}</dd></div><div><dt>Worktree</dt><dd>{state.engineering.context?.worktree ?? 'No worktree connected'}</dd></div><div><dt>Measurements</dt><dd>{measurement?.latencyMs ?? 'UNKNOWN'} ms · input {measurement?.usage?.inputTokens ?? 'UNKNOWN'} / output {measurement?.usage?.outputTokens ?? 'UNKNOWN'} tokens · cost UNKNOWN</dd></div></dl>
        <div className="dev-plan-sections">{PLAN_SECTIONS.map((section, index) => <article key={section}><span className="dev-mini-label">{String(index + 1).padStart(2, '0')} / {section}</span><ul>{plan[section].map((line, i) => <li key={i}>{line}</li>)}</ul></article>)}</div>
        {stage === 'REVIEWING' || stage === 'EXECUTOR_NOT_CONNECTED' ? <aside className="dev-plan-review" aria-label="Execution review"><h3>Review before execution</h3><p>Proposed files and actions appear above. Planning has provider generation permission only; no shell, browser, Git write, MCP, plugin or skill tools were invoked. Execution risk is unverified until a trusted executor validates this proposal.</p><p>{selection?.reasons.join(' ')}</p><button type="button" onClick={() => setStage('EXECUTOR_NOT_CONNECTED')}>Check execution availability</button>{stage === 'EXECUTOR_NOT_CONNECTED' ? <p role="status">EXECUTOR_NOT_CONNECTED · This plan has no structured write executor. Connect and approve a trusted local execution environment. The public server cannot modify its deployed source.</p> : null}<Link href="/build/pipeline">Inspect real verification ↗</Link></aside> : null}
      </section> : null}
      {state.access === 'refused' ? <div className="dev-access-note"><span>Project, provider and environment details require an account.</span><Link href="/login?next=%2Fbuild">SIGN IN TO INSPECT ↗</Link></div> : state.error ? <p className="dev-access-note" role="status">{state.error}</p> : null}
    </section>
  </>;
}
