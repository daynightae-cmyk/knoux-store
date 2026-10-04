import type { BridgeScope } from '@/lib/build/bridge-protocol';

export interface ControlToolSpec {
  scopes: BridgeScope[];
  mutating: boolean;
}

export const CONTROL_TOOLS = {
  'bridge.handshake': { scopes: ['terminal:open'], mutating: false },
  'git.status': { scopes: ['git:read'], mutating: false },
  'metrics.read': { scopes: ['metrics:read'], mutating: false },
  'proc.list': { scopes: ['proc:list'], mutating: false },
  'logs.read': { scopes: ['logs:read'], mutating: false },
  'fs.list': { scopes: ['fs:read'], mutating: false },
  'fs.read': { scopes: ['fs:read'], mutating: false },
} as const satisfies Record<string, ControlToolSpec>;

export type ControlToolName = keyof typeof CONTROL_TOOLS;

export function getControlToolSpec(tool: string): ControlToolSpec | null {
  return Object.prototype.hasOwnProperty.call(CONTROL_TOOLS, tool)
    ? CONTROL_TOOLS[tool as ControlToolName]
    : null;
}

export function validateControlToolArgs(
  tool: string,
  raw: unknown,
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  const args = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  switch (tool) {
    case 'bridge.handshake':
    case 'git.status':
    case 'metrics.read':
    case 'proc.list':
      return Object.keys(args).length === 0
        ? { ok: true, args: {} }
        : { ok: false, error: tool + ' does not accept arguments.' };

    case 'logs.read': {
      const name = typeof args.name === 'string' ? args.name.trim() : '';
      if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) {
        return { ok: false, error: 'logs.read requires an allowlisted process name.' };
      }
      const since = Number.isInteger(args.since) && Number(args.since) >= 0 ? Number(args.since) : 0;
      const limit = Number.isInteger(args.limit)
        ? Math.max(1, Math.min(500, Number(args.limit)))
        : 200;
      return { ok: true, args: { name, since, limit } };
    }

    case 'fs.list':
    case 'fs.read': {
      const path = typeof args.path === 'string' ? args.path.trim() : '';
      if (!path || path.length > 4096 || path.includes('\0')) {
        return { ok: false, error: tool + ' requires a valid path.' };
      }
      return { ok: true, args: { path } };
    }

    default:
      return { ok: false, error: 'The requested control-plane tool is not allowlisted.' };
  }
}
