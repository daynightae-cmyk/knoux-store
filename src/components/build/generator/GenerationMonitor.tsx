'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { GENERATION_PROFILES, type GenerationProfile } from '@/lib/build/profile';
import { PLAN_SECTIONS } from '@/lib/build/engineering-plan';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import styles from './preview-workspace.module.css';

const phases = ['Resolve', 'Route', 'Plan', 'Review'];

export function GenerationMonitor({
  draft, onDraft, onCompile, onReview, planning,
}: {
  draft: string;
  onDraft: (value: string) => void;
  onCompile: (event: FormEvent<HTMLFormElement>) => void;
  onReview: () => void;
  planning: boolean;
}) {
  const { state, dispatch } = useBuildWorkspace();
  const { stage, plan, streamText, characters, selection, requested, error } = state.engineering;
  const active = stage === 'RESOLVING' ? 0 : stage === 'ROUTING' ? 1 : stage === 'GENERATING' ? 2 : plan ? 3 : -1;
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

      <form className={styles.compose} onSubmit={onCompile}>
        <label htmlFor="preview-build-intent">What are you building?</label>
        <textarea id="preview-build-intent" value={draft} maxLength={16000} rows={3} onChange={(event) => onDraft(event.target.value)} disabled={planning} />
        <div className={styles.composeActions}>
          <label>Generation profile
            <select value={state.ai.generationProfile} disabled={planning} onChange={(event) => dispatch({ type: 'ai/profile', profile: event.target.value as GenerationProfile })}>
              {GENERATION_PROFILES.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
            </select>
          </label>
          <button type="submit" className="bo-chip" disabled={!draft.trim() || planning}>Generate engineering plan</button>
        </div>
      </form>

      <dl className={styles.facts}>
        <div><dt>Routing</dt><dd>{(requested?.mode ?? state.ai.routingMode).toUpperCase()}</dd></div>
        <div><dt>Provider</dt><dd>{selection?.providerId ?? state.ai.providerId ?? 'Per request'}</dd></div>
        <div><dt>Model</dt><dd>{selection?.modelId ?? state.ai.modelId ?? 'Per request'}</dd></div>
      </dl>
      <ol className={styles.phases} aria-label="Planning stages">
        {phases.map((phase, index) => (
          <li key={phase} data-state={index === active ? 'active' : index < active ? 'done' : 'pending'} aria-current={index === active ? 'step' : undefined}>
            <span aria-hidden="true">{index < active ? '✓' : index + 1}</span>{phase}
          </li>
        ))}
      </ol>

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

      <footer className={styles.monitorFooter}>
        <span>Project checks · {state.verification?.checks.length ?? 'not run'}</span>
        <Link href="/build/pipeline">Open verification ↗</Link>
      </footer>
    </section>
  );
}
