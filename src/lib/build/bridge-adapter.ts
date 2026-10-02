/**
 * Bridge project adapter — composes FsProjectAdapter with bridge capabilities.
 *
 * Capabilities are derived from the cached handshake (TTL 20s). When the
 * handshake is stale, the adapter re-probes. When the bridge is unreachable,
 * every bridge-derived capability becomes `blocked` with a measured reason.
 *
 * Selected-project reads use the authenticated bridge transport exclusively.
 * Inspection never authorizes imported package scripts or project mutations.
 *
 * Server-only. Never imported by client components.
 */

import type { BuildCapability, CapabilityStatus, EnvironmentName, ProjectAdapter, ProjectSnapshot, GitSnapshot, DatabaseStatus, VerificationSnapshot } from './types';
import type { Handshake } from './bridge-protocol';
import { FsProjectAdapter } from './project-adapter';
import type { BridgeClient } from './bridge-client';
import type { BridgeScope } from './bridge-protocol';

export interface BridgeAdapterOptions {
  client?: BridgeClient;
  ticket?: (scopes: BridgeScope[]) => string;
  projectRef?: string;
  root: string;
  environment: EnvironmentName;
  label: string;
  /** Cached handshake, or null if not yet fetched. */
  handshake: Handshake | null;
  /** When the handshake was last measured. */
  handshakeMeasuredAt: number | null;
  /** Whether the bridge is reachable. */
  bridgeReachable: boolean;
  /** Last error from the bridge, if any. */
  bridgeError: string | null;
}

export class BridgeProjectAdapter implements ProjectAdapter {
  readonly id = 'knoux-bridge';
  readonly label: string;
  readonly environment: EnvironmentName;
  readonly root: string;
  private fsAdapter: FsProjectAdapter;
  private options: BridgeAdapterOptions;

  constructor(options: BridgeAdapterOptions) {
    this.root = options.root;
    this.environment = options.environment;
    this.label = options.label;
    this.options = options;
    this.fsAdapter = new FsProjectAdapter({
      root: options.root,
      environment: options.environment,
      label: options.label,
    });
  }

  /**
   * Capabilities derived from the handshake.
   * When no handshake exists, bridge-derived capabilities are blocked.
   */
  capabilities(): Record<BuildCapability, CapabilityStatus> {
    const fsCaps = this.fsAdapter.capabilities();
    const handshake = this.options.handshake;
    const reachable = this.options.bridgeReachable;

    // The handshake lists the shell profiles this host actually probed. PowerShell
    // is available only when one of them really is PowerShell.
    const hasPowerShell = handshake?.profiles.some((p) => p.id === 'pwsh' || p.id === 'powershell') ?? false;

    if (!handshake || !reachable) {
      return {
        ...fsCaps,
        'project.write': 'blocked',
        'project.delete': 'blocked',
        'command.arbitrary': 'blocked',
        'terminal.interactive': 'blocked',
        'terminal.powershell': 'blocked',
        'runtime.manage': 'blocked',
        'git.write': 'blocked',
        'metrics.read': 'blocked',
        'fs.watch': 'blocked',
        'database.write': 'blocked',
        'deploy.trigger': 'blocked',
        'deploy.history': 'blocked',
      };
    }

    const caps = handshake.capabilities;
    return {
      ...fsCaps,
      // The bridge measures the filesystem capability, so these follow it.
      'project.write': 'blocked',
      'project.delete': 'blocked',
      'command.allowlisted': 'blocked',
      'test.run': 'blocked',
      'diagnostics.read': 'blocked',
      'preview.live': 'blocked',
      'preview.inspect': 'blocked',
      // Arbitrary commands are never reachable through the bridge's allowlist.
      'command.arbitrary': 'blocked',
      'terminal.interactive': caps.terminal ? 'available' : 'blocked',
      'terminal.powershell': caps.terminal && hasPowerShell ? 'available' : 'blocked',
      'runtime.manage': caps.processes ? 'available' : 'blocked',
      'git.write': caps.git ? 'available' : 'blocked',
      // Metrics come from the bridge's own sampler, on demand.
      'metrics.read': caps.metrics ? 'available' : 'blocked',
      // The bridge has no watcher; logs are polled from its ring buffers.
      'fs.watch': 'blocked',
      'database.write': 'blocked',
      'deploy.trigger': 'blocked',
      'deploy.history': 'blocked',
    };
  }

