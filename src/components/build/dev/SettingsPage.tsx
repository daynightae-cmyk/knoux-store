'use client';

/**
 * Settings — Build V3 reference 07, composed as the orbital preferences desk.
 *
 * The masthead carries the eclipse scene; below, browser-local display
 * preferences sit beside the trusted-bridge glass panel with its crystal
 * orbit, and the measured current-project record closes the page. Every
 * bridge behaviour is preserved exactly: unverified until checked, four
 * distinct honest outcomes, one-time loopback pairing with a compared
 * fingerprint, and no credential ever rendered.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { PREFERENCES_KEY, type WorkspacePreferences } from '@/lib/build/preferences';
import styles from './settings-orbit.module.css';
import operational from './operational-v3.module.css';

/**
 * What a bridge check can honestly conclude.
 *
 * `unverified` is the initial state and is never replaced by an assumption: the
 * only way to leave it is to run the check and read the answer. The four
 * outcomes are distinct because they need different remedies, and collapsing
 * them into a single "not connected" is what tells an operator to go and fix
 * something that was never broken.
 */
type BridgeCheck =
  | { kind: 'unverified' }
  | { kind: 'checking' }
  /** The bridge answered the request and accepted it. */
  | { kind: 'reachable'; profiles: string[]; root: string | null }
  /** Reachable in principle, but no usable shell profile was offered. */
  | { kind: 'no-profiles' }
  /** Configured but not answering. */
  | { kind: 'offline' }
  /** The guard could not identify the caller. */
  | { kind: 'auth-required' }
  /** The status API itself could not be reached. */
  | { kind: 'unreachable' };

function FieldIcon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

