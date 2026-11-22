'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRef, useState, type CSSProperties, type FormEvent, useEffect, useLayoutEffect } from 'react';
import type { NormalizedModel } from '@/lib/ai/types';
import type { BuildIntent } from '@/lib/build/types';
import type { EngineeringSession } from '@/lib/build/engineering-plan';
import { compileBuildIntent, summariseIntent } from '@/lib/build/intent';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { BuildEntryGate } from './BuildEntryGate';
import { workspaceFacts } from './workspace-facts';
import { useCanonicalModels } from '../generator/useCanonicalModels';
import { ComposerModelPicker } from '../generator/ComposerModelPicker';
import { GenerationProfileRail } from '../generator/GenerationProfileRail';
import { ModelControlsPanel } from '../generator/ModelControlsPanel';
import { SplitView } from '../generator/SplitView';
import { PlanSystemMap } from '../generator/PlanSystemMap';
import { GenerationMonitor, GenerationLifecycleRail, generationCheckoutScope, scopedEngineeringSession } from '../generator/GenerationMonitor';
import { GeneratedProjectExecution } from '../generator/GeneratedProjectExecution';
import previewStyles from '../generator/preview-workspace.module.css';
import { profileToControls } from '@/lib/build/profile';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import styles from '../generator/generator.module.css';
import { consumePlanStream, parseEngineeringPlan, canFallbackPlanError, PlanStreamError, ENGINEERING_PLAN_SYSTEM, PLAN_SECTIONS, planPrompt, type EngineeringPlan, type EngineeringStage } from '@/lib/build/engineering-plan';
import { KNOUX_BUILD_MODES, KNOUX_MODE_LABELS, KNOUX_MODE_DESCRIPTIONS, PRO_ROLES, proRoleSystem, proRolePrompt, initialProRoleRuns, aggregateProRuns, assertFinalProPlan, type ProRoleRun } from '@/lib/build/knoux-modes';
import { QUICK_INTENTS } from './quick-intents';

const Preview = dynamic(() => import('../surfaces/PreviewSurface').then((mod) => mod.PreviewSurface));
const Code = dynamic(() => import('../surfaces/CodeSurface').then((mod) => mod.CodeSurface));
const Registry = dynamic(() => import('./ProductMachine').then((mod) => mod.ProductMachine));

const INTENT_ICON_PATHS: Record<string, string> = {
  'WEB APP': 'M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16',
  'DESKTOP APP': 'M3 5h18v11H3zM9 20h6M12 16v4',
  ANDROID: 'M7 9h10v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zM7 9a5 5 0 0 1 10 0M4 10v5M20 10v5M9 19v2M15 19v2',
  'SYSTEM TOOL': 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1',
};

function IntentIcon({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={INTENT_ICON_PATHS[label] ?? INTENT_ICON_PATHS['WEB APP']} />
    </svg>
  );
}

type GenerationRequest = { id: string; scope: string; controller: AbortController };

/** Acquired before the first await; an old finally can never release a newer lock. */
export function createGenerationRequestLock() {
  let active: GenerationRequest | null = null;
  return {
    start(scope: string) {
      if (active) return null;
      active = { id: crypto.randomUUID(), scope, controller: new AbortController() };
      return active;
    },
    peek: () => active,
    isCurrent: (request: GenerationRequest, scope: string) => active === request && request.scope === scope && !request.controller.signal.aborted,
    cancel(request = active) {
      if (!request || active !== request) return null;
      active = null;
      request.controller.abort();
      return request;
    },
    finish(request: GenerationRequest) { if (active === request) active = null; },
  };
}

type PlanTransport = (url: string, body: unknown) => Promise<Response>;
type PlanRuntime = { decision: { selected?: { providerId: string; modelId: string }; reasons: string[]; fallbackChain?: { providerId: string; modelId: string }[]; blocker?: string | null }; state?: string };

/** Resolve the canonical runtime for one pass. Shared by Standard and every PRO role. */
export async function resolvePlanRuntime({ post, requirement, mode, profile, manualSelection, update }: {
  post: PlanTransport;
  requirement: string;
  mode: 'auto' | 'manual';
  profile: NonNullable<EngineeringSession['requested']>['profile'];
  manualSelection: { providerId: string | null; modelId: string | null };
  update: (patch: Partial<EngineeringSession>) => void;
}): Promise<{ runtime: PlanRuntime; selected: { providerId: string; modelId: string } } | null> {
  const prepared = await post('/api/build/ai/prepare', { prompt: requirement, mode, generationProfile: profile, manualSelection });
  if (prepared.status === 401 || prepared.status === 403) { update({ stage: 'AUTH_REQUIRED', error: 'Sign in with an authorized Build account to use the provider runtime.' }); return null; }
  if (!prepared.ok) throw new Error(prepared.status === 400 ? 'Select a discovered provider/model for MANUAL routing.' : 'The canonical provider runtime could not resolve this request.');
  const runtime = await prepared.json() as PlanRuntime;
  if (!runtime.decision?.selected) { update({ stage: runtime.state === 'CONFIG_REQUIRED' ? 'CONFIG_REQUIRED' : 'PROVIDER_BLOCKED', error: runtime.decision?.blocker ?? 'No runtime-eligible provider is available.' }); return null; }
  return { runtime, selected: runtime.decision.selected };
}

