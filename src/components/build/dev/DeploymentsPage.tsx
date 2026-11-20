'use client';

/**
 * Deployments — NSIS reference 82232, Live Release Center.
 *
 * Four deployment stations over the planet limb, a raised-glass release panel
 * and the Build → Verify → Deploy → Update progression. Every badge is derived
 * from measured workspace state: an unobserved environment reads UNVERIFIED,
 * never LIVE, and no release version or timestamp is invented.
 */
import Link from 'next/link';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { DevEmpty, DevPanel } from './DevUI';
import styles from './operational-v3.module.css';
import s from './release-center.module.css';

const STATIONS = [
  { id: 'local', label: 'LOCAL', icon: 'M4 5h16v10H4Z M9 19h6M12 15v4' },
  { id: 'preview', label: 'PREVIEW', icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3' },
  { id: 'staging', label: 'STAGING', icon: 'm12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5' },
  { id: 'production', label: 'PRODUCTION', icon: 'M12 2c4 2 6 6 6 10l-3 3h-6l-3-3c0-4 2-8 6-10Z M9 15l-2 5M15 15l2 5M12 12v.01' },
] as const;

export function DeploymentsPage() {
  const { state } = useBuildWorkspace();
  const facts = state.integrations?.deployment;
  const reportedEnvironment = facts?.environment?.toLowerCase();
  const observed = (target: string) =>
    target === 'local'
      ? state.adapter.environment === 'local' && Boolean(state.runtime.url)
      : reportedEnvironment === target && Boolean(facts?.deploymentId);
  const verificationRun = Boolean(state.verification);
  const verificationPassed = verificationRun && state.verification!.checks.every((check) => check.status === 'pass');
  const releaseId = facts?.deploymentId ?? null;
  const steps = [
    { label: 'Build', state: state.git?.headSha ? 'done' : 'unknown', icon: 'm12 3 8 4.5v9L12 21l-8-4.5v-9Z M12 12l8-4.5M12 12v9M12 12 4 7.5' },
    { label: 'Verify', state: verificationPassed ? 'done' : verificationRun ? 'partial' : 'unknown', icon: 'M4 12l5 5L20 6' },
    { label: 'Deploy', state: releaseId ? 'done' : 'unknown', icon: 'M12 2c4 2 6 6 6 10l-3 3h-6l-3-3c0-4 2-8 6-10Z M9 15l-2 5M15 15l2 5' },
    { label: 'Update', state: 'unknown', icon: 'M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4' },
  ] as const;
  const timeline = [
    ['Source', state.git?.headSha?.slice(0, 12) ?? 'UNVERIFIED'],
    ['Verification', state.verification ? `${state.verification.checks.length} RECORDED CHECKS` : 'NOT RUN'],
    ['Runtime', state.runtime.url ? 'CURRENT ORIGIN' : 'UNVERIFIED'],
    ['History', 'UNCONNECTED'],
  ];
  return <div className={`dev-route ${styles.page} ${styles.deployment} ${s.page}`} data-reduced={state.preferences.motion === "reduced" ? "" : undefined}>
    <header className={s.scene}>
      <p className={s.brand}><i aria-hidden="true" /> KNOuX <span>STORE</span></p>
      <h1 className={s.title}>Live Release Center</h1>
      <p className={s.lede}>Build <b>•</b> Verify <b>•</b> Deploy <b>•</b> Update</p>
      <ol className={s.stations} aria-label="Release environments">
        {STATIONS.map((station, index) => {
          const isObserved = observed(station.id);
          return <li key={station.id} className={s.station} data-observed={isObserved}>
            <span className={s.stationLabel}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={station.icon} /></svg>{station.label}</span>
            <span className={s.platform} aria-hidden="true"><i /><i /><i /><b /></span>
            {index < STATIONS.length - 1 ? <span className={s.chevrons} aria-hidden="true">❯❯❯</span> : null}
            <span className={s.badge} data-tone={isObserved ? 'ok' : 'none'}>{isObserved ? 'OBSERVED' : 'UNVERIFIED'}</span>
          </li>;
        })}
      </ol>
      <section className={s.releasePanel} aria-label="Release evidence">
        <span className={s.releaseTile} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 9 5-9 5-9-5Z M3 13l9 5 9-5 M3 17l9 5 9-5" /></svg></span>
        <div className={s.releaseHead}>
          <h2>{releaseId ? `Release ${releaseId.slice(0, 12)}` : 'Release UNVERIFIED'}</h2>
          <p>DEPLOYMENT <b>•</b> RELEASE <b>•</b> UPDATES</p>
        </div>
        <ol className={s.steps} aria-label="Release progression">
          {steps.map((step) => <li key={step.label} data-state={step.state}>
            <span className={s.stepIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={step.icon} /></svg></span>
            <strong>{step.label}</strong>
            <small>{step.state === 'done' ? 'RECORDED' : step.state === 'partial' ? 'RECORDED · NOT ALL PASS' : 'UNKNOWN'}</small>
          </li>)}
        </ol>
      </section>
      <div className={s.limb} aria-hidden="true" />
    </header>
    <ol className={styles.timeline} aria-label="Deployment evidence timeline">{timeline.map(([label, value]) => <li key={label}><strong>{label}</strong><span>{value}</span></li>)}</ol>
    <div className="dev-route__grid"><DevPanel title="Active runtime"><dl className="dev-kv"><dt>Origin</dt><dd>{state.runtime.url ? <a href={state.runtime.url} target="_blank" rel="noreferrer">{state.runtime.url} ↗</a> : 'UNAVAILABLE'}</dd><dt>Environment</dt><dd>{state.adapter.environment.toUpperCase()}</dd><dt>Serving</dt><dd>{state.runtime.url ? 'CURRENT SITE IS REACHABLE' : 'UNVERIFIED'}</dd><dt>Deployment metadata source</dt><dd>{facts?.source ?? 'WITHHELD'}</dd><dt>Vercel environment</dt><dd>{facts?.environment ?? 'UNAVAILABLE'}</dd><dt>Vercel URL</dt><dd>{facts?.url ?? 'UNAVAILABLE'}</dd><dt>Deployment ID</dt><dd>{facts?.deploymentId ?? 'UNAVAILABLE'}</dd><dt>Release commit</dt><dd>{facts?.sha ?? 'UNAVAILABLE'}</dd></dl></DevPanel><DevPanel title="Deployment history"><DevEmpty title="HISTORY UNCONNECTED" body="No deployment history source is configured. Builds, release IDs, success rates and timestamps cannot be shown." /></DevPanel><DevPanel title="Release action"><DevEmpty title="TRIGGER BLOCKED" body={state.adapter.blockers['deploy.trigger'] ?? 'This workspace has no verified deployment trigger.'} /></DevPanel><DevPanel title="Environments"><ol className={styles.releaseStations} aria-label="Release environment detail">{STATIONS.map((station) => {
    const isObserved = observed(station.id);
    return <li key={station.id} data-observed={isObserved}><i aria-hidden="true" /><strong>{station.id}</strong><small>{isObserved ? 'Observed environment' : 'Unverified'}</small></li>;
  })}</ol><p className="dev-note"><Link href="/build/pipeline">Inspect real verification ↗</Link></p></DevPanel></div>
  </div>;
}
