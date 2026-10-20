'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useBuildWorkspace } from '../workspace/KnouxBuildWorkspace';
import { PREFERENCES_KEY, type WorkspacePreferences } from '@/lib/build/preferences';
import { DevPageHeading, DevPanel } from './DevUI';

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
      const response = await fetch('/api/build/bridge/status', { cache: 'no-store' });
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
  return <div className="dev-route"><DevPageHeading eyebrow="WORKSPACE / SETTINGS" title="Settings" description="Non-secret display preferences in this browser, and authenticated bridge setup." detail="BROWSER-LOCAL PREFERENCES" /><div className="dev-route__grid"><DevPanel title="Workspace preferences"><div className="dev-settings-list">
    <label><span><strong>Compact lists & rail</strong><small>Reduce navigation and list spacing.</small></span><input type="checkbox" checked={prefs.compact} onChange={(e) => update({ ...prefs, compact: e.target.checked })} /></label>
    <label><span><strong>Show evidence detail</strong><small>Show application provenance rows.</small></span><input type="checkbox" checked={prefs.showEvidence} onChange={(e) => update({ ...prefs, showEvidence: e.target.checked })} /></label>
    <label><span><strong>Motion level</strong><small>System reduced-motion is always respected.</small></span><select value={prefs.motion} onChange={(e) => update({ ...prefs, motion: e.target.value === 'reduced' ? 'reduced' : 'auto' })}><option value="auto">System preference</option><option value="reduced">Stable composed mark</option></select></label>
    <label><span><strong>Particle density</strong><small>Quality remains capped by device capability.</small></span><select value={prefs.density} onChange={(e) => update({ ...prefs, density: e.target.value === 'low' ? 'low' : 'balanced' })}><option value="balanced">Balanced</option><option value="low">Low</option></select></label>
    <label><span><strong>Default viewport</strong><small>Used when the next workspace session opens.</small></span><select value={prefs.viewport} onChange={(e) => update({ ...prefs, viewport: e.target.value as WorkspacePreferences['viewport'] })}><option value="laptop">Laptop · 1440</option><option value="tablet">Tablet · 768</option><option value="phone">Mobile · 390</option></select></label>
    <label><span><strong>Wrap document text</strong><small>Read long source and documentation lines without scrolling.</small></span><input type="checkbox" checked={prefs.editorWrap} onChange={(e) => update({ ...prefs, editorWrap: e.target.checked })} /></label>
    <label><span><strong>Allow evidence exports</strong><small>Enable explicit Preview metadata downloads.</small></span><input type="checkbox" checked={prefs.evidence} onChange={(e) => update({ ...prefs, evidence: e.target.checked })} /></label>
  </div><p className="dev-note">Only these display preferences are persisted. Credentials and project contents are never stored here.</p></DevPanel>
  <DevPanel title="Trusted local bridge">
    {/* Announced politely so a screen-reader user learns the outcome of the
        check without having to go looking for it. */}
    <div className="dev-note" role="status" aria-live="polite" style={{ padding: '14px 0' }}>
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
      <button type="button" disabled={bridge.kind === 'checking'} onClick={() => void checkBridge()}>
        {bridge.kind === 'checking' ? 'CHECKING…' : 'CHECK BRIDGE CONNECTION'}
      </button>
    </div>
    <p>Pair a running bridge using its one-time code. The server needs KNOUX_BRIDGE_SIGNING_KEY and KNOUX_BRIDGE_URL; pairing records use the existing owner-scoped Supabase store.</p><label className="dev-input-label">Configured bridge URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:7331" /></label><label className="dev-input-label">One-time pairing code<input autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} /></label><button type="button" disabled={!state.integrations?.bridgePairAllowed || !url.trim() || !code.trim() || busy} title={state.integrations?.bridgePairBlocker ?? 'Sign in and configure the server bridge before pairing.'} onClick={() => void pair()}>{busy ? 'PAIRING…' : 'PAIR TRUSTED BRIDGE'}</button><p className="dev-note">{state.integrations?.bridgePairBlocker ?? 'Sign in and configure the server bridge before pairing.'} Hosted Vercel cannot reach your machine through its own localhost. The existing pairing schema accepts loopback origins only. A hosted tunnel/gateway adapter and reviewed schema are still required. Compare the returned bridge fingerprint on the trusted machine.</p></DevPanel>
  <DevPanel title="Current project"><dl className="dev-kv"><dt>Adapter</dt><dd>{state.adapter.label}</dd><dt>Project</dt><dd>{state.project?.name ?? 'UNKNOWN / WITHHELD'}</dd><dt>Root</dt><dd>{state.project?.root ?? 'UNKNOWN / WITHHELD'}</dd><dt>Framework</dt><dd>{state.project?.framework ?? 'UNDETECTED'}</dd><dt>Branch / HEAD</dt><dd>{state.git?.branch ?? 'UNKNOWN'} / {state.git?.headSha ?? 'UNKNOWN'}</dd><dt>Dirty state</dt><dd>{state.git?.available ? state.git.dirty ? 'DIRTY' : 'CLEAN' : 'UNKNOWN'}</dd></dl></DevPanel></div>{message ? <p className="dev-note" role="status">{message}</p> : null}</div>;
}
