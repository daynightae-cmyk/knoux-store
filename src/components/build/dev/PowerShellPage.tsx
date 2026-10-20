'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DevEmpty, DevPageHeading, DevPanel } from './DevUI';
import {
  TerminalTransport,
  type TerminalExit,
  type TerminalSessionInfo,
  type TerminalStage,
  type TerminalStats,
  type TerminalTimings,
} from '@/lib/build/terminal-transport';
import { PtyPreloadBuffer } from '@/lib/build/pty-preload';
import type { BridgeCapabilities, BridgeProfile, Handshake, ShellProfile } from '@/lib/build/bridge-protocol';

// Formatters
function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  return `${Math.round(ms)}ms`;
}
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function formatTime(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleTimeString('en-GB', { hour12: false, fractionalSecondDigits: 3 });
}
function backoffLabel(attempts: number): string {
  const seconds = Math.min(30, Math.pow(2, attempts));
  return `${seconds}s`;
}

type BridgeState =
  | { kind: 'checking' }
  /** See `TerminalPage`: a 401 is a sign-in problem, not a pairing problem. */
  | { kind: 'unavailable'; blocker: string; authRequired?: boolean }
  | { kind: 'ready'; handshake: Handshake };

const SIGN_IN_REQUIRED = 'Sign in to use PowerShell. This workspace needs an identified account.';
const SIGN_IN_HREF = '/login?next=%2Fbuild%2Fpowershell';

interface BridgeStatusResponse {
  configured: boolean;
  paired: boolean;
  reachable: boolean;
  bridgeId: string | null;
  fingerprint: string | null;
  capabilities: BridgeCapabilities | null;
  handshake: Handshake | null;
  blocker: string | null;
  /** Present on guard refusals; a fallback when `blocker` is absent. */
  message?: string;
}

