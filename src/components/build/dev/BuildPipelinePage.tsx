'use client';

/**
 * Build — Build V3 reference 31, composed as Live Build Orchestration.
 *
 * A real context strip, seven orbital stations, a progress panel and the
 * three-column desk: the live session activity ledger, the current task with
 * the allowlisted verification runner, the measured output console and
 * honest diagnostics. The reference's "42%" bar and timed log fiction are
 * replaced by measured state: a running task shows an indeterminate pulse,
 * stations only advance on real evidence, and Pause/Cancel stay explicitly
 * disabled because this workspace cannot pause or cancel a host task.
 */
import { useEffect, useState } from 'react';
import { VERIFICATION_CHECKS } from '@/lib/build/verification';
import type { VerificationCheck } from '@/lib/build/types';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPanel } from './DevUI';
import { useWorkspaceVerification } from './useWorkspaceVerification';
import { workspaceFacts } from './workspace-facts';
import { currentWorkspaceVerificationChecks } from './verification-results';
import styles from './build-orchestration.module.css';
import operational from './operational-v3.module.css';

const checks = ['lint', 'typecheck', 'build', 'test'];

type RunnerState = { enabled: boolean; status: VerificationCheck };

/**
 * The runner read must not assume a shape it was not given.
 *
 * `GET /api/build/verify` answers 200 with a runner state or 401 with the
 * workspace boundary's refusal, which carries a `message` and no `status`. Storing
 * the refusal as runner state and then reading `runner.status.evidence` threw on
 * every production deployment, so the pipeline route rendered Next's error
 * boundary instead of this page — a crash caused by the security boundary working
 * correctly. The refusal is a fact to show, not a shape to assume.
 */
function readRunnerState(payload: unknown): RunnerState | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const candidate = payload as { enabled?: unknown; status?: unknown };
  if (typeof candidate.enabled !== 'boolean' || typeof candidate.status !== 'object' || candidate.status === null) {
    return null;
  }
  return candidate as RunnerState;
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

type StationState = 'pass' | 'running' | 'blocked' | 'pending';
const BLOCKED_STAGES = new Set(['CONFIG_REQUIRED', 'AUTH_REQUIRED', 'PROVIDER_BLOCKED', 'AGENT_UNAVAILABLE', 'EXECUTOR_NOT_CONNECTED']);