export function SettingsPage() {
  const { state, dispatch } = useBuildWorkspace();
  const [url, setUrl] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [bridge, setBridge] = useState<BridgeCheck>({ kind: 'unverified' });
  /**
   * Ask the bridge whether it is there.
   *
   * Reads only the status route's own answer and never assumes reachability from
   * the presence of a pairing record: pairing says a bridge was once trusted,
   * not that it is running now. The returned text is the server's blocker where
   * one exists, so the operator sees the bridge's own words rather than a
   * paraphrase that could read as either success or failure.
   */
  async function checkBridge() {
    if (bridge.kind === 'checking') return;
    setBridge({ kind: 'checking' });
    try {
      const response = await fetch('/api/build/bridge/status', { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      if (response.status === 401) {
        setBridge({ kind: 'auth-required' });
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | { reachable?: boolean; handshake?: { profiles?: Array<{ id: string }>; root?: string } | null; blocker?: string | null }
        | null;

      if (body?.reachable && body.handshake) {
        setBridge({
          kind: 'reachable',
          profiles: (body.handshake.profiles ?? []).map((profile) => profile.id),
          root: body.handshake.root ?? null,
        });
      } else if (body && body.blocker) {
        setBridge({ kind: 'offline' });
      } else {
        setBridge({ kind: 'unreachable' });
      }
    } catch {
      // A network failure to the status route says nothing about the bridge.
      setBridge({ kind: 'unreachable' });
    }
  }
  function update(next: WorkspacePreferences) { dispatch({ type: 'preferences/set', preferences: next }); try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); } catch { setMessage('Preferences applied to this session. Browser persistence is unavailable.'); } }
  async function pair() {
    setBusy(true); setMessage(null);
    try { const response = await fetch('/api/build/bridge/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, code }) }); const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Pairing failed.'); setCode(''); setMessage(`Bridge pairing recorded. Compare fingerprint ${result.fingerprint} with the trusted machine, then refresh status in the launcher.`); dispatch({ type: 'activity/record', message: 'Bridge pairing recorded' }); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Pairing request failed.'); } finally { setBusy(false); }
  }
  const prefs = state.preferences;
  return (
    <div className={`dev-route ${operational.page} ${styles.page}`} data-reduced={state.preferences.motion === 'reduced' ? '' : undefined}>
      <header className={styles.masthead}>
        <div className={styles.mastheadText}>
          <span className="dev-mini-label">WORKSPACE / SETTINGS</span>
          <h1>Settings</h1>
          <p>Non-secret display preferences in this browser, and authenticated bridge setup.</p>
          <small>BROWSER-LOCAL PREFERENCES</small>
        </div>
        <div className={styles.eclipse} aria-hidden="true">
          <svg viewBox="0 0 300 170" fill="none">
            <circle cx="150" cy="78" r="52" stroke="#d9bcff" strokeOpacity=".65" strokeWidth="1.4" />
            <circle cx="150" cy="78" r="52" fill="url(#set-eclipse-fill)" />
            <path d="M150 26v104" stroke="#f3e8ff" strokeOpacity=".8" strokeWidth="1.2" />
            <circle cx="150" cy="26" r="3.2" fill="#fff" />
            <circle cx="150" cy="130" r="2.4" fill="#d9bcff" />
            <circle cx="150" cy="78" r="66" stroke="#bb8ef2" strokeOpacity=".3" strokeWidth="1" strokeDasharray="2 5" />
            <ellipse cx="150" cy="142" rx="118" ry="12" stroke="#c9a2ff" strokeOpacity=".35" strokeWidth="1" />
            <ellipse cx="150" cy="142" rx="70" ry="7" stroke="#d9bcff" strokeOpacity=".28" strokeWidth="1" />
            {[[58, 40], [242, 40], [88, 120], [212, 120]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="#c9a2ff" opacity=".8" />
            ))}
            <defs>
              <radialGradient id="set-eclipse-fill" cx="0.5" cy="0.32" r="0.75">
                <stop offset="0%" stopColor="#8b54c9" stopOpacity=".5" />
                <stop offset="55%" stopColor="#2a1745" stopOpacity=".65" />
                <stop offset="100%" stopColor="#0c0718" stopOpacity=".9" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </header>

      <div className={styles.columns}>
        <section aria-labelledby="settings-preferences">
          <h2 className={styles.columnHead} id="settings-preferences"><span aria-hidden="true">✦</span>Workspace preferences</h2>
          <div className={styles.prefList}>
            <label><span><strong>Compact lists &amp; rail</strong><small>Reduce navigation and list spacing.</small></span><input type="checkbox" checked={prefs.compact} onChange={(e) => update({ ...prefs, compact: e.target.checked })} /></label>
            <label><span><strong>Show evidence detail</strong><small>Show application provenance rows.</small></span><input type="checkbox" checked={prefs.showEvidence} onChange={(e) => update({ ...prefs, showEvidence: e.target.checked })} /></label>
            <label><span><strong>Motion level</strong><small>System reduced-motion is always respected.</small></span><select value={prefs.motion} onChange={(e) => update({ ...prefs, motion: e.target.value === 'reduced' ? 'reduced' : 'auto' })}><option value="auto">System preference</option><option value="reduced">Stable composed mark</option></select></label>
            <label><span><strong>Particle density</strong><small>Quality remains capped by device capability.</small></span><select value={prefs.density} onChange={(e) => update({ ...prefs, density: e.target.value === 'low' ? 'low' : 'balanced' })}><option value="balanced">Balanced</option><option value="low">Low</option></select></label>
            <label><span><strong>Default viewport</strong><small>Used when the next workspace session opens.</small></span><select value={prefs.viewport} onChange={(e) => update({ ...prefs, viewport: e.target.value as WorkspacePreferences['viewport'] })}><option value="laptop">Laptop · 1440</option><option value="tablet">Tablet · 768</option><option value="phone">Mobile · 390</option></select></label>
            <label><span><strong>Wrap document text</strong><small>Read long source and documentation lines without scrolling.</small></span><input type="checkbox" checked={prefs.editorWrap} onChange={(e) => update({ ...prefs, editorWrap: e.target.checked })} /></label>
            <label><span><strong>Allow evidence exports</strong><small>Enable explicit Preview metadata downloads.</small></span><input type="checkbox" checked={prefs.evidence} onChange={(e) => update({ ...prefs, evidence: e.target.checked })} /></label>
          </div>
          <p className={styles.prefNote}>Only these display preferences are persisted. Credentials and project contents are never stored here.</p>
        </section>

        <section aria-labelledby="settings-bridge">
          <h2 className={styles.columnHead} id="settings-bridge"><span aria-hidden="true">✦</span>Trusted local bridge</h2>
          <div className={styles.bridgePanel}>
            <div className={styles.crystalScene} aria-hidden="true">
              <svg viewBox="0 0 340 128" fill="none">
                <ellipse cx="170" cy="102" rx="128" ry="14" stroke="#c9a2ff" strokeOpacity=".4" strokeWidth="1" />
                <ellipse cx="170" cy="102" rx="74" ry="8" stroke="#d9bcff" strokeOpacity=".3" strokeWidth="1" />
                <circle cx="170" cy="56" r="40" stroke="#bb8ef2" strokeOpacity=".45" strokeWidth="1" strokeDasharray="2 4" />
                <path data-shimmer d="M170 16l16 34-16 44-16-44Z" fill="url(#set-crystal-fill)" stroke="#e9d5ff" strokeOpacity=".85" strokeWidth="1.2" />
                <path d="M170 16v78M154 50h32" stroke="#f3e8ff" strokeOpacity=".5" strokeWidth=".8" />
                <path d="M84 56a14 14 0 1 0 14 14 11 11 0 0 1-14-14Z" fill="#c9a2ff" opacity=".65" />
                <path d="M256 56a14 14 0 1 1-14 14 11 11 0 0 0 14-14Z" fill="#c9a2ff" opacity=".65" />
                {[[62, 96], [278, 96], [110, 26], [230, 26]].map(([x, y]) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="#d9bcff" opacity=".85" />
                ))}
                <defs>
                  <linearGradient id="set-crystal-fill" x1="170" y1="16" x2="170" y2="94" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#e9d5ff" stopOpacity=".85" />
                    <stop offset=".55" stopColor="#8b54c9" stopOpacity=".55" />
                    <stop offset="1" stopColor="#2a1745" stopOpacity=".8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className={styles.bridgeStatus} data-state={bridge.kind} role="status" aria-live="polite">
              <div className={styles.bridgeStatusHead}>
                <span className={styles.bridgeLamp} aria-hidden="true" />
                <span>
                  <strong>Bridge connectivity</strong>
                  <p>
                    {bridge.kind === 'unverified' && 'Not checked yet. Verify the bridge before opening Terminal or PowerShell.'}
                    {bridge.kind === 'checking' && 'Asking the bridge whether it is there…'}
                    {bridge.kind === 'reachable' && (
                      <>Bridge answered this request. Shell profiles: {bridge.profiles.length > 0 ? bridge.profiles.join(', ') : 'none advertised'}.</>
                    )}
                    {bridge.kind === 'no-profiles' && 'The bridge answered but advertised no usable shell profile, so no session can be opened.'}
                    {bridge.kind === 'offline' && 'No bridge answered. Start the bridge on the trusted machine, then check again.'}
                    {bridge.kind === 'auth-required' && (
                      <>This workspace needs an identified account.{' '}
                        <Link href="/login?next=%2Fbuild%2Fsettings">Sign in to KNOuX ↗</Link>
                      </>
                    )}
                    {bridge.kind === 'unreachable' && 'The bridge status could not be read. Check that the KNOuX server is reachable.'}
                  </p>
                  {bridge.kind === 'reachable' && (
                    <p>No local command execution is available until a trusted bridge is paired and reachable.</p>
                  )}
                </span>
              </div>
              <button type="button" className={styles.checkButton} disabled={bridge.kind === 'checking'} onClick={() => void checkBridge()}>
                {bridge.kind === 'checking' ? 'CHECKING…' : 'CHECK BRIDGE CONNECTION'}
              </button>
            </div>

            <p className={styles.pairIntro}>Pair a running bridge using its one-time code. The server needs KNOUX_BRIDGE_SIGNING_KEY and KNOUX_BRIDGE_URL; pairing records use the existing owner-scoped Supabase store.</p>
            <label className={styles.pairField}>
              <span>Configured bridge URL</span>
              <span className={styles.pairInput}><FieldIcon d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7L12.5 19" /><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:7331" /></span>
            </label>
            <label className={styles.pairField}>
              <span>One-time pairing code</span>
              <span className={styles.pairInput}><FieldIcon d="M15 7a4 4 0 1 1-4 4m4-4 6 6m-3-3 2 2m-9-1-6 6v3h3l1-2h2v-2h2l1.5-1.5" /><input autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} /></span>
            </label>
            <button type="button" className={styles.pairButton} disabled={!state.integrations?.bridgePairAllowed || !url.trim() || !code.trim() || busy} title={state.integrations?.bridgePairBlocker ?? 'Sign in and configure the server bridge before pairing.'} onClick={() => void pair()}>
              <FieldIcon d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Zm-2.5 9 2 2 3.5-4" />
              {busy ? 'PAIRING…' : 'PAIR TRUSTED BRIDGE'}
            </button>
            <p className={styles.pairNote}>{state.integrations?.bridgePairBlocker ?? 'Sign in and configure the server bridge before pairing.'} Hosted Vercel cannot reach your machine through its own localhost. The existing pairing schema accepts loopback origins only. A hosted tunnel/gateway adapter and reviewed schema are still required. Compare the returned bridge fingerprint on the trusted machine.</p>
          </div>
        </section>
      </div>

      <section className={styles.projectPanel} aria-labelledby="settings-project">
        <h2 className={styles.columnHead} id="settings-project"><span aria-hidden="true">✦</span>Current project</h2>
        <dl className="dev-kv"><dt>Adapter</dt><dd>{state.adapter.label}</dd><dt>Project</dt><dd>{state.project?.name ?? 'UNKNOWN / WITHHELD'}</dd><dt>Root</dt><dd>{state.project?.root ?? 'UNKNOWN / WITHHELD'}</dd><dt>Framework</dt><dd>{state.project?.framework ?? 'UNDETECTED'}</dd><dt>Branch / HEAD</dt><dd>{state.git?.branch ?? 'UNKNOWN'} / {state.git?.headSha ?? 'UNKNOWN'}</dd><dt>Dirty state</dt><dd>{state.git?.available ? state.git.dirty ? 'DIRTY' : 'CLEAN' : 'UNKNOWN'}</dd></dl>
      </section>
      {message ? <p className="dev-note" role="status">{message}</p> : null}
    </div>
  );
}