/** One bounded provider pass with the existing stream-first, canonical-fallback contract. */
export async function executePlanPass({ post, runtime, selected, mode, profile, models, system, messages, isCurrent, update, record }: {
  post: PlanTransport;
  runtime: PlanRuntime;
  selected: { providerId: string; modelId: string };
  mode: 'auto' | 'manual';
  profile: NonNullable<EngineeringSession['requested']>['profile'];
  models: NormalizedModel[];
  system: string;
  messages: { role: string; content: string }[];
  isCurrent: () => boolean;
  update: (patch: Partial<EngineeringSession>) => void;
  record: (message: string) => void;
}): Promise<{ plan: EngineeringPlan; terminal: NonNullable<EngineeringSession['measurement']> }> {
  const selectedModel = models.find((model) => model.providerId === selected.providerId && model.modelId === selected.modelId);
  const controls = profileToControls(profile, selectedModel).controls;
  const stream = await post('/api/build/ai/stream', { ...selected, generationProfile: profile, system, messages, controls });
  if (stream.status === 401 || stream.status === 403) throw new PlanStreamError('The runtime refused access. No plan was generated.', 'AUTHENTICATION');
  if (!stream.ok || !stream.body) throw new Error('The provider stream could not be opened.');
  update({ stage: 'GENERATING' });
  try {
    const result = await consumePlanStream(stream.body, (characters) => { if (isCurrent()) update({ characters }); }, (draftPlan) => { if (isCurrent()) update({ draftPlan }); }, (streamText) => { if (isCurrent()) update({ streamText }); });
    record(`Engineering plan generated by ${selected.providerId}/${selected.modelId}. No project mutations.`);
    return { plan: result.plan, terminal: result.terminal };
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') throw cause; // Cancellation must never charge a fallback.
    const alternatives = runtime.decision.fallbackChain;
    if (mode === 'manual' || !alternatives?.length || !canFallbackPlanError(cause)) throw cause;
    const [primary, ...fallbackChain] = alternatives;
    update({ draftPlan: null, streamText: '' });
    const response = await post('/api/build/ai/generate', { ...primary, fallbackChain, generationProfile: profile, system, messages, controls });
    if (!response.ok) throw new Error('The canonical fallback runtime refused this request.');
    const result = await response.json();
    if (!result.ok || !result.actualProviderId || !result.routedModelId) throw new Error(result.error?.safeMessage ?? 'No eligible fallback completed the plan.');
    const artifact = parseEngineeringPlan(result.text);
    update({ selection: { ...selected, reasons: [...runtime.decision.reasons, `Requested ${selected.providerId}/${selected.modelId}. Streaming failed; canonical generation fallback used ${result.actualProviderId}/${result.routedModelId}; actual model ${result.actualModelId ?? 'UNKNOWN'}. ${1 + (result.fallbackCount ?? 0)} fallback attempts.`] } });
    record(`Engineering plan generated by fallback ${result.actualProviderId}/${result.actualModelId}. Requested ${selected.providerId}/${selected.modelId}. No project mutations.`);
    return { plan: artifact, terminal: result };
  }
}

/** The shipped request pipeline, also exercised with deferred transports in tests. */
export async function generateEngineeringProposal({ request, requirement, mode, profile, manualSelection, models, messages, isCurrent, update, record }: {
  request: GenerationRequest;
  requirement: string;
  mode: 'auto' | 'manual';
  profile: NonNullable<EngineeringSession['requested']>['profile'];
  manualSelection: { providerId: string | null; modelId: string | null };
  models: NormalizedModel[];
  messages: { role: string; content: string }[];
  isCurrent: () => boolean;
  update: (patch: Partial<EngineeringSession>) => void;
  record: (message: string) => void;
}) {
  const signal = request.controller.signal;
  const assertCurrent = () => { if (!isCurrent() || signal.aborted) throw new DOMException('Planning request cancelled or superseded.', 'AbortError'); };
  const post = async (url: string, body: unknown) => {
    assertCurrent();
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
    assertCurrent();
    return response;
  };
  try {
    const resolved = await resolvePlanRuntime({ post, requirement, mode, profile, manualSelection, update });
    if (!resolved) return;
    assertCurrent();
    const { runtime, selected } = resolved;
    update({ selection: { ...selected, reasons: runtime.decision.reasons }, stage: 'ROUTING' });
    // A fallback pass rewrites the selection evidence; keep it so the terminal
    // patch lands the proposal and its routing evidence together.
    let fallbackSelection: EngineeringSession['selection'] = null;
    const passUpdate = (patch: Partial<EngineeringSession>) => { if (patch.selection) fallbackSelection = patch.selection; update(patch); };
    const { plan, terminal } = await executePlanPass({ post, runtime, selected, mode, profile, models, system: ENGINEERING_PLAN_SYSTEM, messages, isCurrent, update: passUpdate, record });
    assertCurrent();
    update({ ...(fallbackSelection ? { selection: fallbackSelection } : {}), plan, measurement: terminal, stage: 'PLANNED', execution: null });
  } catch (cause) {
    if (!isCurrent() || signal.aborted) return;
    if ((cause instanceof Error && cause.name === 'AbortError') || (cause instanceof PlanStreamError && cause.category === 'ABORTED')) { update({ stage: 'CANCELLED', error: null }); return; }
    update({ stage: cause instanceof PlanStreamError && cause.category === 'AUTHENTICATION' ? 'AUTH_REQUIRED' : 'PROVIDER_BLOCKED', error: cause instanceof Error ? cause.message : 'Planning failed.' });
  }
}

