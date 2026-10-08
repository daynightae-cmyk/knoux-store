'use client';

/**
 * Terminal page — a real terminal client, or an honest blocker.
 *
 * Every state here is driven by something measured. The bridge status comes
 * from `/api/build/bridge/status`, which reports only what the bridge answered.
 * The session lifecycle comes from `TerminalTransport`, which timestamps each
 * stage and counts its own bytes. Nothing renders a value it did not observe:
 * latency reads UNMEASURED until a ping/pong pair completes, and the profile
 * picker lists only the profiles the handshake reported.
 *
 * xterm loads inside an effect, never at module scope, so server rendering never
 * touches the DOM or canvas. If the import fails the page reports that instead
 * of a blank panel.
 *
 * Accessibility: Esc does not leave the terminal — a visible LEAVE TERMINAL
 * control (`Ctrl+Shift+Esc` while focused) moves focus out. Status changes are
 * announced through a polite live region; terminal output itself is not, which
 * would be unusable.
 */

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
import type { BridgeCapabilities, BridgeProfile, Handshake, ShellProfile } from '@/lib/build/bridge-protocol';

type BridgeState =
  | { kind: 'checking' }
  | { kind: 'unavailable'; blocker: string }
  | { kind: 'ready'; handshake: Handshake };

interface BridgeStatusResponse {
  configured: boolean;
  paired: boolean;
  reachable: boolean;
  bridgeId: string | null;
  fingerprint: string | null;
  capabilities: BridgeCapabilities | null;
  handshake: Handshake | null;
  blocker: string | null;
}

const BACKOFF_LABEL: Record<number, string> = {
  0: '1S',
  1: '2S',
  2: '4S',
  3: '8S',
};

function backoffLabel(attempt: number): string {
  return BACKOFF_LABEL[attempt] ?? '15S';
}

