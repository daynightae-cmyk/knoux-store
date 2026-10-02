'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRef, useState, type FormEvent } from 'react';
import { compileBuildIntent, summariseIntent } from '@/lib/build/intent';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { BuildEntryGate } from './BuildEntryGate';
import { workspaceFacts } from './workspace-facts';

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

  function compile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.trim()) dispatch({ type: 'intent/compiled', intent: compileBuildIntent(draft) });
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
      {view === 'build' ? <div className="dev-universe">
        <div className="dev-universe__orbit" aria-hidden="true" />
        <dl className="dev-hud dev-hud--project"><dt>PROJECT</dt><dd>{facts.project}</dd>{state.git?.branch ? <><dt>BRANCH</dt><dd>{state.git.branch}</dd></> : null}</dl>
        <dl className="dev-hud dev-hud--runtime"><dt>RUNTIME</dt><dd>{facts.runtime}</dd><dt>PROVIDER</dt><dd>{facts.provider}</dd></dl>
        <div className="dev-build-center">
          <p className="dev-build-center__eyebrow">BUILD WITH KNOuX</p>
          <h1>What are we building today?</h1>
          <form className="dev-floating-compose" onSubmit={compile}>
            <label className="dev-visually-hidden" htmlFor="dev-intent-input">Describe what you want to build</label>
            <textarea ref={input} id="dev-intent-input" value={draft} onChange={(event) => setDraftOverride(event.target.value)} placeholder="Describe what you want to build…" rows={3} />
            <div className="dev-floating-compose__tools">
              <div className="dev-compose-modes" role="group" aria-label="Build actions"><span>BUILD</span><button type="button" onClick={() => setView('preview')}>PREVIEW</button><Link href="/build/pipeline">VERIFY ↗</Link></div>
              <div className="dev-compose-actions"><Link href="/build/docs" aria-label="Open project files" title="Docs & project files">▤</Link><Link href="/build/terminal" aria-label="Open terminal" title="Terminal">⌘</Link><button type="submit" disabled={!draft.trim()} aria-label="Compile intent" title="Compile intent locally">↑</button></div>
            </div>
          </form>
          <div className="dev-quick-intents" role="group" aria-label="Intent suggestions">{QUICK_INTENTS.map((item) => <button type="button" key={item.label} onClick={() => { setDraftOverride(item.prompt); input.current?.focus(); }}>{item.label}</button>)}</div>
          <p className="dev-compiler-note">Local intent compiler · no model call</p>
          <div className="dev-intent-reading" role="status">{state.intent ? summariseIntent(state.intent) : 'Describe your next system to compile its intent.'}</div>
        </div>
        <div className="dev-universe__caption"><span>PROJECT CONSTELLATION</span><button type="button" onClick={() => setView('registry')}>EXPLORE {facts.registryCount} PRODUCTS ↗</button></div>
      </div> : <div className="dev-stage-surface"><h1 className="dev-surface-title">{view === 'preview' ? 'Project preview' : 'Product constellation'}</h1>{view === 'preview' ? <Preview cinematic /> : <Registry />}</div>}
      {state.access === 'refused' ? <div className="dev-access-note"><span>Project, provider and environment details require an account.</span><Link href="/login?next=%2Fbuild">SIGN IN TO INSPECT ↗</Link></div> : state.error ? <p className="dev-access-note" role="status">{state.error}</p> : null}
    </section>
  </>;
}
