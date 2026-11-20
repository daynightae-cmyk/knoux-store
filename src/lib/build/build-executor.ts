/**
 * Build Executor — runs allowlisted build/test commands on generated projects via the Bridge.
 *
 * This connects the write executor output to real build verification.
 * Every build runs on the paired bridge (local/operator machine), not on the web server.
 * The bridge enforces allowlisted commands, path containment, and audit logging.
 */

import path from 'node:path';
import type { BuildCapability, CapabilityStatus } from './types';
import { getProjectWriteDir } from './write-executor';

/** Build task definition. */
export interface BuildTask {
  /** Task identifier (matches bridge allowlist key). */
  id: 'lint' | 'typecheck' | 'test' | 'build' | 'dev' | 'preview';
  /** Human-readable label. */
  label: string;
  /** Package script name. */
  script: string;
  /** Whether this task produces a runnable preview. */
  producesPreview: boolean;
  /** Preview port if applicable (for dev/preview tasks). */
  previewPort?: number;
  /** Estimated max duration in ms. */
  maxDurationMs: number;
}

/** Available build tasks for generated projects. */
export const GENERATED_PROJECT_TASKS: BuildTask[] = [
  { id: 'lint', label: 'Lint', script: 'lint', producesPreview: false, maxDurationMs: 120_000 },
  { id: 'typecheck', label: 'TypeCheck', script: 'typecheck', producesPreview: false, maxDurationMs: 180_000 },
  { id: 'test', label: 'Test', script: 'test', producesPreview: false, maxDurationMs: 300_000 },
  { id: 'build', label: 'Build', script: 'build', producesPreview: false, maxDurationMs: 300_000 },
  { id: 'dev', label: 'Dev Server', script: 'dev', producesPreview: true, previewPort: 3000, maxDurationMs: 600_000 },
  { id: 'preview', label: 'Preview Server', script: 'preview', producesPreview: true, previewPort: 4173, maxDurationMs: 120_000 },
];

/** Build execution request. */
export interface BuildExecutionRequest {
  projectId: string;
  taskId: string;
  /** Bridge ticket for authentication. */
  ticket: string;
  /** Bridge endpoint URL. */
  bridgeUrl: string;
  /** Optional working directory override (must be within project write dir). */
  cwd?: string;
  /** Environment variables to pass. */
  env?: Record<string, string>;
}

/** Build execution result. */
export interface BuildExecutionResult {
  taskId: string;
  startedAt: string;
  completedAt: string | null;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number | null;
  previewUrl: string | null;
  diagnostics: Array<{
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    code?: string;
  }>;
}

