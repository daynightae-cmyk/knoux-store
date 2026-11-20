import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { loadBridgeConfig, bridgeClient } from '@/lib/build/bridge-config';
import { mintTicket, scopesForAction } from '@/lib/build/bridge-tickets';
import { parseEslint, parseTestRunner, parseTypeScript } from '@/lib/build/diagnostics';
import { parseExecStream } from '@/lib/build/bridge-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

/** POST /api/build/execute — execute a build task on a generated project via the bridge. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'exec' });
  if (denied) return denied;

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to execute build tasks.' },
      { status: 401 },
    );
  }

  let body: {
    projectId: string;
    taskId: 'lint' | 'typecheck' | 'test' | 'build' | 'dev' | 'preview';
    cwd?: string;
    env?: Record<string, string>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with projectId and taskId.' },
      { status: 400 },
    );
  }

  if (!body.projectId || !body.taskId) {
    return NextResponse.json(
      { error: 'invalid-body', message: 'projectId and taskId are required.' },
      { status: 400 },
    );
  }

  const validTasks = ['lint', 'typecheck', 'test', 'build', 'dev', 'preview'] as const;
  if (!validTasks.includes(body.taskId)) {
    return NextResponse.json(
      { error: 'invalid-task', message: `Task must be one of: ${validTasks.join(', ')}.` },
      { status: 400 },
    );
  }

  // Load bridge configuration
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

  // Verify project write directory exists
  const { getProjectWriteDir } = await import('@/lib/build/write-executor');
  const projectWriteDir = getProjectWriteDir(body.projectId);
  const { verifyContainment } = await import('@/lib/build/write-executor');

  const workingDir = body.cwd ? path.join(projectWriteDir, body.cwd) : projectWriteDir;
  const containment = verifyContainment(projectWriteDir, workingDir);
  if (!containment.ok) {
    return NextResponse.json(
      { error: 'path-rejected', message: containment.reason },
      { status: 403 },
    );
  }

  // Check if directory exists
  try {
    const { statSync } = await import('node:fs');
    statSync(workingDir);
  } catch {
    return NextResponse.json(
      { error: 'project-not-found', message: 'Generated project directory not found. Run write executor first.' },
      { status: 404 },
    );
  }

  // Map task to bridge allowlist key
  const taskMap: Record<string, string> = {
    lint: 'lint',
    typecheck: 'typecheck',
    test: 'test',
    build: 'build',
    dev: 'dev',
    preview: 'preview',
  };

  const bridgeTask = taskMap[body.taskId];

  // Create ticket for bridge
  const ticket = mintTicket(
    {
      userId: ownerId,
      sid: `build-${Date.now()}`,
      scopes: scopesForAction('exec:run'),
      bridgeId: config.endpoint.bridgeId,
    },
    config.keys,
  );

  // Execute via bridge client
  const client = bridgeClient(config, { timeoutMs: 600_000 });
  const response = await client.execRun(ticket, bridgeTask, workingDir);

  if (!response.ok || !response.data) {
    return NextResponse.json(
      { error: 'exec-failed', message: response.error ?? 'The task could not be started.' },
      { status: 502 },
    );
  }

  // Stream the bridge SSE response
  return streamBuildExecution(response.data, body.taskId, body.projectId);
}

/** Relay the bridge's SSE stream, adding parsed diagnostics before closing. */
function streamBuildExecution(
  bridgeStream: ReadableStream<Uint8Array>,
  taskId: string,
  projectId: string
): Response {
  const encoder = new TextEncoder();
  const iterator = parseExecStream(bridgeStream);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Client hung up
        }
      };

      let stdout = '';
      let stderr = '';
      let exitCode: number | null = null;
      let durationMs: number | null = null;
      let sawExit = false;
      let previewUrl: string | null = null;

      try {
        for await (const event of iterator) {
          switch (event.type) {
            case 'start':
              send('start', { task: taskId, command: event.data ?? '', cwd: (event as { cwd?: string }).cwd ?? null, projectId });
              break;
            case 'chunk': {
              const text = typeof event.data === 'string' ? event.data : '';
              if (event.stream === 'stderr') stderr += text;
              else stdout += text;
              send('chunk', { stream: event.stream ?? 'stdout', data: text });
              break;
            }
            case 'exit':
              sawExit = true;
              exitCode = typeof event.code === 'number' ? event.code : null;
              durationMs = typeof event.durationMs === 'number' ? event.durationMs : null;
              send('exit', { code: exitCode, durationMs, projectId });
              break;
            case 'error':
              send('error', { message: event.data ?? 'The task failed.' });
              break;
            default:
              break;
          }
        }

        // Parse diagnostics from real output
        const combined = stdout + stderr;
        const diagnostics = [
          ...(taskId === 'typecheck' ? parseTypeScript(combined) : []),
          ...(taskId === 'lint' ? parseEslint(combined) : []),
          ...(taskId === 'test' ? parseTestRunner(combined, exitCode ?? 1) : []),
        ];

        // For dev/preview tasks, note that preview would need a tunnel
        const producesPreview = ['dev', 'preview'].includes(taskId);
        if (producesPreview && exitCode === 0) {
          previewUrl = `bridge-tunnel://${projectId}:${taskId === 'dev' ? 3000 : 4173}`;
        }

        send('diagnostics', { items: diagnostics, sawExit, exitCode, previewUrl, projectId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'The bridge stream ended unexpectedly.';
        send('error', { message });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-content-type-options': 'nosniff',
    },
  });
}