function formatLatency(ms: number | null): string {
  return ms === null ? 'UNMEASURED' : `${ms}MS`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

function formatTime(at: number | null): string {
  if (at === null) return '—';
  return new Date(at).toLocaleTimeString();
}

export function TerminalPage() {
  const [bridge, setBridge] = useState<BridgeState>({ kind: 'checking' });
  const [profile, setProfile] = useState<ShellProfile | ''>('');
  const [cwd, setCwd] = useState('');
  const [stage, setStage] = useState<TerminalStage>('idle');
  const [session, setSession] = useState<TerminalSessionInfo | null>(null);
  const [exit, setExit] = useState<TerminalExit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TerminalStats | null>(null);
  const [timings, setTimings] = useState<TerminalTimings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [findQuery, setFindQuery] = useState('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const transportRef = useRef<TerminalTransport | null>(null);
  const termRef = useRef<{ write: (d: string) => void; dispose: () => void } | null>(null);
  const fitRef = useRef<{ fit: () => void; proposeDimensions: () => { cols: number; rows: number } | undefined } | null>(null);
  const searchRef = useRef<{ findNext: (q: string) => boolean; findPrevious: (q: string) => boolean } | null>(null);
  const statsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bridge status is measured once on mount. The status route reports only what
  // the bridge answered to this request — never an assumed-online state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/build/bridge/status', { cache: 'no-store' });
        const body = (await response.json()) as BridgeStatusResponse;
        if (cancelled) return;
        if (body.reachable && body.handshake) {
          setBridge({ kind: 'ready', handshake: body.handshake });
          const first = body.handshake.profiles[0];
          if (first) setProfile(first.id);
          setCwd(body.handshake.root);
        } else {
          setBridge({
            kind: 'unavailable',
            blocker: body.blocker ?? 'The bridge did not answer. It is not paired or not running.',
          });
        }
      } catch {
        if (!cancelled) {
          setBridge({ kind: 'unavailable', blocker: 'The bridge status could not be read.' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshStats = useCallback(() => {
    const transport = transportRef.current;
    if (!transport) return;
    setStats(transport.measuredStats);
    setTimings(transport.measuredTimings);
  }, []);

  const stopStatsPoll = useCallback(() => {
    if (statsTimer.current !== null) {
      clearInterval(statsTimer.current);
      statsTimer.current = null;
    }
  }, []);

  // Tear down everything on unmount: the socket, the timers, the terminal.
  useEffect(() => {
    const transport = transportRef.current;
    const term = termRef.current;
    return () => {
      stopStatsPoll();
      transport?.close();
      term?.dispose();
      transportRef.current = null;
      termRef.current = null;
    };
  }, [stopStatsPoll]);

  const openSession = useCallback(async () => {
    setError(null);
    setExit(null);

    const mount = containerRef.current;
    if (!mount) {
      setError('The terminal container is not mounted.');
      return;
    }

    // Load xterm on demand. A failed import is a reported failure, not a blank.
    if (!termRef.current) {
      try {
        const [{ Terminal }, { FitAddon }, { WebLinksAddon }, { SearchAddon }] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
          import('@xterm/addon-web-links'),
          import('@xterm/addon-search'),
        ]);
        const term = new Terminal({
          cursorBlink: true,
          fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
          fontSize: 13,
          theme: { background: '#0a0a0f', foreground: '#d8d8e0', cursor: '#bdb0d6' },
        });
        const fit = new FitAddon();
        const links = new WebLinksAddon();
        const search = new SearchAddon();
        term.loadAddon(fit);
        term.loadAddon(links);
        term.loadAddon(search);
        term.open(mount);
        termRef.current = term;
        fitRef.current = fit;
        searchRef.current = search;

        term.onData((data) => {
          transportRef.current?.write(data);
          refreshStats();
        });
      } catch {
        setLoadError('The terminal renderer could not be loaded.');
        return;
      }
    }

    if (!transportRef.current) {
      transportRef.current = new TerminalTransport(
        {
          onOutput: (data) => termRef.current?.write(data),
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
            refreshStats();
          },
          onError: (_code, message) => setError(message),
        },
        { createSocket: (url) => new WebSocket(url) },
      );
    }

    const fit = fitRef.current;
    let cols = 80;
    let rows = 24;
    try {
      fit?.fit();
      const dims = fit?.proposeDimensions();
      if (dims) {
        cols = dims.cols;
        rows = dims.rows;
      }
    } catch { /* the bridge default geometry applies */ }

    await transportRef.current.open({
      ...(profile ? { profile } : {}),
      ...(cwd.trim() ? { cwd: cwd.trim() } : {}),
      cols,
      rows,
    });
    refreshStats();

    stopStatsPoll();
    statsTimer.current = setInterval(refreshStats, 1000);
  }, [profile, cwd, refreshStats, stopStatsPoll]);

  const closeSession = useCallback(() => {
    transportRef.current?.close();
    stopStatsPoll();
    refreshStats();
  }, [refreshStats, stopStatsPoll]);

  const reopen = useCallback(() => {
    setExit(null);
    setError(null);
    void openSession();
  }, [openSession]);

  const clearTerminal = useCallback(() => {
    // xterm has no public clear-to-state API that preserves scrollback accounting;
    // writing the reset sequence is what a real terminal does.
    termRef.current?.write('\x1bc');
  }, []);

  const copySelection = useCallback(async () => {
    try {
      const selection = (termRef.current as unknown as { getSelection?: () => string } | null)?.getSelection?.() ?? '';
      if (!selection) return;
      await navigator.clipboard.writeText(selection);
    } catch {
      setError('The selection could not reach the clipboard.');
    }
  }, []);

  const leaveTerminal = useCallback(() => {
    // Esc must not drop focus into the void. This moves it to a real control.
    document.getElementById('terminal-leave-target')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.shiftKey && event.code === 'Escape') {
        event.preventDefault();
        leaveTerminal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leaveTerminal]);

  // Keep the PTY geometry matched to the panel.
  useEffect(() => {
    if (stage !== 'live') return;
    const onResize = (): void => {
      try {
        fitRef.current?.fit();
        const dims = fitRef.current?.proposeDimensions();
        if (dims) transportRef.current?.resize(dims.cols, dims.rows);
      } catch { /* a failed fit leaves the current geometry in place */ }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [stage]);

  const handshake = bridge.kind === 'ready' ? bridge.handshake : null;
  const profiles: BridgeProfile[] = handshake?.profiles ?? [];
  const live = stage === 'live';
  const busy = stage === 'requesting-ticket' || stage === 'connecting' || stage === 'reconnecting';

  return (
    <div className="dev-route">
      <DevPageHeading
        eyebrow="TOOLS / TERMINAL"
        title="Terminal"
        description="A real shell on the paired machine, or an honest statement that there is none. This page never presents a simulated shell."
        detail={live && session ? `LIVE · PID ${session.pid}` : stage.toUpperCase()}
      />
      <div className="dev-route__grid">
        <DevPanel title="Session">
          <div className={`dev-console dev-console--terminal ${live ? '' : 'dev-console--blocked'}`}>
            <div className="dev-console__bar">
              <span>TERMINAL / SESSION</span>
              <span aria-live="polite">
                {live && session ? `PID ${session.pid}` : stage.toUpperCase()}
              </span>
            </div>

            {bridge.kind === 'checking' && (
              <DevEmpty title="MEASURING…" body="Asking the bridge whether it is there." />
            )}

            {bridge.kind === 'unavailable' && (
              <>
                <DevEmpty title="BRIDGE UNAVAILABLE" body={bridge.blocker} />
                <p className="dev-note">
                  <Link href="/build/settings">CONNECT BRIDGE ↗</Link>
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
                    aria-label="Shell profile"
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
                  Only the profiles this bridge measured are offered. The directory must stay
                  inside the bridge root; anything else is refused.
                </p>
                <button type="button" className="dev-button" onClick={() => void openSession()}>
                  OPEN SESSION
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
                  aria-label="Terminal session. Escape does not leave the terminal; use Leave terminal."
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
                    LEAVE TERMINAL
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

        <DevPanel title="Session">
          {session ? (
            <dl className="dev-facts">
              <Fact label="SESSION" value={session.sessionId.slice(0, 8)} />
              <Fact label="PROFILE" value={session.profile} />
              <Fact label="PID" value={String(session.pid)} />
              <Fact label="STARTED" value={formatTime(timings?.readyAt ?? null)} />
              <Fact label="BYTES IN" value={stats ? formatBytes(stats.bytesIn) : '—'} />
              <Fact label="BYTES OUT" value={stats ? formatBytes(stats.bytesOut) : '—'} />
            </dl>
          ) : (
            <DevEmpty title="NO SESSION" body="Open a session to see measured session facts." />
          )}
        </DevPanel>

        <DevPanel title="Host">
          {handshake ? (
            <dl className="dev-facts">
              <Fact label="HOST" value={handshake.hostname} />
              <Fact label="OS" value={`${handshake.platform} ${handshake.arch}`} />
              <Fact label="USER" value={`${handshake.user}${handshake.elevated ? ' · ELEVATED' : ''}`} />
              <Fact label="MEASURED" value={handshake.measuredAt} />
            </dl>
          ) : (
            <DevEmpty title="NO HOST" body="Pair a bridge to see measured host facts." />
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

/** The connecting steps with what was actually measured for each. */
function stageSteps(timings: TerminalTimings | null): string {
  if (!timings?.ticketRequestedAt) return 'Starting…';
  const parts = [`ticket requested ${formatTime(timings.ticketRequestedAt)}`];
  if (timings.ticketReceivedAt) parts.push(`received ${formatTime(timings.ticketReceivedAt)}`);
  if (timings.connectingAt) parts.push(`connecting ${formatTime(timings.connectingAt)}`);
  if (timings.readyAt) parts.push(`ready ${formatTime(timings.readyAt)}`);
  return `REQUESTING TICKET → CONNECTING → READY · ${parts.join(' · ')}`;
}