/**
 * KNOUX PRO — five sequential role passes through the SAME canonical engine.
 * Each role is one measured provider request; a failed role halts the chain
 * and the last complete proposal is retained honestly. No fabricated progress:
 * the ledger only advances on real terminal measurements.
 */
export async function generateProProposal({ request, requirement, intent, context, mode, profile, manualSelection, models, isCurrent, update, record }: {
  request: GenerationRequest;
  requirement: string;
  intent: BuildIntent;
  context: { project: string | null; worktree: string | null; branch: string | null };
  mode: 'auto' | 'manual';
  profile: NonNullable<EngineeringSession['requested']>['profile'];
  manualSelection: { providerId: string | null; modelId: string | null };
  models: NormalizedModel[];
  isCurrent: () => boolean;
  update: (patch: Partial<EngineeringSession>) => void;
  record: (message: string) => void;
}) {
  const signal = request.controller.signal;
  const assertCurrent = () => { if (!isCurrent() || signal.aborted) throw new DOMException('Planning request cancelled or superseded.', 'AbortError'); };
  const post = async (url: string, body: unknown) => {
    assertCurrent();
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
    assertCurrent();
    return response;
  };
  const runs = initialProRoleRuns();
  const publishRuns = () => update({ proRuns: runs.map((run) => ({ ...run })) });
  let plan: EngineeringPlan | null = null;
  let characters = 0;
  const patchRun = (index: number, patch: Partial<ProRoleRun>) => { runs[index] = { ...runs[index], ...patch }; publishRuns(); };
  publishRuns();
  try {
    for (let index = 0; index < PRO_ROLES.length; index++) {
      const role = PRO_ROLES[index];
      assertCurrent();
      patchRun(index, { status: 'PENDING', error: null });
      const resolved = await resolvePlanRuntime({ post, requirement, mode, profile, manualSelection, update });
      if (!resolved) { patchRun(index, { status: 'FAILED', error: 'The canonical runtime could not resolve this role.' }); return; }
      assertCurrent();
      const { runtime, selected } = resolved;
      update({ selection: { ...selected, reasons: [...runtime.decision.reasons, `KNOUX PRO pass ${index + 1}/${PRO_ROLES.length} · ${role}`] }, stage: 'ROUTING' });
      patchRun(index, { providerId: selected.providerId, modelId: selected.modelId });
      const messages = [{ role: 'user', content: proRolePrompt(role, intent, context, plan ?? undefined) }];
      const passUpdate = (patch: Partial<EngineeringSession>) => {
        if (!isCurrent()) return;
        if (typeof patch.characters === 'number') update({ characters: characters + patch.characters });
        const { characters: _characters, ...rest } = patch;
        if (Object.keys(rest).length) update(rest);
      };
      try {
        const result = await executePlanPass({ post, runtime, selected, mode, profile, models, system: proRoleSystem(role), messages, isCurrent, update: passUpdate, record });
        assertCurrent();
        plan = result.plan;
        const terminal = result.terminal;
        characters = Object.values(result.plan).reduce((total, value) => total + (Array.isArray(value) ? value.join('\n').length : 0), characters);
        patchRun(index, { status: 'COMPLETE', providerId: terminal.actualProviderId ?? selected.providerId, modelId: terminal.actualModelId ?? selected.modelId, latencyMs: terminal.latencyMs ?? null, usage: terminal.usage ?? null, error: null });
        update({ plan: result.plan, measurement: terminal, draftPlan: null, streamText: '' });
        record(`KNOUX PRO ${role} pass completed by ${terminal.actualProviderId ?? selected.providerId}/${terminal.actualModelId ?? selected.modelId}. No project mutations.`);
      } catch (cause) {
        if (!isCurrent() || signal.aborted) throw cause;
        if (cause instanceof Error && cause.name === 'AbortError') throw cause;
        if (cause instanceof PlanStreamError && cause.category === 'ABORTED') throw cause;
        const message = cause instanceof Error ? cause.message : 'Role pass failed.';
        patchRun(index, { status: 'FAILED', error: message });
        update({ stage: cause instanceof PlanStreamError && cause.category === 'AUTHENTICATION' ? 'AUTH_REQUIRED' : 'PROVIDER_BLOCKED', error: `KNOUX PRO ${role} pass failed: ${message}${plan ? ' The last complete proposal is retained.' : ''}` });
        return;
      }
    }
    assertCurrent();
    if (!plan) throw new Error('The PRO chain produced no proposal.');
    // The Reviewer artifact re-enters through the same parser the reducer
    // enforces; a malformed final never reaches PLANNED.
    const finalPlan = assertFinalProPlan(plan);
    const totals = aggregateProRuns(runs);
    update({ plan: finalPlan, stage: 'PLANNED', execution: null, measurement: { latencyMs: totals.latencyMs, usage: totals.usage, actualProviderId: runs.at(-1)?.providerId ?? null, actualModelId: runs.at(-1)?.modelId ?? null } });
    record(`KNOUX PRO chain complete: ${totals.completed}/${totals.total} measured passes. No project mutations.`);
  } catch (cause) {
    const cancelled = signal.aborted || (cause instanceof Error && cause.name === 'AbortError') || (cause instanceof PlanStreamError && cause.category === 'ABORTED');
    if (cancelled) {
      const active = runs.findIndex((run) => run.status === 'PENDING');
      if (active >= 0) runs[active] = { ...runs[active], status: 'CANCELLED' };
      update({ proRuns: runs.map((run) => ({ ...run })), stage: 'CANCELLED', error: null });
      return;
    }
    if (!isCurrent()) return;
    update({ stage: cause instanceof PlanStreamError && cause.category === 'AUTHENTICATION' ? 'AUTH_REQUIRED' : 'PROVIDER_BLOCKED', error: cause instanceof Error ? cause.message : 'Planning failed.' });
  }
}

