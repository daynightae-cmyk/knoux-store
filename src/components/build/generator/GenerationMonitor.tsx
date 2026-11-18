'use client';

import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { GENERATION_PROFILES, type GenerationProfile } from '@/lib/build/profile';
import { PLAN_SECTIONS, parseEngineeringPlan, type EngineeringPlan, type EngineeringSession } from '@/lib/build/engineering-plan';
import type { BuildWorkspaceState } from '@/lib/build/workspace-state';
import type { VerificationCheck } from '@/lib/build/types';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { currentWorkspaceVerificationChecks } from '../dev/verification-results';
import styles from './preview-workspace.module.css';

const phases = ['Resolve', 'Route', 'Plan', 'Review'];
type CheckoutState = Pick<BuildWorkspaceState, 'projectRef' | 'project' | 'git'>;
type RequestContext = NonNullable<EngineeringSession['context']> & { projectRef?: string | null; projectId?: string | null; headSha?: string | null };
type LifecycleStep = { name: string; status: string; evidence: string };

export function generationCheckoutScope(state: CheckoutState) {
  return JSON.stringify([state.projectRef, state.project?.id ?? null, state.project?.name ?? null, state.project?.root ?? null, state.git?.branch ?? null, state.git?.headSha ?? null]);
}

/** Legacy or other-checkout proposals cannot become current evidence. */
export function scopedEngineeringSession(state: CheckoutState & { engineering: EngineeringSession }): EngineeringSession {
  const session = state.engineering;
  const context = session.context as RequestContext | null;
  const sameCheckout = context && context.projectRef === state.projectRef && context.projectId === (state.project?.id ?? null)
    && context.project === (state.project?.name ?? null) && context.worktree === (state.project?.root ?? null)
    && context.branch === (state.git?.branch ?? null) && context.headSha === (state.git?.headSha ?? null);
  if (!sameCheckout) return { ...session, requestId: null, context: null, stage: 'LISTENING', plan: null, draftPlan: null, streamText: '', error: null, requested: null, selection: null, characters: 0, measurement: null };
  return session;
}

export function currentGenerationChecks(state: Pick<BuildWorkspaceState, 'projectRef' | 'git' | 'verification'>) {
  // This imported snapshot belongs to the native checkout, never an imported project.
  return currentWorkspaceVerificationChecks(state);
}

export function measuredGenerationCheck(check: VerificationCheck) {
  if (!['pass', 'fail'].includes(check.status) || !check.evidence.trim() || !check.ranAt || !Number.isFinite(Date.parse(check.ranAt))) return false;
  if (['build', 'test'].includes(check.id) && !check.command?.trim()) return false;
  if (check.command) return Number.isInteger(check.exitCode) && (check.status === 'pass' ? check.exitCode === 0 : check.exitCode !== 0);
  return true;
}

export function deriveGenerationLifecycle(state: Pick<BuildWorkspaceState, 'projectRef' | 'project' | 'git' | 'engineering' | 'verification'>, suppliedSession?: EngineeringSession): LifecycleStep[] {
  const session = scopedEngineeringSession({ ...state, engineering: suppliedSession ?? state.engineering });
  let proposal = false;
  if (session.plan) { try { parseEngineeringPlan(JSON.stringify(session.plan)); proposal = true; } catch { /* Partial output is not a proposal. */ } }
  const planning = ['RESOLVING', 'ROUTING', 'GENERATING'].includes(session.stage);
  const checks = currentGenerationChecks(state);
  const measured = checks.filter((check) => check.id !== 'deployment' && measuredGenerationCheck(check));
  const checkStep = (name: string, id: string): LifecycleStep => {
    const check = checks.find((check) => check.id === id);
    return { name, status: check && measuredGenerationCheck(check) ? check.status.toUpperCase() : check && ['blocked', 'unconfigured', 'not-applicable'].includes(check.status) ? check.status.toUpperCase().replaceAll('-', ' ') : 'NOT MEASURED', evidence: check ? `${check.label}: ${check.evidence}${check.exitCode !== null ? ` · exit ${check.exitCode}` : ''}` : 'No measured check for the current checkout SHA.' };
  };
  return [
    { name: 'Planning', status: session.stage === 'CANCELLED' ? 'CANCELLED' : proposal ? 'PROPOSAL RECEIVED' : planning ? 'IN PROGRESS' : session.error ? 'BLOCKED' : 'NOT STARTED', evidence: planning ? `${session.characters.toLocaleString()} provider characters received; not file execution.` : session.stage === 'CANCELLED' ? 'Request aborted. No further provider output or fallback accepted.' : 'Provider planning only; no project mutation.' },
    { name: 'Generated proposal', status: proposal ? 'READY FOR REVIEW' : 'NOT GENERATED', evidence: proposal ? `${PLAN_SECTIONS.length} validated sections; proposed files are not written files.` : 'A complete parsed engineering proposal is required.' },
    { name: 'Real file execution', status: 'UNCONNECTED', evidence: 'No structured write executor. Project write capability is not execution evidence.' },
    checkStep('Build', 'build'),
    checkStep('Test', 'test'),
    { name: 'Verification', status: measured.length ? 'MEASURED OUTCOMES' : 'NOT MEASURED', evidence: measured.length ? measured.map((check) => `${check.label}: ${check.status.toUpperCase()}${check.exitCode !== null ? ` (exit ${check.exitCode})` : ''}`).join(' · ') : 'No measured outcomes bound to the current native checkout SHA.' },
    { name: 'Deployment', status: 'UNCONNECTED', evidence: 'No deployment adapter. Environment and preview availability do not prove deployment.' },
  ];
}