/** Execute a build task on the generated project via the bridge. */
export async function executeBuildTask(
  request: BuildExecutionRequest,
  abortSignal?: AbortSignal
): Promise<BuildExecutionResult> {
  const { projectId, taskId, ticket, bridgeUrl, cwd } = request;

  const task = GENERATED_PROJECT_TASKS.find(t => t.id === taskId);
  if (!task) {
    throw new Error(`Unknown build task: ${taskId}`);
  }

  const projectWriteDir = getProjectWriteDir(projectId);
  const workingDir = cwd ? path.join(projectWriteDir, cwd) : projectWriteDir;

  // Verify containment
  const { verifyContainment } = await import('./write-executor');
  const containment = verifyContainment(projectWriteDir, workingDir);
  if (!containment.ok) {
    throw new Error(`Working directory escapes project write directory: ${containment.reason}`);
  }

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  // Call bridge exec endpoint
  const response = await fetch(`${bridgeUrl}/v1/exec/run`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ticket}`,
    },
    body: JSON.stringify({
      task: task.script,
      cwd: workingDir,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Bridge request failed' }));
    throw new Error(`Bridge exec failed: ${error.message ?? response.statusText}`);
  }

  // Parse SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body from bridge');
  }

  let stdout = '';
  let stderr = '';
  let exitCode: number | null = null;
  let durationMs: number | null = null;
  let previewUrl: string | null = null;
  const diagnostics: BuildExecutionResult['diagnostics'] = [];

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('event:') && !line.startsWith('data:')) continue;

        if (line.startsWith('event:')) {
          const _event = line.slice(6).trim();
          // We'll handle events when we see the data line
        } else if (line.startsWith('data:')) {
          try {
            const data = JSON.parse(line.slice(5).trim());
            // The bridge sends: start, chunk, exit, error, diagnostics
            // We need to track the event type from the previous line
            // For simplicity, we'll parse based on data structure
            if (data.stream) {
              // chunk event
              if (data.stream === 'stdout') stdout += data.data;
              else if (data.stream === 'stderr') stderr += data.data;
            } else if (data.code !== undefined) {
              // exit event
              exitCode = data.code;
              durationMs = data.durationMs ?? Date.now() - startedMs;
            } else if (data.items) {
              // diagnostics event
              diagnostics.push(...data.items);
            } else if (data.message) {
              // error event
              stderr += `\nBridge error: ${data.message}`;
            } else if (data.command) {
              // start event - could extract preview URL for dev/preview tasks
              if (task.producesPreview && data.cwd) {
                // Preview URL would be http://localhost:PORT but bridge runs on different host
                // We'll need a tunnel or the bridge to report the actual URL
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const completedAt = new Date().toISOString();

  // For dev/preview tasks, the preview URL would need a tunnel
  // This is a simplified version - real implementation would use the bridge's process management
  if (task.producesPreview && exitCode === 0) {
    // The bridge would need to expose the port via a tunnel
    // For now, we'll note it's available
    previewUrl = `bridge-tunnel://${projectId}:${task.previewPort}`;
  }

  return {
    taskId,
    startedAt,
    completedAt,
    exitCode,
    stdout,
    stderr,
    durationMs,
    previewUrl,
    diagnostics,
  };
}

/** Get build executor capabilities. */
export function getBuildExecutorCapabilities(): Record<BuildCapability, CapabilityStatus> {
  const bridgeConfigured = Boolean(process.env.KNOUX_BRIDGE_URL && process.env.KNOUX_BRIDGE_KEYS);

  return {
    'project.read': 'available',
    'project.files': 'available',
    'project.write': 'blocked',
    'project.delete': 'blocked',
    'command.allowlisted': bridgeConfigured ? 'available' : 'blocked',
    'command.arbitrary': 'blocked',
    'terminal.interactive': 'blocked',
    'terminal.powershell': 'blocked',
    'runtime.manage': bridgeConfigured ? 'available' : 'blocked',
    'git.read': 'available',
    'git.write': 'blocked',
    'preview.live': bridgeConfigured ? 'available' : 'blocked',
    'preview.inspect': bridgeConfigured ? 'available' : 'blocked',
    'database.read': 'unconfigured',
    'database.write': 'blocked',
    'provider.execute': 'unconfigured',
    'provider.probe': 'unconfigured',
    'diagnostics.read': bridgeConfigured ? 'available' : 'blocked',
    'test.run': bridgeConfigured ? 'available' : 'blocked',
    'deploy.trigger': 'blocked',
    'deploy.history': 'unconfigured',
    'metrics.read': 'blocked',
    'fs.watch': 'blocked',
  };
}

/** Blocker messages for build executor capabilities. */
export function getBuildExecutorBlockers(): Partial<Record<BuildCapability, string>> {
  const bridgeConfigured = Boolean(process.env.KNOUX_BRIDGE_URL && process.env.KNOUX_BRIDGE_KEYS);

  if (!bridgeConfigured) {
    return {
      'command.allowlisted': 'No bridge is paired. Pair a KNOuX Bridge to run build tasks.',
      'runtime.manage': 'No bridge is paired. Pair a KNOuX Bridge to manage runtime processes.',
      'preview.live': 'No bridge is paired. Pair a KNOuX Bridge for live preview of generated projects.',
      'preview.inspect': 'No bridge is paired. Pair a KNOuX Bridge for preview inspection.',
      'diagnostics.read': 'No bridge is paired. Pair a KNOuX Bridge to read build diagnostics.',
      'test.run': 'No bridge is paired. Pair a KNOuX Bridge to run tests.',
    };
  }
  return {};
}