export function BuildPipelinePage() {
  const { state } = useBuildWorkspace();
  const verification = useWorkspaceVerification();
  const [runner, setRunner] = useState<RunnerState | null>(null);
  const { running, run } = verification;
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/build/verify', { cache: 'no-store' })
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        if (cancelled) return;
        const parsed = readRunnerState(payload);
        if (parsed) {
          setRunner(parsed);
          return;
        }
        // The boundary refused, or the host said something this page does not
        // understand. Either way the runner is not available, and the reason the
        // server gave is the reason shown.
        const message =
          typeof (payload as { message?: unknown })?.message === 'string'
            ? (payload as { message: string }).message
            : 'The verification runner is not available on this deployment.';
        setError(ok ? message : `${message} The runner is unavailable.`);
      })
      .catch(() => {
        if (!cancelled) setError('Runner state could not be read.');
      });
    return () => { cancelled = true; };
  }, []);

  const facts = workspaceFacts(state);
  const engineering = state.engineering;
  const currentChecks = currentWorkspaceVerificationChecks(state);
  const measuredChecks = !state.projectRef && state.git?.headSha && state.verification?.headSha === state.git.headSha ? state.verification.checks : [];
  const byId = new Map(currentChecks.map((check) => [check.id, check]));
  const reduced = state.preferences.motion === 'reduced';

  const checkState = (id: string): StationState => running === id ? 'running' : byId.get(id)?.status === 'pass' ? 'pass' : byId.get(id)?.status === 'fail' || byId.get(id)?.status === 'blocked' ? 'blocked' : 'pending';
  const planBlocked = BLOCKED_STAGES.has(engineering.stage);
  const stations: { label: string; state: StationState; evidence: string; icon: string }[] = [
    { label: 'Request', state: engineering.requested ? 'pass' : 'pending', evidence: engineering.requested ? 'Received' : 'Awaiting intent', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4Z' },
    { label: 'Planning', state: engineering.plan ? 'pass' : engineering.stage === 'GENERATING' || engineering.stage === 'ROUTING' || engineering.stage === 'RESOLVING' ? 'running' : planBlocked ? 'blocked' : 'pending', evidence: engineering.plan ? 'Plan ready' : engineering.stage === 'LISTENING' ? 'Not requested' : engineering.stage, icon: 'm12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5' },
    { label: 'Code', state: engineering.execution ? 'pass' : engineering.stage === 'EXECUTING' ? 'running' : 'pending', evidence: engineering.execution ? 'Applied receipt' : engineering.stage === 'EXECUTING' ? 'Executing' : 'No execution', icon: 'M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16' },
    { label: 'Build', state: checkState('build'), evidence: running === 'build' ? 'Running' : byId.get('build')?.status.toUpperCase() ?? 'Not run', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1M7.7 16.3l-2.1 2.1' },
    { label: 'Test', state: checkState('test'), evidence: running === 'test' ? 'Running' : byId.get('test')?.status.toUpperCase() ?? 'Not run', icon: 'M9 3h6M10 3v6l-5.5 9A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 9V3' },
    { label: 'Preview', state: state.runtime.url && state.runtime.status === 'running' ? 'pass' : 'pending', evidence: state.runtime.url ? state.runtime.status.toUpperCase() : 'No runtime', icon: 'M3 5h18v11H3Zm6 15h6m-3-4v4' },
    { label: 'Deploy', state: 'pending', evidence: 'Unconnected', icon: 'M12 15c5-4 7-8.5 7-12-3.5 0-8 2-12 7l-4 1 3 3 1 4 3 3 1-4Zm-5 6c-1-2-1-4 1-6' },
  ];

  const activeLabel = running ? VERIFICATION_CHECKS.find((item) => item.id === running)?.label ?? running : null;
  const failed = currentChecks.find((check) => check.status === 'fail' || check.status === 'blocked');
  const activity = state.activity.slice(0, 12);
  const activityKind = (message: string): string => /: pass|completed|loaded/i.test(message) ? 'pass' : /refused|failed|: fail|: blocked/i.test(message) ? 'fail' : /requested|requested:/i.test(message) ? 'running' : 'note';

  return (
    <div className={`dev-route ${operational.page} ${styles.page}`} data-reduced={reduced ? '' : undefined}>
      <dl className={styles.contextStrip}>
        <div className={styles.contextItem}><dt>PROJECT</dt><dd><Icon d="M3 7h6l2 2h10v10H3Z" />{facts.project}</dd></div>
        <div className={styles.contextItem}><dt>BRANCH</dt><dd><Icon d="M6 3v12m0 0a3 3 0 1 0 3 3m-3-3a3 3 0 0 1 3 3m6-15a3 3 0 1 0 0 .01M18 6v3a6 6 0 0 1-6 6H9" />{state.git?.branch ?? 'UNAVAILABLE'}</dd></div>
        <div className={styles.contextItem}><dt>ENVIRONMENT</dt><dd><Icon d="m12 3 9 5-9 5-9-5Zm-9 9 9 5 9-5" />{facts.environment}</dd></div>
        <div className={styles.contextItem}><dt>MODEL</dt><dd><Icon d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />{engineering.selection ? `${engineering.selection.providerId} / ${engineering.selection.modelId}` : state.ai.routingMode.toUpperCase()}</dd></div>
        <div className={styles.contextItem}><dt>AGENT</dt><dd><Icon d="M8 10h.01M16 10h.01M5 5h14v12H5Zm7 12v4m-4 0h8" />KNOuX Architect</dd></div>
        <div className={styles.session} data-live={Boolean(running) || engineering.stage === 'GENERATING' || undefined}>
          <strong><i aria-hidden="true" />Build Session</strong>
          <small>{running ? `RUNNING · ${running}` : engineering.stage === 'LISTENING' ? 'IDLE · NO ACTIVE REQUEST' : engineering.stage}</small>
        </div>
      </dl>

      <header className={styles.masthead}>
        <span className="dev-mini-label">BUILD / ORCHESTRATION</span>
        <h1>Live Build Orchestration</h1>
        <p>End-to-end build pipeline for your application. Track real progress, view activity, and resolve issues — every station below reports only what this session has measured.</p>
      </header>

      <ol className={styles.stations} aria-label="Build orchestration stations">
        {stations.map((station) => (
          <li key={station.label} className={styles.station} data-state={station.state}>
            <span className={styles.disc}><Icon d={station.icon} /></span>
            <span className={styles.chevron} aria-hidden="true">❯❯</span>
            <span className={styles.stationLabel}><i aria-hidden="true">{station.state === 'pass' ? '✓' : station.state === 'blocked' ? '!' : ''}</i>{station.label}</span>
            <small>{station.evidence}</small>
          </li>
        ))}
      </ol>

      <div className={styles.progressPanel} role="status">
        <span className={styles.progressPulse}><Icon d="M2 12h4l3-8 4 16 3-8h6" /></span>
        <span className={styles.progressText}>
          <strong>{activeLabel ? `Running ${activeLabel}…` : failed ? `${failed.id.toUpperCase()} needs attention` : engineering.stage === 'GENERATING' ? 'Planning in progress…' : 'No task running'}</strong>
          <small>{activeLabel ? 'Allowlisted host verification · progress is not fabricated.' : failed ? 'The last measured run reported a failure. Review the output console.' : 'Run an allowlisted check below. Percentage progress is never invented.'}</small>
        </span>
        <span className={styles.progressTrack} data-indeterminate={Boolean(activeLabel) || undefined} aria-hidden="true">{activeLabel ? <i /> : null}</span>
        <span className={styles.progressActions}>
          <button type="button" disabled title="Host verification tasks cannot be paused from this workspace.">❚❚ Pause</button>
          <button type="button" disabled title="No cancellation channel exists for a host task; aborting the response would not stop it.">◻ Cancel</button>
          <button type="button" disabled={!failed || !runner?.enabled || Boolean(running) || Boolean(verification.blocker(failed.id))} title={failed ? verification.blocker(failed.id) ?? `Re-run ${failed.id}` : 'No failed check to retry.'} onClick={() => { if (failed) void run(failed.id); }}>⟳ Retry</button>
        </span>
      </div>

      <div className={styles.desk}>
        <DevPanel title="Build Activity (Live)">
          {activity.length ? (
            <ol className={styles.activity}>
              {activity.map((event) => (
                <li key={event.id} data-kind={activityKind(event.message)}>
                  <i aria-hidden="true">{activityKind(event.message) === 'pass' ? '✓' : ''}</i>
                  <span><strong>{event.message}</strong></span>
                  <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>
                </li>
              ))}
            </ol>
          ) : <DevEmpty title="NO SESSION EVENTS" body="Real workspace events appear here as they happen. Nothing is pre-filled." />}
        </DevPanel>

        <div className={styles.deskColumn}>
          <DevPanel title="Current Task">
            <div className={styles.taskCard}>
              <header>
                <strong>{activeLabel ? `Verify · ${activeLabel}` : 'No task in flight'}</strong>
                <span className={`dev-tag ${activeLabel ? 'dev-tag--violet' : ''}`}>{activeLabel ? 'RUNNING' : 'IDLE'}</span>
              </header>
              <div className={styles.taskFile}>
                <span><Icon d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />{activeLabel ? `npm run ${running}` : 'Awaiting an allowlisted check'}</span>
                <small>{activeLabel ? 'Executing…' : ''}</small>
              </div>
            </div>
            <div className="dev-list">
              {checks.map((id) => {
                const check = byId.get(id);
                const label = VERIFICATION_CHECKS.find((item) => item.id === id)?.label ?? id;
                return (
                  <div key={id}>
                    <span><strong>{label}</strong><small>{check?.command ?? `npm run ${id}`}</small></span>
                    <span className="dev-list__actions">
                      <span className={`dev-tag ${check?.status === 'pass' ? 'dev-tag--ok' : ''}`}>{check?.status.toUpperCase() ?? 'NOT RUN'}</span>
                      <button type="button" disabled={!runner?.enabled || !!verification.blocker(id)} title={verification.blocker(id) ?? runner?.status.evidence ?? 'Verification runner unavailable'} onClick={() => void run(id)}>{running === id ? 'RUNNING' : 'RUN'}</button>
                    </span>
                  </div>
                );
              })}
            </div>
            {error || verification.error ? <p role="alert" className="dev-error">{error ?? verification.error}</p> : null}
            <p className="dev-note">{runner?.status.evidence ?? error ?? 'Reading runner configuration…'}</p>
          </DevPanel>

          <DevPanel title="Build Details">
            <dl className="dev-kv">
              <dt>Target</dt><dd>{state.project?.framework ?? 'UNAVAILABLE'}</dd>
              <dt>Branch</dt><dd>{state.git?.branch ?? 'UNAVAILABLE'}{state.git?.headSha ? ` (${state.git.headSha.slice(0, 7)})` : ''}</dd>
              <dt>Artifacts</dt><dd>—</dd>
              <dt>Package manager</dt><dd>{state.project?.packageManager ?? 'UNAVAILABLE'}</dd>
              <dt>Environment</dt><dd>{facts.environment}</dd>
            </dl>
          </DevPanel>
        </div>

        <div className={styles.deskColumn}>
          <DevPanel title="Build Output (Measured)">
            {measuredChecks.length ? <p className="dev-note">Last measured output · captured {state.verification?.capturedAt} · source {state.verification?.sourceState ?? 'unknown'}. WIP outcomes are bounded snapshots, not proof of current edited files; only clean, same-SHA measurements are pooled into checkout checks.</p> : null}
            <div className={styles.output}>
              {measuredChecks.length ? measuredChecks.map((check) => (
                <div key={check.id}>
                  <span>$ {check.command ?? check.id} · {check.status.toUpperCase()} · exit {check.exitCode ?? 'N/A'}</span>
                  <pre>{check.evidence}</pre>
                </div>
              )) : <DevEmpty title="NO BUILD OUTPUT" body="No measured task output belongs to this checkout SHA." />}
            </div>
          </DevPanel>

          <DevPanel title="Diagnostics">
            <div className={styles.diagnostics} data-tone={error || verification.error || failed ? 'bad' : currentChecks.length ? 'ok' : undefined}>
              <i aria-hidden="true">{error || verification.error || failed ? '!' : currentChecks.length ? '✓' : '·'}</i>
              <span>
                <strong>{error || verification.error ? 'Runner issue reported' : failed ? `${failed.id.toUpperCase()} failed in the last measured run` : currentChecks.length ? 'All pooled checks pass at this SHA' : 'No diagnostics measured yet'}</strong>
                <small>{error ?? verification.error ?? (failed ? 'Read the measured output above; retry when the cause is fixed.' : currentChecks.length ? 'This is a bounded measurement of the checkout, not a promise about edited files.' : 'Run an allowlisted verification to produce real diagnostics.')}</small>
              </span>
            </div>
            <DevEmpty title="PACKAGE & DEPLOY UNCONNECTED" body="There is no package or deployment adapter in this workspace. No release will be queued or implied." />
          </DevPanel>
        </div>
      </div>
    </div>
  );
}
