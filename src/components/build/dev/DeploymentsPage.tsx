'use client';

/**
 * Deployments — Build V3 reference 10, composed as the entire page.
 *
 * Masthead heading + six real views, four orbital release stations with
 * glass saucers over the planet limb, and a two-column release desk: the
 * commit ledger on the left, the release-evidence panel on the right.
 *
 * Every badge is derived from measured workspace state. An unobserved
 * environment reads UNVERIFIED, never LIVE; the reference's version numbers,
 * ETAs and "IN PROGRESS" releases are decorative fiction and are replaced by
 * the real git commit ledger and the real verification snapshot. No release
 * is invented and the promote action stays explicitly blocked until a
 * verified deployment trigger exists.
 */
import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import { checksById } from '@/lib/build/verification';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPanel } from './DevUI';
import styles from './operational-v3.module.css';
import s from './release-center.module.css';

type View = 'releases' | 'environments' | 'states' | 'variables' | 'history' | 'policies';
const VIEWS: readonly { id: View; label: string; icon: string }[] = [
  { id: 'releases', label: 'Releases', icon: 'M12 2c4 2 6 6 6 10l-3 3h-6l-3-3c0-4 2-8 6-10Z M9 15l-2 5M15 15l2 5M12 12v.01' },
  { id: 'environments', label: 'Environments', icon: 'm12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5' },
  { id: 'states', label: 'Build States', icon: 'M3 12h4l2-7 4 14 2-7h6' },
  { id: 'variables', label: 'Variables', icon: 'M8 4c-2 0-3 1-3 3v2c0 1-1 2-2 2 1 0 2 1 2 2v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1 1 2 2 2-1 0-2 1-2 2v2c0 2-1 3-3 3' },
  { id: 'history', label: 'History', icon: 'M12 8v4l3 2M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.4 2.6L21 8M21 3v5h-5' },
  { id: 'policies', label: 'Policies', icon: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6Z M9 12l2 2 4-4' },
];

const STATIONS = [
  { id: 'local', label: 'LOCAL', role: 'Development & testing', icon: 'M4 5h16v10H4Z M9 19h6M12 15v4' },
  { id: 'preview', label: 'PREVIEW', role: 'Feature validation', icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3' },
  { id: 'staging', label: 'STAGING', role: 'Pre-production & QA', icon: 'm12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5' },
  { id: 'production', label: 'PRODUCTION', role: 'Live release', icon: 'M12 2c4 2 6 6 6 10l-3 3h-6l-3-3c0-4 2-8 6-10Z M9 15l-2 5M15 15l2 5M12 12v.01' },
] as const;

type EnvironmentId = (typeof STATIONS)[number]['id'];

function Icon({ d, ...rest }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}><path d={d} /></svg>;
}

function relativeTime(at: string): string {
  const parsed = Date.parse(at);
  if (!Number.isFinite(parsed)) return 'TIME UNREADABLE';
  const minutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (minutes < 1) return 'JUST NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}H AGO`;
  return `${Math.round(hours / 24)}D AGO`;
}

export function DeploymentsPage() {
  const { state } = useBuildWorkspace();
  const [view, setView] = useState<View>('releases');
  const [environment, setEnvironment] = useState<EnvironmentId>('local');
  const viewButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = state.preferences.motion === 'reduced';
  const facts = state.integrations?.deployment;
  const reportedEnvironment = facts?.environment?.toLowerCase();
  const runtimeReported = state.runtime.status === 'running' && Boolean(state.runtime.url);
  const observed = (target: string) =>
    target === 'local'
      ? state.adapter.environment === 'local' && runtimeReported
      : reportedEnvironment === target && Boolean(facts?.deploymentId);
  const releaseId = facts?.deploymentId ?? null;
  const commits = state.git?.commits ?? [];
  const headSha = state.git?.headSha ?? null;
  const snapshot = state.verification;
  const checks = checksById(snapshot);
  const verificationCount = snapshot?.checks.length ?? 0;
  const currentCleanSource = snapshot?.sourceState === 'clean' && Boolean(headSha)
    && snapshot.headSha === headSha && state.git?.dirty === false;
  const buildReceipt = checks.get('build');
  const buildPassed = buildReceipt?.status === 'pass' && buildReceipt.exitCode === 0 && Boolean(buildReceipt.ranAt);
  const verificationPassed = ['lint', 'typecheck', 'test'].every((id) => {
    const check = checks.get(id);
    return check?.status === 'pass' && check.exitCode === 0 && Boolean(check.ranAt);
  });
  const steps = [
    { label: 'Build', detail: buildReceipt ? buildReceipt.status.toUpperCase() : 'NOT RUN', state: buildPassed && currentCleanSource ? 'done' : buildReceipt?.ranAt ? 'partial' : 'unknown', icon: 'm12 3 8 4.5v9L12 21l-8-4.5v-9Z M12 12l8-4.5M12 12v9M12 12 4 7.5' },
    { label: 'Verify', detail: verificationCount ? `${verificationCount} RECORDED CHECKS` : 'NOT RUN', state: verificationPassed && currentCleanSource ? 'done' : verificationCount ? 'partial' : 'unknown', icon: 'M4 12l5 5L20 6' },
    { label: 'Deploy', detail: releaseId ? releaseId.slice(0, 12) : 'UNVERIFIED', state: releaseId ? 'done' : 'unknown', icon: 'M12 2c4 2 6 6 6 10l-3 3h-6l-3-3c0-4 2-8 6-10Z M9 15l-2 5M15 15l2 5' },
    { label: 'Update', detail: 'NOT MEASURED', state: 'unknown', icon: 'M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4' },
  ] as const;
  const stationMeta = (id: string): [string, string][] => {
    if (id === 'local' && observed('local')) return [['branch', state.git?.branch ?? 'UNREAD'], ['head', headSha?.slice(0, 7) ?? 'UNREAD']];
    if (observed(id)) return [['release', (releaseId ?? '').slice(0, 12)], ['sha', facts?.sha?.slice(0, 7) ?? 'UNREAD']];
    return [['status', 'UNVERIFIED']];
  };
  const selectedEnvironment = STATIONS.find((station) => station.id === environment) ?? STATIONS[0];

  function moveView(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const delta = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : delta ? (index + delta + VIEWS.length) % VIEWS.length : null;
    if (next === null) return;
    event.preventDefault();
    setView(VIEWS[next].id);
    viewButtons.current[next]?.focus();
  }

  return <div className={`dev-route dev-route--wide ${styles.page} ${styles.deployment} ${s.page}`} data-reduced={reduced ? '' : undefined}>
    <header className={s.masthead}>
      <div className={s.mastheadText}>
        <span className="dev-mini-label">ENGINEERING / RELEASE CENTER</span>
        <h1>Deployments</h1>
        <p>Orbital release center for KNOuX. Promote, release, and operate across environments — every claim below is a measured fact, never a promise.</p>
        <div className={s.tabs} role="tablist" aria-label="Deployment views">
          {VIEWS.map((entry, index) => (
            <button key={entry.id} type="button" role="tab" id={`dep-tab-${entry.id}`} aria-selected={view === entry.id} aria-controls="dep-panel" tabIndex={view === entry.id ? 0 : -1} ref={(node) => { viewButtons.current[index] = node; }} onKeyDown={(event) => moveView(event, index)} onClick={() => setView(entry.id)}>
              <Icon d={entry.icon} />{entry.label}
            </button>
          ))}
        </div>
      </div>
      <div className={s.limb} aria-hidden="true" />
    </header>

    <div id="dep-panel" role="tabpanel" aria-labelledby={`dep-tab-${view}`}>
      {view === 'releases' ? (
        <>
          <section aria-label="Deployment environments">
            <h2 className={s.sectionHead}><span aria-hidden="true">+</span> Deployment Environments</h2>
            <ol className={s.stations}>
              {STATIONS.map((station, index) => {
                const isObserved = observed(station.id);
                return <li key={station.id} className={s.station} data-observed={isObserved}>
                  <span className={s.stationLabel}><Icon d={station.icon} />{station.label}</span>
                  <small className={s.stationRole}>{station.role}</small>
                  <span className={s.saucer} aria-hidden="true"><i /><i /><i /><b /><u /></span>
                  {index < STATIONS.length - 1 ? <span className={s.chevrons} aria-hidden="true">❯❯❯</span> : null}
                  <span className={s.badge} data-tone={isObserved ? 'ok' : 'none'}>{isObserved ? 'OBSERVED' : 'UNVERIFIED'}</span>
                  <span className={s.stationChips}>
                    {stationMeta(station.id).map(([label, value]) => <span key={label} className={s.chip}><Icon d="M6 3v12M6 15a3 3 0 1 0 3 3M18 9a3 3 0 1 0-3-3M18 9c0 4-6 3-9 6" /><em>{value}</em></span>)}
                  </span>
                  <button type="button" className={s.inspectStation} aria-pressed={station.id === environment} aria-controls="release-environment-evidence" onClick={() => setEnvironment(station.id)}>
                    Inspect {station.label.toLowerCase()}
                  </button>
                </li>;
              })}
            </ol>
            <section className={s.environmentEvidence} id="release-environment-evidence" aria-labelledby="release-environment-title" aria-live="polite">
              <div>
                <h3 id="release-environment-title">{selectedEnvironment.label}</h3>
                <p>{selectedEnvironment.role}</p>
              </div>
              <dl>
                {stationMeta(environment).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                {observed(environment) && environment !== 'local' && <div><dt>Source</dt><dd>{facts?.source ?? 'WITHHELD'}</dd></div>}
              </dl>
            </section>
          </section>

          <section aria-label="Release evidence">
            <h2 className={s.sectionHead}><span aria-hidden="true">+</span> Recent Releases</h2>
            <div className={s.desk}>
              <div className={s.ledger}>
                {commits.length === 0 ? (
                  <DevEmpty title="SOURCE UNREAD" body="The git ledger has not reported commits to this workspace. Release history cannot be invented from an unread source." />
                ) : (
                  <ol aria-label="Commit ledger">
                    {commits.slice(0, 5).map((commit) => (
                      <li key={commit.sha} data-head={commit.sha === headSha ? '' : undefined}>
                        <span className={s.ledgerIcon} aria-hidden="true"><Icon d={VIEWS[0].icon} /></span>
                        <span className={s.ledgerBody}>
                          <strong>{commit.sha.slice(0, 7)} {commit.sha === headSha ? <em className={s.tagHead}>HEAD</em> : null}</strong>
                          <small>{commit.subject}</small>
                        </span>
                        <time dateTime={commit.at}>{relativeTime(commit.at)}</time>
                      </li>
                    ))}
                  </ol>
                )}
                <p className={s.ledgerNote}>Commits are source history, not deployments. A commit is never shown as released without a deployment record.</p>
              </div>

              <section className={s.releasePanel} aria-label="Release evidence panel">
                <div className={s.releaseHead}>
                  <span className={s.releaseTile} aria-hidden="true"><Icon d={VIEWS[0].icon} /></span>
                  <div>
                    <h2>{releaseId ? `Release ${releaseId.slice(0, 12)}` : 'Release UNVERIFIED'}</h2>
                    <p>{releaseId ? 'DEPLOYMENT RECORD OBSERVED' : 'NO DEPLOYMENT RECORD IN THIS WORKSPACE'}</p>
                  </div>
                  <span className={s.promote} data-blocked="" title={state.adapter.blockers['deploy.trigger'] ?? 'No verified deployment trigger'}>
                    <Icon d="M8 5v14l11-7Z" /> Promote to Production · BLOCKED
                  </span>
                </div>
                <ol className={s.steps} aria-label="Release progression">
                  {steps.map((step, index) => <li key={step.label} data-state={step.state}>
                    <span className={s.stepIcon} aria-hidden="true"><Icon d={step.icon} strokeWidth={1.8} /></span>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                    {index < steps.length - 1 ? <i className={s.stepLink} aria-hidden="true" /> : null}
                  </li>)}
                </ol>
                <dl className={s.facts}>
                  <div><dt>Commit</dt><dd>{headSha?.slice(0, 12) ?? 'UNAVAILABLE'}</dd></div>
                  <div><dt>Branch</dt><dd>{state.git?.branch ?? 'UNAVAILABLE'}</dd></div>
                  <div><dt>Verification</dt><dd>{verificationCount ? `${verificationCount} RECORDED CHECKS` : 'NOT RUN'}</dd></div>
                  {snapshot && <div><dt>Verification source</dt><dd>{currentCleanSource ? 'CURRENT CLEAN REVISION' : 'SNAPSHOT ONLY'}</dd></div>}
                  <div><dt>Source</dt><dd>{facts?.source ?? 'WITHHELD'}</dd></div>
                  <div><dt>Environment</dt><dd>{facts?.environment ?? 'UNAVAILABLE'}</dd></div>
                  <div><dt>History</dt><dd>UNCONNECTED</dd></div>
                </dl>
                <p className={s.blockedNote}>{state.adapter.blockers['deploy.trigger'] ?? 'This workspace has no verified deployment trigger. Promotion requires an authorized release path.'} <Link href="/build/pipeline">Inspect verification ↗</Link></p>
              </section>
            </div>
          </section>
        </>
      ) : null}

      {view === 'environments' ? (
        <div className="dev-route__grid">
          <DevPanel title="Active runtime"><dl className="dev-kv"><dt>Origin</dt><dd>{state.runtime.url ? <a href={state.runtime.url} target="_blank" rel="noreferrer">{state.runtime.url} ↗</a> : 'UNAVAILABLE'}</dd><dt>Environment</dt><dd>{state.adapter.environment.toUpperCase()}</dd><dt>Serving</dt><dd>{runtimeReported ? 'RUNTIME REPORTED RUNNING' : 'UNVERIFIED'}</dd><dt>Deployment metadata source</dt><dd>{facts?.source ?? 'WITHHELD'}</dd><dt>Vercel environment</dt><dd>{facts?.environment ?? 'UNAVAILABLE'}</dd><dt>Vercel URL</dt><dd>{facts?.url ?? 'UNAVAILABLE'}</dd><dt>Deployment ID</dt><dd>{facts?.deploymentId ?? 'UNAVAILABLE'}</dd><dt>Release commit</dt><dd>{facts?.sha ?? 'UNAVAILABLE'}</dd></dl></DevPanel>
          <DevPanel title="Environments"><ol className={styles.releaseStations} aria-label="Release environment detail">{STATIONS.map((station) => {
            const isObserved = observed(station.id);
            return <li key={station.id} data-observed={isObserved}><i aria-hidden="true" /><strong>{station.id}</strong><small>{isObserved ? 'Observed environment' : 'Unverified'}</small></li>;
          })}</ol><p className="dev-note"><Link href="/build/pipeline">Inspect real verification ↗</Link></p></DevPanel>
        </div>
      ) : null}

      {view === 'states' ? (
        <div className="dev-route__grid">
          <DevPanel title="Build states"><ol className={s.stateList} aria-label="Build state progression">{steps.map((step) => <li key={step.label} data-state={step.state}><span className={s.stepIcon} aria-hidden="true"><Icon d={step.icon} /></span><strong>{step.label}</strong><small>{step.detail}</small></li>)}</ol></DevPanel>
          <DevPanel title="Verification snapshot">{state.verification ? <ul className={s.checkList}>{state.verification.checks.map((check) => <li key={check.id} data-status={check.status}><strong>{check.label}</strong><small>{check.status.toUpperCase()}</small></li>)}</ul> : <DevEmpty title="VERIFICATION NOT RUN" body="No verification snapshot has been recorded for this workspace. Run the verification pipeline to measure real checks." />}</DevPanel>
        </div>
      ) : null}

      {view === 'variables' ? (
        <DevPanel title="Environment variables — presence only">
          {state.environment.signals.length === 0 ? (
            <DevEmpty title="SIGNALS UNREAD" body="The environment probe has not reported variable names. Values are never transmitted; only presence and purpose are shown here." />
          ) : (
            <ul className={s.varList}>{state.environment.signals.map((signal) => <li key={signal.name}><code>{signal.name}</code><span data-present={signal.present ? '' : undefined}>{signal.present ? 'PRESENT' : 'ABSENT'}</span><small>{signal.scope.toUpperCase()} · {signal.purpose}</small></li>)}</ul>
          )}
        </DevPanel>
      ) : null}

      {view === 'history' ? (
        <DevPanel title="Deployment history">
          <DevEmpty title="HISTORY UNCONNECTED" body="No deployment history source is configured. Builds, release IDs, success rates and timestamps cannot be shown — and are not simulated." />
          <p className="dev-note"><Link href="/build/engineering">Inspect the engineering ledger ↗</Link></p>
        </DevPanel>
      ) : null}

      {view === 'policies' ? (
        <DevPanel title="Release operating boundaries">
          <ul className={s.policyList}>
            <li>A commit, a passing test run and a deployment are three distinct facts; the UI never collapses them into one badge.</li>
            <li>Promotion to any environment requires an explicitly authorized deployment trigger through the trusted executor; this workspace reports none.</li>
            <li>An environment without an observed deployment record reads UNVERIFIED — never LIVE, DEPLOYED or BUILDING.</li>
            <li>Release versions, ETAs and success rates are only shown when a deployment history source actually reports them.</li>
            <li>Environment variable values never leave the server; this page shows names, presence and purpose only.</li>
          </ul>
          <p className="dev-note"><Link href="/build/settings">Inspect workspace settings ↗</Link></p>
        </DevPanel>
      ) : null}
    </div>
  </div>;
}
