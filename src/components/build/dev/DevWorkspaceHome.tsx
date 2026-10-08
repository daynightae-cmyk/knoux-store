'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRef, useState, type FormEvent } from 'react';
import { compileBuildIntent, summariseIntent } from '@/lib/build/intent';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { BuildEntryGate } from './BuildEntryGate';
import { workspaceFacts } from './workspace-facts';
import { useCanonicalModels } from '../generator/useCanonicalModels';
import { ModelNavigator } from '../generator/ModelNavigator';
import { GenerationProfileRail } from '../generator/GenerationProfileRail';
import { PlanSystemMap } from '../generator/PlanSystemMap';
import { profileToControls } from '@/lib/build/profile';
import styles from '../generator/generator.module.css';
import { consumePlanStream, parseEngineeringPlan, canFallbackPlanError, PlanStreamError, ENGINEERING_PLAN_SYSTEM, PLAN_SECTIONS, planPrompt, type EngineeringPlan, type EngineeringStage } from '@/lib/build/engineering-plan';

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
  const { stage, plan, draftPlan, streamText, requested, error: planError, selection, characters, measurement } = state.engineering;
  const setStage = (stage: EngineeringStage) => dispatch({ type: 'engineering/update', requestId: attempt.current, patch: { stage } });
  const intelligence = useCanonicalModels();
  const chosenModel = intelligence.models.find((model) => model.providerId === (selection?.providerId ?? state.ai.providerId) && model.modelId === (selection?.modelId ?? state.ai.modelId)) ?? null;
  const planning = ['RESOLVING', 'ROUTING', 'GENERATING'].includes(stage);

  async function compile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || planning) return;
    attempt.current = crypto.randomUUID();
    const requestId = attempt.current;
    const update = (patch: Partial<typeof state.engineering>) => dispatch({ type: 'engineering/update', requestId, patch });
    const setStage = (stage: EngineeringStage) => update({ stage });
    const setPlan = (plan: EngineeringPlan | null) => update({ plan });
    const setPlanError = (error: string | null) => update({ error });
    const setSelection = (selection: typeof state.engineering.selection) => update({ selection });
    const setCharacters = (characters: number) => update({ characters });
    const setMeasurement = (measurement: typeof state.engineering.measurement) => update({ measurement });
    dispatch({ type: 'engineering/begin', requestId: attempt.current, context: { project: state.project?.name ?? null, worktree: state.project?.root ?? null, branch: state.git?.branch ?? null }, requested: { mode: state.ai.routingMode, profile: state.ai.generationProfile, providerId: state.ai.routingMode === 'manual' ? state.ai.providerId : null, modelId: state.ai.routingMode === 'manual' ? state.ai.modelId : null } });
    const intent = compileBuildIntent(draft);
    dispatch({ type: 'intent/compiled', intent });
    setPlan(null); setPlanError(null); setSelection(null); setMeasurement(null); setCharacters(0); setStage('RESOLVING');
    try {
      const prepared = await fetch('/api/build/ai/prepare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: draft, mode: state.ai.routingMode, generationProfile: state.ai.generationProfile, manualSelection: { providerId: state.ai.providerId, modelId: state.ai.modelId } }) });
      if (prepared.status === 401 || prepared.status === 403) { setStage('AUTH_REQUIRED'); setPlanError('Sign in with an authorized Build account to use the provider runtime.'); return; }
      if (!prepared.ok) throw new Error(prepared.status === 400 ? 'Select a discovered provider/model for MANUAL routing.' : 'The canonical provider runtime could not resolve this request.');
      const runtime = await prepared.json();
      if (!runtime.decision?.selected) { setStage(runtime.state === 'CONFIG_REQUIRED' ? 'CONFIG_REQUIRED' : 'PROVIDER_BLOCKED'); setPlanError(runtime.decision?.blocker ?? 'No runtime-eligible provider is available.'); return; }
      const selected = runtime.decision.selected as { providerId: string; modelId: string };
      setSelection({ ...selected, reasons: runtime.decision.reasons }); setStage('ROUTING');
      const selectedModel = intelligence.models.find((model) => model.providerId === selected.providerId && model.modelId === selected.modelId);
      const controls = profileToControls(state.ai.generationProfile, selectedModel).controls;
      const stream = await fetch('/api/build/ai/stream', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...selected, generationProfile: state.ai.generationProfile, system: ENGINEERING_PLAN_SYSTEM, messages: [{ role: 'user', content: planPrompt(intent, { project: state.project?.name ?? null, worktree: state.project?.root ?? null, branch: state.git?.branch ?? null }) }], controls }) });
      if (stream.status === 401 || stream.status === 403) { setStage('AUTH_REQUIRED'); setPlanError('The runtime refused access. No plan was generated.'); return; }
      if (!stream.ok || !stream.body) throw new Error('The provider stream could not be opened.');
      setStage('GENERATING');
      try {
        const result = await consumePlanStream(stream.body, setCharacters, (draftPlan) => update({ draftPlan }), (streamText) => update({ streamText }));
        setPlan(result.plan); setMeasurement(result.terminal); setStage('PLANNED');
        dispatch({ type: 'activity/record', message: `Engineering plan generated by ${selected.providerId}/${selected.modelId}. No project mutations.` });
      } catch (cause) {
        const alternatives = runtime.decision.fallbackChain as { providerId: string; modelId: string }[];
        if (state.ai.routingMode === 'manual' || !alternatives?.length || !canFallbackPlanError(cause)) throw cause;
        const [primary, ...fallbackChain] = alternatives;
        update({ draftPlan: null, streamText: '' });
        const response = await fetch('/api/build/ai/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...primary, fallbackChain, generationProfile: state.ai.generationProfile, system: ENGINEERING_PLAN_SYSTEM, messages: [{ role: 'user', content: planPrompt(intent, { project: state.project?.name ?? null, worktree: state.project?.root ?? null, branch: state.git?.branch ?? null }) }], controls }) });
        if (!response.ok) throw new Error('The canonical fallback runtime refused this request.');
        const result = await response.json();
        if (!result.ok || !result.actualProviderId || !result.routedModelId) throw new Error(result.error?.safeMessage ?? 'No eligible fallback completed the plan.');
        const artifact = parseEngineeringPlan(result.text);
        setSelection({ ...selected, reasons: [...runtime.decision.reasons, `Requested ${selected.providerId}/${selected.modelId}. Streaming failed; canonical generation fallback used ${result.actualProviderId}/${result.routedModelId}; actual model ${result.actualModelId ?? 'UNKNOWN'}. ${1 + (result.fallbackCount ?? 0)} fallback attempts.`] });
        setPlan(artifact); setMeasurement(result); setStage('PLANNED');
        dispatch({ type: 'activity/record', message: `Engineering plan generated by fallback ${result.actualProviderId}/${result.actualModelId}. Requested ${selected.providerId}/${selected.modelId}. No project mutations.` });
      }
    } catch (cause) { setStage(cause instanceof PlanStreamError && cause.category === 'AUTHENTICATION' ? 'AUTH_REQUIRED' : 'PROVIDER_BLOCKED'); setPlanError(cause instanceof Error ? cause.message : 'Planning failed.'); } finally { intelligence.refresh(); }
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
      <details className="dev-context-rail"><summary><span>{state.project?.name ?? 'Project not connected'}</span><span>{state.git?.branch ?? 'No branch'}</span><span>{state.engineering.host?.name ?? 'Host unmeasured'}</span><span>KNOuX Architect</span><span>{selection?.modelId ?? state.ai.modelId ?? 'Model per request'}</span><span>{state.ai.routingMode.toUpperCase()}</span><b>Context ↓</b></summary><dl className="dev-home-context"><div><dt>PROJECT / WORKTREE</dt><dd>{state.project?.root ?? 'NOT CONNECTED'}</dd></div><div><dt>HOST</dt><dd>{state.engineering.host?.kind ?? facts.environment}</dd></div><div><dt>AGENT / TOOLS</dt><dd>Logical planning profile · provider planning only</dd></div><div><dt>ENGINE</dt><dd>Workspace interface online · {facts.runtime} (project runtime)</dd></div><div><dt>PROVIDER</dt><dd>{facts.provider}</dd></div></dl></details>
      {view === 'build' ? <div className="dev-universe">
        <div className="dev-universe__orbit" aria-hidden="true" />
        <div className="dev-build-center">
          <p className="dev-build-center__eyebrow">KNOuX BUILD</p>
          <h1>What are we building today?</h1>
          <div className="dev-engine" data-stage={stage}><p><span role="status">ENGINE / {stage}</span><small aria-live="off">{planning ? `${characters.toLocaleString()} characters received` : stage === 'LISTENING' ? 'Describe a system. Resolve its architecture.' : stage === 'PLANNED' ? 'Proposal ready · review before execution' : stage === 'AUTH_REQUIRED' ? 'Provider access requires an authorized account' : stage === 'EXECUTOR_NOT_CONNECTED' ? 'Plan retained · trusted execution required' : 'Canonical engineering state'}</small></p></div>
          <div className="dev-composer-routing"><label>Routing<select aria-label="Routing" disabled={planning} value={state.ai.routingMode} onChange={(event) => dispatch({ type: 'ai/routing-mode', mode: event.target.value === 'manual' ? 'manual' : 'auto' })}><option value="auto">AUTO · eligible runtime</option><option value="manual">MANUAL · operator selection</option></select></label><ModelNavigator {...intelligence} disabled={planning} selected={state.ai.routingMode === 'manual' && state.ai.providerId && state.ai.modelId ? { providerId: state.ai.providerId, modelId: state.ai.modelId } : null} onSelect={(model) => { dispatch({ type: 'ai/routing-mode', mode: 'manual' }); dispatch({ type: 'ai/selection', providerId: model.providerId, modelId: model.modelId }); }} /></div>
          <p className={styles.note}>{state.ai.routingMode === 'auto' ? 'AUTO uses RouterV2. Choosing a discovered model explicitly enters MANUAL.' : 'MANUAL uses the exact provider/model. No automatic fallback.'}</p>
          <form className="dev-floating-compose" onSubmit={(event) => void compile(event)}>
            <label className="dev-visually-hidden" htmlFor="dev-intent-input">Describe what you want to build</label>
            <textarea ref={input} id="dev-intent-input" maxLength={16000} disabled={planning} value={draft} onChange={(event) => setDraftOverride(event.target.value)} placeholder="Describe what you want to build…" rows={3} />
            <div className="dev-floating-compose__tools">
              <div className="dev-compose-modes" role="group" aria-label="Build actions"><span>BUILD</span><button type="button" onClick={() => setView('preview')}>PREVIEW</button><Link href="/build/pipeline">VERIFY ↗</Link></div>
              <div className="dev-compose-actions"><Link href="/build/docs" aria-label="Open project files" title="Docs & project files">▤</Link><Link href="/build/terminal" aria-label="Open terminal" title="Terminal">⌘</Link><button type="submit" disabled={!draft.trim() || planning} aria-label="Generate engineering plan" title="Generate a plan with the canonical provider runtime">↑</button></div>
            </div>
          </form>
          <GenerationProfileRail value={state.ai.generationProfile} onChange={(profile) => dispatch({ type: 'ai/profile', profile })} model={chosenModel} disabled={planning} />
          <div className="dev-quick-intents" role="group" aria-label="Intent suggestions">{QUICK_INTENTS.map((item) => <button type="button" key={item.label} onClick={() => { setDraftOverride(item.prompt); input.current?.focus(); }}>{item.label}</button>)}</div>
          <p className="dev-compiler-note" aria-live="off">{stage}{planning ? ` · ${characters.toLocaleString()} characters received` : ''} · {selection ? `${selection.providerId} / ${selection.modelId}` : 'Canonical runtime · planning only'}</p>
          {requested ? <div className={styles.runtimeReading} aria-label="Requested and actual intelligence"><p>Requested: {requested.mode.toUpperCase()} · {requested.profile} · {requested.providerId ? `${requested.providerId} / ${requested.modelId}` : 'RouterV2 eligible selection'}</p><p>Routed endpoint: {selection ? `${selection.providerId} / ${selection.modelId}` : 'UNRESOLVED'}</p><p>Actual: {measurement?.actualProviderId ?? 'UNKNOWN'} / {measurement?.actualModelId ?? 'UNKNOWN'} · latency {measurement?.latencyMs ?? 'UNKNOWN'} ms · TTFT {measurement?.ttftMs ?? 'UNKNOWN'} ms</p>{measurement?.controlsUsed ? <p>Applied controls: output {measurement.controlsUsed.maxOutputTokens ?? 'provider default'} · temperature {measurement.controlsUsed.temperature ?? 'provider default'}</p> : null}{selection?.reasons.length ? <details><summary>Routing and fallback evidence</summary><ul>{selection.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details> : null}</div> : null}
          {streamText && !plan ? <details className={styles.streamEvidence}><summary>Provider text received · {characters.toLocaleString()} characters · unvalidated</summary><pre aria-live="off">{streamText}</pre></details> : null}
          <div className="dev-intent-reading" role="status">{state.intent ? summariseIntent(state.intent) : 'Describe your next system to compile its intent.'}</div>
        </div>
        <div className="dev-universe__caption"><span>PROJECT CONSTELLATION</span><button type="button" onClick={() => setView('registry')}>EXPLORE {facts.registryCount} PRODUCTS ↗</button></div>
      </div> : <div className="dev-stage-surface"><h1 className="dev-surface-title">{view === 'preview' ? 'Project preview' : 'Product constellation'}</h1>{view === 'preview' ? <Preview cinematic /> : <Registry />}</div>}
      {planError ? <p className="dev-plan-error" role="alert">{planError} <Link href="/build/providers">Inspect providers ↗</Link></p> : null}
      {!plan && draftPlan && Object.keys(draftPlan).length ? <PlanSystemMap plan={draftPlan} draft /> : null}
      {plan ? <section className="dev-engineering-plan" aria-label="Engineering plan">
        <header><div><span className="dev-mini-label">ENGINEERING ARTIFACT / PROPOSAL</span><h2>From intent to architecture.</h2></div><button type="button" onClick={() => setStage('REVIEWING')}>Review plan</button></header>
        <dl className="dev-plan-context"><div><dt>Agent</dt><dd>KNOuX Architect · logical planning profile</dd></div><div><dt>Runtime / profile</dt><dd>{selection?.providerId} / {selection?.modelId} · {requested?.profile}</dd></div><div><dt>Worktree</dt><dd>{state.engineering.context?.worktree ?? 'No worktree connected'}</dd></div><div><dt>Measurements</dt><dd>{measurement?.latencyMs ?? 'UNKNOWN'} ms · input {measurement?.usage?.inputTokens ?? 'UNKNOWN'} / output {measurement?.usage?.outputTokens ?? 'UNKNOWN'} tokens · cost {measurement?.estimatedCost?.amount != null ? `${measurement.estimatedCost.basis} ${measurement.estimatedCost.amount} ${measurement.estimatedCost.currency}` : 'UNKNOWN'}</dd></div></dl>
        <p className={styles.note}>Session-only proposal: retained while navigating Build; a new request or page reload clears it. No plan is stored on the server.</p>
        <PlanSystemMap plan={plan} />
        <nav className="dev-plan-index" aria-label="Plan architecture">{PLAN_SECTIONS.map((section, index) => <a key={section} href={`#plan-${index}`} onClick={() => { const detail = document.getElementById(`plan-${index}`); if (detail instanceof HTMLDetailsElement) detail.open = true; }}>{section.replaceAll('_', ' ')}</a>)}</nav>
        <div className="dev-plan-sections">{PLAN_SECTIONS.map((section, index) => <details id={`plan-${index}`} key={section} open={index < 3}><summary><span>{String(index + 1).padStart(2, '0')}</span><h3>{section.replaceAll('_', ' ')}</h3><span>{plan[section].length} items</span></summary><ul>{plan[section].map((line, i) => <li key={i}>{line}</li>)}</ul></details>)}</div>
        {stage === 'REVIEWING' || stage === 'EXECUTOR_NOT_CONNECTED' ? <aside className="dev-plan-review" aria-label="Execution review"><h3>Review before execution</h3><p>Proposed files and actions appear above. Planning has provider generation permission only; no shell, browser, Git write, MCP, plugin or skill tools were invoked. Execution risk is unverified until a trusted executor validates this proposal.</p><p>{selection?.reasons.join(' ')}</p><button type="button" onClick={() => setStage('EXECUTOR_NOT_CONNECTED')}>Check execution availability</button>{stage === 'EXECUTOR_NOT_CONNECTED' ? <p role="status">EXECUTOR_NOT_CONNECTED · This plan has no structured write executor. Connect and approve a trusted local execution environment. The public server cannot modify its deployed source.</p> : null}<Link href="/build/pipeline">Inspect real verification ↗</Link></aside> : null}
      </section> : null}
      {state.access === 'refused' ? <div className="dev-access-note"><span>Project, provider and environment details require an account.</span><Link href="/login?next=%2Fbuild">SIGN IN TO INSPECT ↗</Link></div> : state.error ? <p className="dev-access-note" role="status">{state.error}</p> : null}
    </section>
  </>;
}
