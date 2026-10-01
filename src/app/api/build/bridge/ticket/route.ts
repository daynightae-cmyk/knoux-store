import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { loadBridgeConfig } from '@/lib/build/bridge-config';
import { mintTicket, scopesForAction } from '@/lib/build/bridge-tickets';
import type { ShellProfile } from '@/lib/build/bridge-protocol';

export const dynamic = 'force-dynamic';

/**
 * Mint a terminal ticket for the browser.
 *
 * POST body: { profile?: ShellProfile, cwd?: string, sid?: string }
 *
 * The browser cannot mint tickets — the signing key never leaves the server —
 * and it cannot set headers on a WebSocket handshake, so the ticket travels as
 * a query parameter. This route is the only place a browser-legible ticket is
 * created, and every ticket it mints is scoped to exactly `terminal:open` plus
 * `terminal:input`, audience-bound to the paired bridge id, and valid for 60
 * seconds. A reconnect mints a fresh one; an old ticket is never reused.
 *
 * `cwd`, when given, must be a relative path inside the workspace. The bridge
 * re-checks containment after `realpath` regardless, so a hostile value fails
 * closed there too — but there is no reason to mint a ticket the bridge will
 * refuse.
 */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'terminal' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to open a terminal session.' },
      { status: 401 },
    );
  }

  let body: { profile?: unknown; cwd?: unknown; sid?: unknown };
  try {
    body = (await request.json()) as { profile?: unknown; cwd?: unknown; sid?: unknown };
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with profile, cwd and sid.' },
      { status: 400 },
    );
  }

  const config = await loadBridgeConfig({ ownerId });
  if (!config.endpoint || !config.keys) {
    return NextResponse.json(
      {
        error: 'bridge-unavailable',
        message: config.blocker ?? 'No bridge is paired for this account.',
      },
      { status: 503 },
    );
  }

  // Profile must be one of the closed shell set, or omitted for the bridge default.
  const profile = typeof body.profile === 'string' && isShellProfile(body.profile)
    ? body.profile
    : undefined;

  // cwd must be a relative path. Absolute paths, traversal and null bytes are
  // refused here; the bridge's own jail is the second line of defence.
  const cwd = typeof body.cwd === 'string' && isRelativeWorkspacePath(body.cwd)
    ? body.cwd
    : undefined;

  const sid = typeof body.sid === 'string' && body.sid.length > 0 && body.sid.length <= 64
    ? body.sid
    : `web-${Date.now()}`;

  const ticket = mintTicket(
    {
      userId: ownerId,
      sid,
      scopes: scopesForAction('terminal:open'),
      bridgeId: config.endpoint.bridgeId,
      ...(cwd ? { cwd } : {}),
      ...(profile ? { profile } : {}),
    },
    config.keys,
  );

  // The browser connects to the bridge directly; the Next.js server never sees
  // the PTY stream. http(s) becomes ws(s); anything else was rejected at pairing.
  const wsUrl = config.endpoint.url.replace(/^http/, 'ws');

  return NextResponse.json(
    {
      ticket,
      wsUrl,
      bridgeId: config.endpoint.bridgeId,
      // The client must treat the ticket as expired at this time, not discover
      // it by having the bridge refuse the socket.
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

const SHELL_PROFILES: readonly string[] = ['pwsh', 'powershell', 'cmd', 'bash', 'zsh'];

function isShellProfile(value: string): value is ShellProfile {
  return (SHELL_PROFILES as readonly string[]).includes(value);
}

/** A relative workspace path: no drive letter, no leading slash, no traversal. */
function isRelativeWorkspacePath(value: string): boolean {
  if (value.length === 0 || value.length > 400) return false;
  if (value.includes('\0')) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  if (/^[a-zA-Z]:/.test(value)) return false;
  const segments = value.replace(/\\/g, '/').split('/');
  if (segments.some((s) => s === '..')) return false;
  return true;
}
