/**
 * The single construction site for the project adapter.
 *
 * Returns a BridgeProjectAdapter when a paired bridge exists and the access
 * policy allows, otherwise the read-only FsProjectAdapter. The environment is
 * derived only via `resolveDeploymentEnvironment()` — never from request input.
 *
 * Server-only. This module reads `process.env` and the filesystem.
 */

import { FsProjectAdapter } from './project-adapter';
import { BridgeProjectAdapter } from './bridge-adapter';
import type { Handshake } from './bridge-protocol';
import {
  ENVIRONMENT_LABELS,
  environmentLabel,
  isEnvironmentName,
  resolveDeploymentEnvironment,
} from './deployment';
import type { EnvironmentName } from './deployment';
import type { ProjectAdapter } from './types';

export const ADAPTER_ID = 'knoux-fs-readonly';
export const BRIDGE_ADAPTER_ID = 'knoux-bridge';

export {
  ENVIRONMENT_LABELS,
  environmentLabel,
  isEnvironmentName,
  resolveDeploymentEnvironment,
};
export type { EnvironmentName };

export interface CreateAdapterOptions {
  root?: string;
  env?: Record<string, string | undefined>;
  label?: string;
  /** When a bridge is paired, the cached handshake. */
  bridgeHandshake?: Handshake | null;
  /** When the handshake was last measured. */
  bridgeHandshakeMeasuredAt?: number | null;
  /** Whether the bridge is reachable. */
  bridgeReachable?: boolean;
  /** Last error from the bridge. */
  bridgeError?: string | null;
}

export function createProjectAdapter(
  options: CreateAdapterOptions = {},
): ProjectAdapter {
  const environment = resolveDeploymentEnvironment(options.env ?? process.env);
  const root = options.root ?? process.cwd();
  const label = options.label ?? ENVIRONMENT_LABELS[environment];

  // Use the bridge adapter when a bridge is paired and reachable.
  if (options.bridgeHandshake && options.bridgeReachable) {
    return new BridgeProjectAdapter({
      root,
      environment,
      label,
      handshake: options.bridgeHandshake,
      handshakeMeasuredAt: options.bridgeHandshakeMeasuredAt ?? null,
      bridgeReachable: options.bridgeReachable,
      bridgeError: options.bridgeError ?? null,
    });
  }

  return new FsProjectAdapter({ root, environment, label });
}