  blockerFor(capability: BuildCapability): string | null {
    if (['command.allowlisted', 'test.run', 'diagnostics.read'].includes(capability)) return 'Imported projects are inspection only. Execution requires a separately trusted bridge task profile; opening a repository never authorizes its scripts.';
    if (capability === 'preview.live' || capability === 'preview.inspect') return 'No preview runtime is reported for this selected local project. Start a trusted runtime separately.';
    const handshake = this.options.handshake;
    const connected = Boolean(handshake) && this.options.bridgeReachable;
    const unreachable = this.options.bridgeError ?? 'The bridge is not reachable.';
    const caps = handshake?.capabilities;

    switch (capability) {
      case 'project.write':
      case 'project.delete':
        return 'Project mutation is not exposed by this inspection adapter. Use a separately authorized bridge operation.';

      case 'terminal.interactive':
        if (!connected) return `Bridge terminal access is unavailable. ${unreachable}`;
        return caps?.terminal ? null : 'The bridge found no shell profile on this host.';

      case 'terminal.powershell':
        if (!connected) return `Bridge terminal access is unavailable. ${unreachable}`;
        if (!caps?.terminal) return 'The bridge found no shell profile on this host.';
        return handshake?.profiles.some((p) => p.id === 'pwsh' || p.id === 'powershell')
          ? null
          : 'The bridge found no PowerShell profile on this host.';

      case 'runtime.manage':
        if (!connected) return `Bridge process management is unavailable. ${unreachable}`;
        return caps?.processes
          ? null
          : 'The bridge has no process profiles configured in bridge.config.json.';

      case 'git.write':
        if (!connected) return `Bridge git access is unavailable. ${unreachable}`;
        return caps?.git ? null : 'The bridge could not run git in its workspace root.';

      case 'metrics.read':
        if (!connected) return `Bridge metrics are unavailable. ${unreachable}`;
        return caps?.metrics ? null : 'The bridge reports no metrics capability on this host.';

      case 'command.arbitrary':
        return 'Arbitrary commands are not reachable. The bridge runs only its own allowlist.';

      case 'fs.watch':
        return 'The bridge does not watch the filesystem. Reload or poll instead.';

      default:
        return this.fsAdapter.blockerFor(capability);
    }
  }

  async snapshot(): Promise<ProjectSnapshot> {
    return this.remote<ProjectSnapshot>('inspect', ['fs:read']);
  }

  async readFile(path: string): Promise<{ content: string; language: string; bytes: number; lines: number } | null> {
    if (!/^(?:(?:src|docs|tests|references)\/[A-Za-z0-9_@().\[\]/-]+|README\.md|package\.json|AGENTS\.md|tsconfig\.json)$/.test(path) || path.split('/').some((part) => part.startsWith('.'))) return null;
    return this.remote('file', ['fs:read'], `&path=${encodeURIComponent(path)}`);
  }

  async gitSnapshot(): Promise<GitSnapshot> {
    const result = await this.remote<import('./bridge-protocol').GitSnapshot>('git', ['git:read']);
    return { ...result, originMainSha: null, ahead: null, behind: null };
  }

  async runVerification(task: string): Promise<VerificationSnapshot> {
    throw new Error(`Verification ${task} requires a trusted project task profile. Project inspection does not authorize execution.`);
  }

  private async remote<T>(action: string, scopes: BridgeScope[], extra = ''): Promise<T> {
    if (!this.options.client || !this.options.ticket) throw new Error('Bridge project transport is unavailable.');
    const result = await this.options.client.request<T>({ method: 'GET', path: `/v1/project/${action}?project=${encodeURIComponent(this.options.projectRef ?? '.')}${extra}`, token: this.options.ticket(scopes) });
    if (!result.ok || !result.data) throw new Error(result.error ?? 'Bridge project read failed.');
    return result.data;
  }

  database(): DatabaseStatus {
    return this.fsAdapter.database();
  }
}