export function GenerationLifecycleRail({ state, session, heading = 'h2' }: { state: BuildWorkspaceState; session?: EngineeringSession; heading?: 'h2' | 'h3' }) {
  const Heading = heading;
  return <section className={styles.lifecycle} aria-label="Generation evidence lifecycle">
    <Heading className={styles.lifecycleHeading}>Proposal → execution evidence</Heading>
    <p>Checkout checks are independent evidence, not proof this proposal was executed.</p>
    <ol>{deriveGenerationLifecycle(state, session).map((step) => <li key={step.name} data-status={step.status}><strong>{step.name}</strong><span>{step.status}</span><small>{step.evidence}</small></li>)}</ol>
  </section>;
}

export function GenerationMonitor({
  draft, onDraft, onCompile, onReview, onFollowUp, onCancel, planning, modelPicker, engineering,
}: {
  draft: string;
  onDraft: (value: string) => void;
  onCompile: (event: FormEvent<HTMLFormElement>) => void;
  onReview: () => void;
  onFollowUp: (event: FormEvent<HTMLFormElement>, text: string, previousPlan: EngineeringPlan) => void;
  onCancel: () => void;
  planning: boolean;
  modelPicker: ReactNode;
  engineering?: EngineeringSession;
}) {
  const { state, dispatch } = useBuildWorkspace();
  const session = scopedEngineeringSession({ ...state, engineering: engineering ?? state.engineering });
  const { stage, plan, streamText, characters, selection, requested, error } = session;
  const [followUp, setFollowUp] = useState('');
  const [submitted, setSubmitted] = useState<{ text: string; plan: EngineeringPlan; scope: string } | null>(null);
  const scope = generationCheckoutScope(state);
  const lastRevision = submitted?.scope === scope ? submitted : null;
  const revisionPlan = plan ?? lastRevision?.plan;
  const active = stage === 'RESOLVING' ? 0 : stage === 'ROUTING' ? 1 : stage === 'GENERATING' ? 2 : stage === 'REVIEWING' || stage === 'EXECUTOR_NOT_CONNECTED' ? 3 : -1;
  const phaseStates = [Boolean(selection), Boolean(selection && (plan || streamText)), Boolean(plan), false].map((done, index) => index === active ? 'active' : done ? 'done' : 'pending');
  const visibleSections = plan ? PLAN_SECTIONS.filter((section) => plan[section].length) : [];

  return (
    <section className={styles.monitor} aria-labelledby="generation-monitor-heading">
      <header className={styles.monitorHeader}>
        <div>
          <h2 id="generation-monitor-heading">Generation Process</h2>
          <p>Engineering plan and provider output</p>
        </div>
        <span className={styles.stage} data-active={planning} role="status">{stage.replaceAll('_', ' ')}</span>
      </header>

      <form className={styles.compose} onSubmit={(event) => { setSubmitted(null); setFollowUp(''); onCompile(event); }}>
        <label htmlFor="preview-build-intent">What are you building?</label>
        <textarea id="preview-build-intent" value={draft} maxLength={16000} rows={3} onChange={(event) => onDraft(event.target.value)} disabled={planning} />
        <div className={styles.composeActions}>
          <label>Generation profile
            <select value={state.ai.generationProfile} disabled={planning} onChange={(event) => dispatch({ type: 'ai/profile', profile: event.target.value as GenerationProfile })}>
              {GENERATION_PROFILES.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
            </select>
          </label>
          {planning ? <button type="button" className={styles.cancelButton} onClick={onCancel}>Cancel planning</button> : null}
          <button type="submit" className="bo-chip" disabled={!draft.trim() || planning}>Generate engineering plan</button>
        </div>
      </form>

      <dl className={styles.facts}>
        <div><dt>Routing</dt><dd>{(requested?.mode ?? state.ai.routingMode).toUpperCase()}</dd></div>
        <div><dt>Provider</dt><dd>{selection?.providerId ?? state.ai.providerId ?? 'Per request'}</dd></div>
        <div><dt>Model</dt><dd>{selection?.modelId ?? state.ai.modelId ?? 'Per request'}</dd></div>
      </dl>
      <details className={styles.intelligenceInspector}>
        <summary>Planning model and agent</summary>
        <p>KNOuX Architect · planning</p>
        {modelPicker}
        <Link href="/build/engineering?area=agents">Inspect agent access ↗</Link>
      </details>
      <ol className={styles.phases} aria-label="Planning stages">
        {phases.map((phase, index) => (
          <li key={phase} data-state={phaseStates[index]} aria-current={index === active ? 'step' : undefined}>
            <span aria-hidden="true">{index + 1}</span>{phase}
          </li>
        ))}
      </ol>
      <GenerationLifecycleRail state={state} session={session} heading="h3" />

      {error ? <p className={styles.monitorError} role="alert">{error} <Link href="/build/providers">Inspect providers</Link></p> : null}
      <div className={styles.output}>
        <div className={styles.outputHeader}>
          <strong>{plan ? 'Engineering plan' : 'Provider stream'}</strong>
          {characters > 0 ? <span>{characters.toLocaleString()} characters</span> : null}
        </div>
        {plan ? (
          <div className={styles.planSummary}>
            <p>{visibleSections.length} sections in the parsed proposal.</p>
            {visibleSections.slice(0, 3).map((section) => <p key={section}><strong>{section.replaceAll('_', ' ')}</strong> · {plan[section].length} items</p>)}
            <button className="bo-chip" type="button" onClick={onReview}>Review plan</button>
          </div>
        ) : streamText ? <pre tabIndex={0} aria-label="Unvalidated provider text">{streamText}</pre>
          : <p className={styles.outputEmpty}>{planning ? 'Waiting for provider output…' : 'Provider output will appear here during planning.'}</p>}
      </div>

      {revisionPlan ? <section className={styles.followUp} aria-labelledby="revision-heading">
        <h3 id="revision-heading">Revise the proposal</h3>
        {lastRevision && <p className={styles.previousRequest}><strong>Last follow-up</strong>{lastRevision.text}</p>}
        <form className={styles.compose} onSubmit={(event) => {
          event.preventDefault();
          const text = followUp.trim();
          if (!text || planning) return;
          setSubmitted({ text, plan: revisionPlan, scope });
          onFollowUp(event, text, revisionPlan);
        }}>
          <label htmlFor="preview-follow-up">What should change?</label>
          <textarea id="preview-follow-up" value={followUp} rows={2} maxLength={2000} disabled={planning} onChange={(event) => setFollowUp(event.target.value)} />
          <p>The provider receives your follow-up and an excerpt of the previous plan.</p>
          <button className="bo-chip" type="submit" disabled={!followUp.trim() || planning}>Generate revised plan</button>
        </form>
      </section> : null}

      <footer className={styles.monitorFooter}>
        <span>Current SHA checks · {currentGenerationChecks(state).length || 'not measured'}</span>
        <Link href="/build/pipeline">Open verification ↗</Link>
      </footer>
    </section>
  );
}
