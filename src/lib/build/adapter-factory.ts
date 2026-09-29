/**
 * The single construction site for the read-only project adapter.
 *
 * The environment is not a parameter. It is derived, in `environment.ts`, from
 * the deployment — which is the property the previous per-route construction
 * lacked, where one route derived it and four hard-coded `'production'`.
 *
 * Server-only. This module reads `process.env` and the filesystem.
 */

import { FsProjectAdapter } from './project-adapter';
import {
  ENVIRONMENT_LABELS,
  environmentLabel,
  isEnvironmentName,
  resolveDeploymentEnvironment,
} from './deployment';
import type { EnvironmentName } from './deployment';

export const ADAPTER_ID = 'knoux-fs-readonly';

export {
  ENVIRONMENT_LABELS,
  environmentLabel,
  isEnvironmentName,
  resolveDeploymentEnvironment,
};
export type { EnvironmentName };

export function createProjectAdapter(
  options: { root?: string; env?: Record<string, string | undefined>; label?: string } = {},
): FsProjectAdapter {
  const environment = resolveDeploymentEnvironment(options.env ?? process.env);
  return new FsProjectAdapter({
    root: options.root ?? process.cwd(),
    environment,
    label: options.label ?? ENVIRONMENT_LABELS[environment],
  });
}
