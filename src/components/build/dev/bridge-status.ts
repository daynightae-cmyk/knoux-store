import type { BridgeCapabilities, BridgeProfile, Handshake } from '@/lib/build/bridge-protocol';

export type BridgeStatusResponse = {
  configured: boolean;
  paired: boolean;
  reachable: boolean;
  handshake: Handshake | null;
  capabilities: BridgeCapabilities | null;
  blocker: string | null;
  message?: string;
  noProfiles: boolean;
};

/** A refused status request can never advertise an available command channel. */
export function bridgeStatus(status: number, value: unknown): BridgeStatusResponse {
  const body = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const handshake = body.handshake && typeof body.handshake === 'object' ? body.handshake as Handshake : null;
  const profiles = Array.isArray(handshake?.profiles) ? handshake.profiles.filter((profile): profile is BridgeProfile =>
    Boolean(profile && ['pwsh', 'powershell', 'cmd', 'bash', 'zsh'].includes(profile.id) && typeof profile.version === 'string'),
  ) : [];
  const accepted = status >= 200 && status < 300;
  const noProfiles = accepted && body.reachable === true && Boolean(handshake) && profiles.length === 0;
  const reachable = accepted && body.reachable === true && handshake?.capabilities?.terminal === true && profiles.length > 0;
  return {
    configured: body.configured === true,
    paired: body.paired === true,
    reachable,
    handshake: reachable && handshake ? { ...handshake, profiles } : null,
    capabilities: reachable && handshake ? handshake.capabilities : null,
    noProfiles,
    blocker: status === 401 ? 'Sign in to inspect this workspace bridge.'
      : !accepted ? `Bridge status request was refused (HTTP ${status}).`
      : noProfiles ? 'The bridge advertised no usable shell profile.'
      : typeof body.blocker === 'string' ? body.blocker
      : !reachable ? 'No reachable terminal capability was verified.' : null,
    message: typeof body.message === 'string' ? body.message : undefined,
  };
}