export function DevWorkspaceHome() {
  const { state, dispatch } = useBuildWorkspace();
  const [draftOverride, setDraftOverride] = useState<string | null>(null);
  const surface = state.workspace.activeSurface;
  const view = surface === 'preview' || surface === 'code' ? surface : surface === 'data' ? 'registry' : 'build';
  const setView = (view: 'build' | 'preview' | 'code' | 'registry') => dispatch({ type: 'surface/active', surface: view === 'build' ? 'genesis' : view === 'registry' ? 'data' : view });
  const input = useRef<HTMLTextAreaElement>(null);
  const planPanel = useRef<HTMLElement>(null);
  const draft = draftOverride ?? state.intent?.rawInput ?? '';
  const facts = workspaceFacts(state);
  const scope = generationCheckoutScope(state);
  const currentScope = useRef(scope);
  const [requests] = useState(createGenerationRequestLock);
  const engineering = scopedEngineeringSession(state);
  const { stage, plan, draftPlan, streamText, requested, error: planError, selection, characters, measurement } = engineering;
  const setStage = (stage: EngineeringStage) => { if (engineering.requestId) dispatch({ type: 'engineering/update', requestId: engineering.requestId, patch: { stage } }); };
  useLayoutEffect(() => {
    currentScope.current = scope;
    return () => {
      const request = requests.peek();
      if (request?.scope === scope && requests.cancel(request)) {
        dispatch({ type: 'engineering/update', requestId: request.id, patch: { stage: 'CANCELLED', error: null } });
      }
    };
  }, [scope, requests, dispatch]);

  function cancelPlanning() {
    const request = requests.peek();
    if (!request || !requests.isCurrent(request, currentScope.current)) return;
    requests.cancel(request);
    dispatch({ type: 'engineering/update', requestId: request.id, patch: { stage: 'CANCELLED', error: null } });
  }
  const intelligence = useCanonicalModels();
  const chosenModel = intelligence.models.find((model) => model.providerId === (selection?.providerId ?? state.ai.providerId) && model.modelId === (selection?.modelId ?? state.ai.modelId)) ?? null;
  const planning = ['RESOLVING', 'ROUTING', 'GENERATING'].includes(stage);
  const [showSplitView, setShowSplitView] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(44);
  const [compactPanel, setCompactPanel] = useState<'preview' | 'generation'>('preview');

  const modelPicker = (
    <ComposerModelPicker
      models={intelligence.models}
      providers={intelligence.providers}
      selected={state.ai.routingMode === 'manual' && state.ai.providerId && state.ai.modelId ? { providerId: state.ai.providerId, modelId: state.ai.modelId } : null}
      routingMode={state.ai.routingMode}
      onSelect={(model) => { dispatch({ type: 'ai/routing-mode', mode: 'manual' }); dispatch({ type: 'ai/selection', providerId: model.providerId, modelId: model.modelId }); }}
      onSetAuto={() => dispatch({ type: 'ai/routing-mode', mode: 'auto' })}
      disabled={planning}
      loading={intelligence.loading}
      error={intelligence.error}
    />
  );

  // Auto-grow the composer textarea so the full intent stays visible.
  useEffect(() => {
    const target = input.current;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${Math.max(target.scrollHeight, 72)}px`;
  }, [draft, planning, view]);

  function reviewFromPreview() {
    setStage('REVIEWING');
    setView('build');
    requestAnimationFrame(() => planPanel.current?.focus());
  }

  async function compile(event: FormEvent<HTMLFormElement>, revision?: { text: string; previousPlan: EngineeringPlan }) {
    event.preventDefault();
    const requirement = revision?.text.trim() ?? draft.trim();
    if (!requirement || planning || currentScope.current !== scope) return;
    const request = requests.start(scope);
    if (!request) return;
    const isCurrent = () => requests.isCurrent(request, currentScope.current);
    const context = { project: state.project?.name ?? null, worktree: state.project?.root ?? null, branch: state.git?.branch ?? null, projectRef: state.projectRef, projectId: state.project?.id ?? null, headSha: state.git?.headSha ?? null };
    const update = (patch: Partial<EngineeringSession>) => { if (isCurrent()) dispatch({ type: 'engineering/update', requestId: request.id, patch }); };
    const record = (message: string) => { if (isCurrent()) dispatch({ type: 'activity/record', message }); };
    const buildMode = state.ai.buildMode;
    dispatch({ type: 'engineering/begin', requestId: request.id, context, requested: { mode: state.ai.routingMode, profile: state.ai.generationProfile, providerId: state.ai.routingMode === 'manual' ? state.ai.providerId : null, modelId: state.ai.routingMode === 'manual' ? state.ai.modelId : null, buildMode } });
    const intent = compileBuildIntent(requirement);
    dispatch({ type: 'intent/compiled', intent });
    try {
      if (buildMode === 'PRO' && !revision) {
        await generateProProposal({ request, requirement, intent, context, mode: state.ai.routingMode, profile: state.ai.generationProfile, manualSelection: { providerId: state.ai.providerId, modelId: state.ai.modelId }, models: intelligence.models, isCurrent, update, record });
      } else {
        const messages = [{ role: 'user', content: planPrompt(intent, context, revision?.previousPlan) }];
        await generateEngineeringProposal({ request, requirement, mode: state.ai.routingMode, profile: state.ai.generationProfile, manualSelection: { providerId: state.ai.providerId, modelId: state.ai.modelId }, models: intelligence.models, messages, isCurrent, update, record });
      }
    } finally {
      if (isCurrent()) intelligence.refresh();
      requests.finish(request);
    }
  }

  return <>
    <BuildEntryGate />
    <section className={`dev-observatory dev-observatory--${view}`} aria-label="Build workspace">
      <header className="dev-stage-head">
        <span className="dev-mini-label">KNOuX / ENGINEERING ENVIRONMENT</span>
        <div className="dev-stage-views" role="group" aria-label="Workspace view">
          {(['build', 'preview', 'code', 'registry'] as const).map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item.toUpperCase()}</button>)}
        </div>
      </header>
      <details className="dev-context-rail" open={view !== 'preview'}><summary><span>{state.project?.name ?? 'Project not connected'}</span><span>{state.git?.branch ?? 'No branch'}</span><span>{state.engineering.host?.name ?? 'Host unmeasured'}</span><span>{KNOUX_MODE_LABELS[state.ai.buildMode]}</span><span>{selection?.modelId ?? state.ai.modelId ?? 'Model per request'}</span><span>{state.ai.routingMode.toUpperCase()}</span><b>Context ↓</b></summary><dl className="dev-home-context"><div><dt>PROJECT / WORKTREE</dt><dd>{state.project?.root ?? 'NOT CONNECTED'}</dd></div><div><dt>HOST</dt><dd>{state.engineering.host?.kind ?? facts.environment}</dd></div><div><dt>PROVIDER</dt><dd>{facts.provider}</dd></div><div><dt>AGENT / TOOLS</dt><dd>Logical planning profile · provider planning only</dd></div></dl></details>
      {view === 'build' ? <div className="dev-universe">
        <div className="dev-universe__orbit" aria-hidden="true" />
        <div className="dev-build-center">
          <p className="dev-build-center__eyebrow">KNOuX STORE</p>
          <h1>Welcome to KNOUX STORE</h1>
          <p className="dev-welcome-lede">A cinematic engineering platform.</p>
          <div className="dev-welcome-orbit">
            <svg className="dev-welcome-orbit__rings" viewBox="0 0 900 360" preserveAspectRatio="none" aria-hidden="true">
              <g fill="none" stroke="#c9a2ff" strokeWidth="1.1">
                <ellipse cx="450" cy="185" rx="430" ry="120" opacity=".5" />
                <ellipse cx="450" cy="192" rx="300" ry="72" opacity=".38" transform="rotate(-5 450 192)" />
              </g>
              {[[120,120],[330,86],[590,86],[790,130],[168,268],[735,268],[450,300]].map(([x,y])=><g key={x}><circle cx={x} cy={y} r="4.5" fill="#c07cff" opacity=".8"/><circle cx={x} cy={y} r="2" fill="#fff"/></g>)}
            </svg>
            <Link href="/build/pipeline" className="dev-welcome-pill dev-welcome-pill--build"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5" /></svg>Build</Link>
            <Link href="/build/providers" className="dev-welcome-pill dev-welcome-pill--providers"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0Z M12 16v5" /></svg>Providers</Link>
            <Link href="/build/ai/models" className="dev-welcome-pill dev-welcome-pill--models"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5" /></svg>Models</Link>
            <Link href="/build/terminal" className="dev-welcome-pill dev-welcome-pill--terminal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l5 6-5 6M12 18h8" /></svg>Terminal</Link>
            <Link href="/build/deployments" className="dev-welcome-pill dev-welcome-pill--deployments"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c4 2 6 6 6 10l-3 3h-6l-3-3c0-4 2-8 6-10Z M9 15l-2 5M15 15l2 5M12 11v.01" /></svg>Deployments</Link>
            <div className="dev-engine" data-stage={stage} data-reduced={state.preferences.motion === 'reduced' ? '' : undefined}>
            <svg className="dev-engine__glyph" viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`} aria-hidden="true">
              {MARK_PATHS.map(({ id, d }) => <path key={id} d={d} />)}
            </svg>
            <p><span role="status">ENGINE / {stage}</span><small aria-live="off">{planning ? `${characters.toLocaleString()} characters received` : stage === 'LISTENING' ? 'Describe a system. Resolve its architecture.' : stage === 'PLANNED' ? 'Proposal ready · review before execution' : stage === 'CANCELLED' ? 'Request aborted · no further output or fallback accepted' : stage === 'AUTH_REQUIRED' ? 'Provider access requires an authorized account' : stage === 'EXECUTOR_NOT_CONNECTED' ? 'Plan retained · trusted execution required' : 'Canonical engineering state'}</small></p>
            </div>
          </div>
          <div className="dev-knoux-modes" role="group" aria-label="KNOUX build mode">
            {KNOUX_BUILD_MODES.map((mode) => <button key={mode} type="button" className="dev-knoux-mode" data-mode={mode} aria-pressed={state.ai.buildMode === mode} disabled={planning} onClick={() => dispatch({ type: 'ai/build-mode', buildMode: mode })}><span className="dev-knoux-mode__name">{KNOUX_MODE_LABELS[mode]}</span><span className="dev-knoux-mode__desc">{KNOUX_MODE_DESCRIPTIONS[mode]}</span>{mode === 'PRO' ? <span className="dev-knoux-mode__roles" aria-hidden="true">{PRO_ROLES.join(' · ')}</span> : null}</button>)}
          </div>
          <div className="dev-composer-routing">
            {modelPicker}
          </div>
          <p className={styles.note}>{state.ai.routingMode === 'auto' ? 'AUTO uses RouterV2. Choosing a discovered model explicitly enters MANUAL.' : 'MANUAL uses the exact provider/model. No automatic fallback.'}</p>
          <form className="dev-floating-compose" onSubmit={(event) => void compile(event)}>
            <label className="dev-visually-hidden" htmlFor="dev-intent-input">Describe what you want to build</label>
            <textarea ref={input} id="dev-intent-input" maxLength={16000} disabled={planning} value={draft} onChange={(event) => setDraftOverride(event.target.value)} onInput={(event) => { const target = event.target as HTMLTextAreaElement; target.style.height = 'auto'; target.style.height = `${Math.max(target.scrollHeight, 72)}px`; }} placeholder="Describe what you want to build…" rows={2} style={{ height: 'auto', minHeight: 72 }} />
            <div className={`dev-floating-compose__tools ${previewStyles.homeTools}`}>
              <div className="dev-compose-modes" role="group" aria-label="Build actions"><span>BUILD</span><button type="button" className="dev-neon-btn dev-neon-btn--ghost" onClick={() => setView('preview')}>PREVIEW</button><Link href="/build/pipeline" className="dev-neon-btn dev-neon-btn--ghost">VERIFY ↗</Link></div>
              <div className={`dev-compose-actions ${previewStyles.homeActions}`}>{planning ? <button type="button" className={previewStyles.cancelButton} onClick={cancelPlanning}>Cancel planning</button> : null}<Link href="/build/docs" aria-label="Open project files" title="Docs & project files">▤</Link><Link href="/build/terminal" aria-label="Open terminal" title="Terminal">⌘</Link><button type="submit" className="dev-neon-btn dev-neon-btn--primary" disabled={!draft.trim() || planning} aria-label="Generate engineering plan" title="Generate a plan with the canonical provider runtime">↑</button></div>
            </div>
          </form>
          <GenerationProfileRail value={state.ai.generationProfile} onChange={(profile) => dispatch({ type: 'ai/profile', profile })} model={chosenModel} disabled={planning} />
          <ModelControlsPanel model={chosenModel} profile={state.ai.generationProfile} disabled={planning} />
          <div className="dev-card-grid dev-card-grid--intents" role="group" aria-label="Intent suggestions">{QUICK_INTENTS.slice(0, 4).map((item) => <button type="button" key={item.label} className="dev-card dev-card--interactive dev-quick-card" onClick={() => { setDraftOverride(item.prompt); input.current?.focus(); }}><span className="dev-quick-card__icon"><IntentIcon label={item.label} /></span><span className="dev-quick-card__text"><span className="dev-quick-card__label">{item.label}</span><span className="dev-quick-card__desc">{item.prompt}…</span></span><span className="dev-quick-card__arrow" aria-hidden="true">→</span></button>)}</div>
          <GenerationLifecycleRail state={state} session={engineering} />
          <p className="dev-compiler-note" aria-live="off">{stage}{planning ? ` · ${characters.toLocaleString()} characters received` : ''} · {selection ? `${selection.providerId} / ${selection.modelId}` : 'Canonical runtime · planning only'} · {KNOUX_MODE_LABELS[state.ai.buildMode]}</p>
          {engineering.proRuns?.length ? <div className="dev-pro-ledger" aria-label="KNOUX PRO role evidence"><p className="dev-mini-label">KNOUX PRO · MEASURED ROLE PASSES</p><ol>{engineering.proRuns.map((run) => <li key={run.role} data-status={run.status}><span className="dev-pro-ledger__role">{run.role}</span><span className="dev-pro-ledger__state">{run.status}</span><span className="dev-pro-ledger__runtime">{run.providerId ? `${run.providerId} / ${run.modelId}` : 'UNRESOLVED'}</span><span className="dev-pro-ledger__measure">{run.latencyMs != null ? `${run.latencyMs} ms` : 'latency UNKNOWN'} · in {run.usage?.inputTokens ?? 'UNKNOWN'} / out {run.usage?.outputTokens ?? 'UNKNOWN'}</span>{run.error ? <span className="dev-pro-ledger__error" role="status">{run.error}</span> : null}</li>)}</ol></div> : null}
          {requested ? <div className={styles.runtimeReading} aria-label="Requested and actual intelligence"><p>Requested: {requested.mode.toUpperCase()} · {requested.profile} · {requested.providerId ? `${requested.providerId} / ${requested.modelId}` : 'RouterV2 eligible selection'}</p><p>Routed endpoint: {selection ? `${selection.providerId} / ${selection.modelId}` : 'UNRESOLVED'}</p><p>Actual: {measurement?.actualProviderId ?? 'UNKNOWN'} / {measurement?.actualModelId ?? 'UNKNOWN'} · latency {measurement?.latencyMs ?? 'UNKNOWN'} ms · TTFT {measurement?.ttftMs ?? 'UNKNOWN'} ms</p>{measurement?.controlsUsed ? <p>Applied controls: output {measurement.controlsUsed.maxOutputTokens ?? 'provider default'} · temperature {measurement.controlsUsed.temperature ?? 'provider default'}</p> : null}{selection?.reasons.length ? <details><summary>Routing and fallback evidence</summary><ul>{selection.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details> : null}</div> : null}
          {streamText && !plan ? <details className={styles.streamEvidence}><summary>Provider text received · {characters.toLocaleString()} characters · unvalidated</summary><pre aria-live="off">{streamText}</pre></details> : null}
          <div className="dev-intent-reading" role="status">{state.intent ? summariseIntent(state.intent) : 'Describe your next system to compile its intent.'}</div>
        </div>
        <div className="dev-universe__caption"><span>PROJECT CONSTELLATION</span><button type="button" onClick={() => setView('registry')}>EXPLORE {facts.registryCount} PRODUCTS ↗</button></div>
      </div> : view === 'preview' ? (
        <div className={previewStyles.workspace} data-reduced={state.preferences.motion === 'reduced' ? '' : undefined}>
          <header className={previewStyles.workspaceHeading}>
            <div><span>BUILD / GENERATION</span><h1>Project preview</h1><p>Inspect the runtime while you plan and review changes.</p></div>
            <div className={previewStyles.desktopControls}>
              {!expandedPreview && <label className={previewStyles.resizeControl}>
                <span>Preview width <output>{previewWidth}%</output></span>
                <input type="range" min={36} max={64} value={previewWidth} onChange={(event) => setPreviewWidth(event.currentTarget.valueAsNumber)} aria-label="Preview width" aria-valuetext={`${previewWidth}%`} />
              </label>}
              <button type="button" className="bo-chip" aria-pressed={expandedPreview} onClick={() => setExpandedPreview((expanded) => !expanded)}>
                {expandedPreview ? 'Show generation panel' : 'Expand preview'}
              </button>
            </div>
          </header>
          <div className={previewStyles.compactControls} role="group" aria-label="Compact workspace panel">
            <button type="button" className="bo-chip" aria-pressed={compactPanel === 'preview'} onClick={() => setCompactPanel('preview')}>Preview</button>
            <button type="button" className="bo-chip" aria-pressed={compactPanel === 'generation'} onClick={() => setCompactPanel('generation')}>Generation</button>
          </div>
          <div className={previewStyles.layout} data-expanded={expandedPreview} data-compact-panel={compactPanel} style={{ '--preview-share': `${previewWidth}fr`, '--generation-share': `${100 - previewWidth}fr` } as CSSProperties}>
            <section className={previewStyles.preview} aria-label="Preview workspace"><Preview cinematic workspace /></section>
            <GenerationMonitor modelPicker={modelPicker} draft={draft} onDraft={setDraftOverride} onCompile={(event) => void compile(event)} planning={planning} engineering={engineering} onCancel={cancelPlanning} onReview={reviewFromPreview} onFollowUp={(event, text, previousPlan) => void compile(event, { text, previousPlan })} />
          </div>
        </div>
      ) : view === 'code' ? <div className={previewStyles.workspace}><header className={previewStyles.workspaceHeading}><div><span>BUILD / CHECKOUT</span><h1>Code Constellation</h1><p>Inspect the real source and file metadata for this checkout.</p></div></header><Code /></div>
        : <div className="dev-stage-surface"><h1 className="dev-surface-title">Product constellation</h1><Registry /></div>}
      {planError && view === 'build' ? <p className="dev-plan-error" role="alert">{planError} <Link href="/build/providers">Inspect providers ↗</Link></p> : null}
      {view === 'build' && !plan && draftPlan && Object.keys(draftPlan).length ? <PlanSystemMap plan={draftPlan} draft /> : null}
      {plan && view === 'build' ? <>
          <section ref={planPanel} tabIndex={-1} className="dev-engineering-plan" aria-label="Engineering plan">
            <header><div><span className="dev-mini-label">ENGINEERING ARTIFACT / PROPOSAL</span><h2>From intent to architecture.</h2></div><div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}><button type="button" className="dev-neon-btn dev-neon-btn--ghost" onClick={() => setStage('REVIEWING')}>Review plan</button><button type="button" className="dev-neon-btn dev-neon-btn--primary" onClick={() => setShowSplitView(true)}><span aria-hidden="true">▦</span> Open Preview & Code</button></div></header>
            <dl className="dev-plan-context"><div><dt>Agent</dt><dd>{requested?.buildMode === 'PRO' ? 'KNOUX PRO · Architect → Coder → UI Designer → Debugger → Reviewer' : 'KNOuX Architect · logical planning profile'} · {KNOUX_MODE_LABELS[requested?.buildMode ?? state.ai.buildMode]}</dd></div><div><dt>Runtime / profile</dt><dd>{selection?.providerId} / {selection?.modelId} · {requested?.profile}</dd></div><div><dt>Worktree</dt><dd>{state.engineering.context?.worktree ?? 'No worktree connected'}</dd></div><div><dt>Measurements</dt><dd>{measurement?.latencyMs ?? 'UNKNOWN'} ms · input {measurement?.usage?.inputTokens ?? 'UNKNOWN'} / output {measurement?.usage?.outputTokens ?? 'UNKNOWN'} tokens · cost {measurement?.estimatedCost?.amount != null ? `${measurement.estimatedCost.basis} ${measurement.estimatedCost.amount} ${measurement.estimatedCost.currency}` : 'UNKNOWN'}</dd></div></dl>
            <p className={styles.note}>Session-only proposal: retained while navigating Build; a new request or page reload clears it. No plan is stored on the server.</p>
            <PlanSystemMap plan={plan} />
            <nav className="dev-plan-index" aria-label="Plan architecture">{PLAN_SECTIONS.map((section, index) => <a key={section} href={`#plan-${index}`} onClick={() => { const detail = document.getElementById(`plan-${index}`); if (detail instanceof HTMLDetailsElement) detail.open = true; }}>{section.replaceAll('_', ' ')}</a>)}</nav>
            <div className="dev-plan-sections">{PLAN_SECTIONS.map((section, index) => <details id={`plan-${index}`} key={section} open={index < 3}><summary><span>{String(index + 1).padStart(2, '0')}</span><h3>{section.replaceAll('_', ' ')}</h3><span>{plan[section].length} items</span></summary><ul>{plan[section].map((line, i) => <li key={i}>{line}</li>)}</ul></details>)}</div>
            {stage === 'REVIEWING' || stage === 'EXECUTOR_NOT_CONNECTED' ? <aside className="dev-plan-review" aria-label="Execution review"><h3>Review before execution</h3><p>Proposed files and actions appear above. Planning has provider generation permission only; no shell, browser, Git write, MCP, plugin or skill tools were invoked. Execution risk is unverified until a trusted executor validates this proposal.</p><p>{selection?.reasons.join(' ')}</p>{plan.generatedProject ? <GeneratedProjectExecution artifact={plan.generatedProject} compact onReceipt={(execution) => { if (engineering.requestId) dispatch({ type: 'engineering/update', requestId: engineering.requestId, patch: { execution } }); }} /> : <><div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'16px'}}><button type="button" className="dev-neon-btn dev-neon-btn--ghost" onClick={() => setStage('EXECUTOR_NOT_CONNECTED')}>Check execution availability</button><Link href="/build/pipeline" className="dev-neon-btn dev-neon-btn--success"><span aria-hidden="true">⌁</span> Inspect real verification ↗</Link></div>{stage === 'EXECUTOR_NOT_CONNECTED' ? <p role="status">EXECUTOR_NOT_CONNECTED · This proposal has no bounded write executor. Connect and approve a trusted execution environment. The public server cannot modify its deployed source.</p> : null}</>}</aside> : null}
          </section>
          {showSplitView && <SplitView plan={plan} onClose={() => setShowSplitView(false)} onBackToPlan={() => setShowSplitView(false)} />}
        </> : null}
      {state.access === 'refused' ? <div className="dev-access-note"><span>Project, provider and environment details require an account.</span><Link href="/login?next=%2Fbuild">SIGN IN TO INSPECT ↗</Link></div> : state.error ? <p className="dev-access-note" role="status">{state.error}</p> : null}
    </section>
  </>;
}