export function PowerShellPage() {
  const [bridge, setBridge] = useState<BridgeState>({ kind: 'checking' });
  const [profiles, setProfiles] = useState<BridgeProfile[]>([]);
  const [profile, setProfile] = useState<ShellProfile | ''>('');
  const [cwd, setCwd] = useState<string>('');

  const [stage, setStage] = useState<TerminalStage>('idle');
  const [session, setSession] = useState<TerminalSessionInfo | null>(null);
  const [exit, setExit] = useState<TerminalExit | null>(null);
  const [stats, setStats] = useState<TerminalStats | null>(null);

  const [timings, setTimings] = useState<TerminalTimings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [findQuery, setFindQuery] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const transportRef = useRef<TerminalTransport | null>(null);
  const termRef = useRef<{ write: (d: string) => void; dispose: () => void; getSelection?: () => string } | null>(null);
  /**
   * Genuine PTY output that arrived before xterm finished loading.
   *
   * The bridge starts sending the moment a session goes live, and the renderer
   * is imported lazily, so there is a real window in which output has no
   * destination. Dropping it would show an operator a command that appears to
   * produce nothing. The buffer is reset on every session boundary so output
   * from a closed or replaced session cannot surface in the next one.
   */
  const preloadRef = useRef<PtyPreloadBuffer>(new PtyPreloadBuffer());
  const fitRef = useRef<{ fit: () => void; proposeDimensions: () => { cols: number; rows: number } | undefined } | null>(null);
  const searchRef = useRef<{ findNext: (q: string) => boolean; findPrevious: (q: string) => boolean } | null>(null);
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/build/bridge/status', { cache: 'no-store' });
        const body = (await response.json()) as BridgeStatusResponse;
        if (cancelled) return;
        // Resolved from the status code before the body is trusted, so a 401
        // cannot present itself as a connected shell.
        if (!response.ok && response.status === 401) {
          setBridge({ kind: 'unavailable', blocker: SIGN_IN_REQUIRED, authRequired: true });
          return;
        }
        if (body.reachable && body.handshake) {
          const psProfiles = body.handshake.profiles.filter(p => p.id === 'pwsh' || p.id === 'powershell');
          psProfiles.sort((a, b) => {
            if (a.id === 'pwsh') return -1;
            if (b.id === 'pwsh') return 1;
            return 0;
          });

          if (psProfiles.length > 0) {
            setBridge({ kind: 'ready', handshake: body.handshake });
            setProfiles(psProfiles);
            setProfile(psProfiles[0].id);
            // Empty means the paired bridge's own trusted root. The client
            // never proposes a directory: an absolute path is refused by the
            // ticket validator anyway, and would leak the bridge host's layout.
            setCwd('');
          } else {
            setBridge({ kind: 'unavailable', blocker: 'NO POWERSHELL PROFILE' });
          }
        } else {
          setBridge({
            kind: 'unavailable',
            blocker: body.blocker || body.message || (body.configured ? 'BRIDGE UNAVAILABLE' : 'BRIDGE NOT CONFIGURED'),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setBridge({ kind: 'unavailable', blocker: 'FAILED TO CHECK BRIDGE STATUS' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshStats = useCallback(() => {
    if (transportRef.current) {
      setStats(transportRef.current.measuredStats);
      setTimings(transportRef.current.measuredTimings);
    }
  }, []);

  useEffect(() => {
    statsTimer.current = setInterval(refreshStats, 500);
    return () => {
      if (statsTimer.current) clearInterval(statsTimer.current);
    };
  }, [refreshStats]);

  const openSession = useCallback(async () => {
    if (bridge.kind !== 'ready' || !profile) return;
    setError(null);
    setExit(null);
    setSession(null);
    // A new session must never inherit the previous one's pre-render output.
    preloadRef.current.reset();

    if (!transportRef.current) {
      transportRef.current = new TerminalTransport(
        {
          onOutput: (data) => {
            // Authenticated, verified PTY bytes. Never rewritten, reordered or
            // padded: if the renderer is not up yet they wait, bounded, for it.
            if (termRef.current) termRef.current.write(data);
            else preloadRef.current.push(data);
          },
          onStage: (next) => {
            setStage(next);
            refreshStats();
          },
          onSession: (info) => {
            setSession(info);
            refreshStats();
          },
          onExit: (result) => {
            setExit(result);
            // The PTY is gone, so anything still waiting for a renderer belongs
            // to a session that no longer exists.
            preloadRef.current.reset();
            refreshStats();
          },
          onError: (_code, message) => setError(message),
        },
        { createSocket: (url) => new WebSocket(url) }
      );
    }

    const dims = fitRef.current?.proposeDimensions();
    void transportRef.current.open({
      profile: profile as ShellProfile,
      ...(cwd.trim() ? { cwd: cwd.trim() } : {}),
      ...(dims ? { cols: dims.cols, rows: dims.rows } : {})
    });
  }, [bridge, profile, cwd, refreshStats]);

  const closeSession = useCallback(() => {
    // Cleared before the socket closes: a frame already in flight would
    // otherwise be buffered for a renderer that will never be asked to draw it.
    preloadRef.current.reset();
    if (transportRef.current) {
      transportRef.current.close();
    }
  }, []);

  const reopen = useCallback(() => {
    setError(null);
    void openSession();
  }, [openSession]);

  useEffect(() => {
    // Captured so the cleanup acts on this mount's buffer rather than on
    // whatever a later render may have left in the ref.
    const preload = preloadRef.current;
    return () => {
      // Unmount is a session boundary like any other.
      preload.reset();
      if (transportRef.current) {
        transportRef.current.close();
        transportRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, []);

  const clearTerminal = useCallback(() => {
    if (transportRef.current) transportRef.current.write('\x0c');
  }, []);

  const leaveTerminal = useCallback(() => {
    const el = document.getElementById('terminal-leave-target');
    if (el) el.focus();
  }, []);

  const copySelection = useCallback(async () => {
    try {
      // Read the selection from the terminal itself. xterm renders to a canvas,
      // so the document selection is empty and copying it yields an empty
      // clipboard while appearing to have worked.
      const selection = termRef.current?.getSelection?.() ?? '';
      if (selection) await navigator.clipboard.writeText(selection);
    } catch {
      /* clipboard unavailable or permission refused */
    }
  }, []);

  useEffect(() => {
    // A renderer only exists once a session has been assigned. `live` and
    // `reconnecting` both carry real output, and `exited` may carry the tail of
    // it, so all three load the renderer rather than leaving the transcript
    // invisible after the shell ends.
    if ((stage === 'live' || stage === 'reconnecting' || stage === 'exited') && containerRef.current && !termRef.current) {
      let cancelled = false;

      Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
      ]).then(([{ Terminal }, { FitAddon }, { SearchAddon }]) => {
        if (cancelled || !containerRef.current) return;

        try {
          const terminal = new Terminal({
            fontFamily: 'var(--mono)',
            fontSize: 13,
            lineHeight: 1.2,
            cursorBlink: true,
            cursorStyle: 'block',
            theme: {
              background: '#07070a',
              foreground: '#e6e4eb',
              cursor: '#a18acb',
              cursorAccent: '#07070a',
              selectionBackground: 'rgba(161, 138, 203, 0.3)',
              selectionInactiveBackground: 'rgba(161, 138, 203, 0.1)',
            },
            allowProposedApi: true,
          });

          const fitAddon = new FitAddon();
          const searchAddon = new SearchAddon();
          
          terminal.loadAddon(fitAddon);
          terminal.loadAddon(searchAddon);

          terminal.open(containerRef.current);

          

          fitAddon.fit();
          
          let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
          const resizeObserver = new ResizeObserver(() => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
              if (containerRef.current) {
                fitAddon.fit();
                const dims = fitAddon.proposeDimensions();
                if (dims && transportRef.current) {
                  transportRef.current.resize(dims.cols, dims.rows);
                }
              }
            }, 50);
          });
          resizeObserver.observe(containerRef.current);

          terminal.onData((data: string) => {
            if (transportRef.current) {
              transportRef.current.write(data);
            }
          });

          termRef.current = {
            write: (d) => terminal.write(d),
            // The DOM selection is empty here: xterm paints to a canvas, so
            // `window.getSelection()` would copy nothing no matter what the
            // operator highlighted inside the terminal.
            getSelection: () => terminal.getSelection(),
            dispose: () => {
              resizeObserver.disconnect();
              terminal.dispose();
            },
          };

          fitRef.current = {
            fit: () => fitAddon.fit(),
            proposeDimensions: () => fitAddon.proposeDimensions()
          };

          searchRef.current = {
            findNext: (q) => searchAddon.findNext(q),
            findPrevious: (q) => searchAddon.findPrevious(q),
          };

          // The renderer exists, so anything the bridge sent while it was still
          // loading is written now, in arrival order. Draining empties the
          // buffer, so a later effect run cannot replay it.
          const pending = preloadRef.current.drain();
          if (pending.text) {
            terminal.write(pending.text);
            if (pending.droppedBytes > 0) {
              setLoadError(
                `${formatBytes(pending.droppedBytes)} of early output was dropped before the terminal was ready.`,
              );
            }
          }

          terminal.focus();

          const dims = fitAddon.proposeDimensions();
          if (dims && transportRef.current) {
            transportRef.current.resize(dims.cols, dims.rows);
          }
        } catch (e) {
          setLoadError('Failed to initialize terminal renderer');
        }
      }).catch(() => {
        if (!cancelled) setLoadError('Failed to load terminal modules');
      });

      return () => { cancelled = true; };
    }
  }, [stage]);

  const handshake = bridge.kind === 'ready' ? bridge.handshake : null;
  const live = stage === 'live';
  const busy = stage === 'requesting-ticket' || stage === 'connecting' || stage === 'reconnecting';
  
  let pEngine = 'UNKNOWN';
  if (handshake && handshake.powershellVersion) {
    pEngine = handshake.powershellVersion.startsWith('7') || handshake.powershellVersion.startsWith('6') ? 'PowerShell 7' : 'Windows PowerShell';
  } else if (session) {
    pEngine = session.profile === 'pwsh' ? 'PowerShell 7' : 'Windows PowerShell';
  }

  let bridgeStatus = 'CHECKING BRIDGE';
  if (bridge.kind === 'unavailable') {
    bridgeStatus = bridge.blocker;
  } else if (bridge.kind === 'ready') {
    if (stage === 'idle') bridgeStatus = 'BRIDGE CONNECTED';
    else if (stage === 'requesting-ticket') bridgeStatus = 'REQUESTING TICKET';
    else if (stage === 'connecting') bridgeStatus = 'CONNECTING';
    else if (stage === 'reconnecting') bridgeStatus = 'RECONNECTING';
    else if (stage === 'live') bridgeStatus = 'LIVE';
    else if (stage === 'exited') bridgeStatus = 'EXITED';
    else if (stage === 'failed') bridgeStatus = 'FAILED';
    else if (stage === 'closed') bridgeStatus = 'CLOSED';
  }

  return (
    <div className="dev-route">
      <DevPageHeading 
        eyebrow="TOOLS / POWERSHELL" 
        title="PowerShell" 
        description="Windows PowerShell requires a trusted machine bridge. The web deployment has no access to your local shell." 
        detail={bridgeStatus} 
      />
      
      <div className="dev-route__grid">
        <DevPanel title="PowerShell session">
          <div className={`dev-console dev-console--terminal ${live ? '' : 'dev-console--blocked'}`}>
            <div className="dev-console__bar">
              <span>{profile ? profile.toUpperCase() : 'POWERSHELL'}</span>
              <span>{bridgeStatus}</span>
            </div>

            {bridge.kind === 'checking' && (
              <DevEmpty title="CHECKING BRIDGE" body="Measuring bridge reachability and capabilities…" />
            )}

            {bridge.kind === 'unavailable' && (
              <>
                <DevEmpty
                  title={bridge.authRequired ? 'SIGN IN REQUIRED' : bridge.blocker}
                  body={bridge.authRequired
                    ? 'PowerShell needs an identified account before a local shell can be paired.'
                    : 'PowerShell requires an active build bridge.'}
                />
                <p className="dev-note" style={{ textAlign: 'center', marginTop: 24 }}>
                  {/* Pairing is a privileged action, so it is offered only once a
                      session exists. An unidentified visitor is sent to sign in
                      with a return path back to this page. */}
                  <Link href={bridge.authRequired ? SIGN_IN_HREF : '/build/settings'} className="action">
                    {bridge.authRequired ? 'SIGN IN TO CONNECT' : 'PAIR TRUSTED BRIDGE'} <span className="action-arrow">↗</span>
                  </Link>
                </p>
              </>
            )}

            {bridge.kind === 'ready' && (stage === 'idle' || stage === 'closed' || stage === 'failed') && (
              <div className="dev-terminal-setup">
                {error && <p className="dev-error" role="alert">{error}</p>}
                <label className="dev-field">
                  <span>PROFILE</span>
                  <select
                    value={profile}
                    onChange={(event) => setProfile(event.target.value as ShellProfile | '')}
                    aria-label="PowerShell profile"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} · {p.version}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="dev-field">
                  <span>WORKING DIRECTORY</span>
                  <input
                    type="text"
                    value={cwd}
                    onChange={(event) => setCwd(event.target.value)}
                    placeholder={handshake?.root ?? ''}
                    aria-label="Working directory, relative to the bridge root"
                    spellCheck={false}
                  />
                </label>
                <p className="dev-note">
                  Only the PowerShell profiles this bridge measured are offered. The directory must stay
                  inside the bridge root; anything else is refused.
                </p>
                <button type="button" className="dev-button" onClick={() => void openSession()}>
                  OPEN POWERSHELL
                </button>
              </div>
            )}

            {busy && (
              <div className="dev-terminal-steps" role="status" aria-live="polite">
                <DevEmpty
                  title={stage === 'reconnecting' ? 'RECONNECTING…' : 'CONNECTING…'}
                  body={stageSteps(timings)}
                />
                {stage === 'reconnecting' && stats && (
                  <p className="dev-note">
                    Attempt {stats.reconnectAttempts + 1} · next backoff {backoffLabel(stats.reconnectAttempts)} · replaying from output seq held.
                  </p>
                )}
              </div>
            )}

            {(live || stage === 'reconnecting' || stage === 'exited') && (
              <>
                <div
                  ref={containerRef}
                  className="dev-terminal-mount"
                  role="application"
                  aria-label="PowerShell session. Escape does not leave the terminal; use Leave terminal."
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.code === 'Escape' && !event.ctrlKey && !event.shiftKey) {
                      event.stopPropagation();
                    }
                  }}
                />
                <div className="dev-terminal-toolbar" role="toolbar" aria-label="Terminal controls">
                  <span>{session ? `${session.profile} · ${session.cwd} · PID ${session.pid}` : '—'}</span>
                  <span title={stats?.latencyMs === null ? 'No ping/pong pair has completed yet' : 'Measured round trip'}>
                    RTT {formatLatency(stats?.latencyMs ?? null)}
                  </span>
                  <button type="button" onClick={clearTerminal} disabled={!live}>CLEAR</button>
                  <button type="button" onClick={() => void copySelection()} disabled={!live}>COPY SELECTION</button>
                  <button
                    type="button"
                    id="terminal-leave-target"
                    onClick={leaveTerminal}
                    title="Ctrl+Shift+Esc"
                  >
                    LEAVE POWERSHELL
                  </button>
                  {live ? (
                    <button type="button" onClick={closeSession}>CLOSE</button>
                  ) : (
                    <button type="button" onClick={reopen} disabled={busy}>
                      {stage === 'exited' ? 'REOPEN' : 'RETRY'}
                    </button>
                  )}
                </div>
                <div className="dev-terminal-find">
                  <input
                    type="search"
                    value={findQuery}
                    onChange={(event) => setFindQuery(event.target.value)}
                    placeholder="Find in terminal"
                    aria-label="Find in terminal output"
                  />
                  <button
                    type="button"
                    disabled={!findQuery}
                    onClick={() => { if (findQuery) searchRef.current?.findNext(findQuery); }}
                  >
                    NEXT
                  </button>
                  <button
                    type="button"
                    disabled={!findQuery}
                    onClick={() => { if (findQuery) searchRef.current?.findPrevious(findQuery); }}
                  >
                    PREV
                  </button>
                </div>
              </>
            )}

            {stage === 'exited' && exit && (
              <p className="dev-note" role="status">
                Session ended · exit {exit.code === null ? '—' : exit.code}
                {exit.signal ? ` · signal ${exit.signal}` : ''} ·{' '}
                {stats ? `${formatBytes(stats.bytesIn)} in / ${formatBytes(stats.bytesOut)} out` : ''}
              </p>
            )}
            {error && (live || stage === 'reconnecting' || stage === 'exited') && (
              <p className="dev-error" role="alert">{error}</p>
            )}
            {loadError && <p className="dev-error" role="alert">{loadError}</p>}
          </div>
        </DevPanel>

        <DevPanel title="PowerShell Facts">
          {handshake ? (
            <dl className="dev-facts">
              <Fact label="ENGINE" value={pEngine} />
              <Fact label="VERSION" value={handshake.powershellVersion || 'UNKNOWN'} />
              <Fact label="EXECUTION POLICY" value={handshake.executionPolicy || 'UNKNOWN'} />
              <Fact label="ELEVATED" value={handshake.elevated ? 'YES' : 'NO'} />
              <Fact label="PROFILE" value={session ? session.profile : (profile || 'NONE')} />
              <Fact label="CWD" value={session ? session.cwd : (cwd || handshake.root)} />
              <Fact label="PID" value={session ? String(session.pid) : '—'} />
              <Fact label="STATUS" value={bridgeStatus} />
            </dl>
          ) : (
            <DevEmpty title="NO FACTS" body="Pair a bridge to see PowerShell facts." />
          )}
        </DevPanel>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="dev-facts__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function stageSteps(timings: TerminalTimings | null): string {
  if (!timings?.ticketRequestedAt) return 'Starting…';
  const parts = [`ticket requested ${formatTime(timings.ticketRequestedAt)}`];
  if (timings.ticketReceivedAt) parts.push(`received ${formatTime(timings.ticketReceivedAt)}`);
  if (timings.connectingAt) parts.push(`connecting ${formatTime(timings.connectingAt)}`);
  if (timings.readyAt) parts.push(`ready ${formatTime(timings.readyAt)}`);
  return `REQUESTING TICKET → CONNECTING → READY · ${parts.join(' · ')}`;
}
