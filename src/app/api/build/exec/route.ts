import { NextResponse, type NextRequest } from 'next/server';
import { guardBuildApi, resolveBuildOwnerId } from '@/lib/build/api-guard';
import { parseExecStream } from '@/lib/build/bridge-client';
import { bridgeClient, loadBridgeConfig } from '@/lib/build/bridge-config';
import { mintTicket, scopesForAction } from '@/lib/build/bridge-tickets';
import { parseEslint, parseTestRunner, parseTypeScript } from '@/lib/build/diagnostics';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const TASKS = new Set(['lint', 'typecheck', 'test', 'build']);

/**
 * Verification execution through the bridge.
 *
 * POST body: { task: string }
 *
 * The task name selects one of four allowlisted package scripts. The bridge holds
 * the argv for each and runs it with shell:false, so nothing a caller writes ever
 * reaches a command line. The bridge's own allowlist is the authority; this route
 * only checks that the name is one this deployment recognises.
 *
 * Events streamed to the client:
 *   start        the task and the exact command the bridge will run
 *   chunk        real stdout/stderr as it is produced
 *   diagnostics  parsed from the accumulated output
 *   exit         the real exit code and duration
 *   error        a failure to start or run
 *
 * Without a paired bridge this route refuses. It does not silently fall back to
 * running the command on the server, because that would move an operator's
 * decision about where code runs from the bridge config to the env.
 */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: 'exec' });
  if (denied) return denied;

  let body: { task?: unknown };
  try {
    body = await request.json() as { task?: unknown };
  } catch {
    return NextResponse.json(
      { error: 'invalid-body', message: 'Expected a JSON body with a task name.' },
      { status: 400 },
    );
  }

  const task = typeof body.task === 'string' ? body.task : '';
  if (!TASKS.has(task)) {
    return NextResponse.json(
      { error: 'task-not-allowlisted', message: `The task must be one of ${[...TASKS].join(', ')}.` },
      { status: 400 },
    );
  }

  const ownerId = await resolveBuildOwnerId();
  if (!ownerId) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign in to run verification.' },
      { status: 401 },
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

  const client = bridgeClient(config, { timeoutMs: 300_000 });

  const token = mintTicket(
    {
      userId: ownerId,
      sid: `exec-${Date.now()}`,
      scopes: scopesForAction('exec:run'),
      bridgeId: config.endpoint.bridgeId,
    },
    config.keys,
  );

  const response = await client.execRun(token, task);
  if (!response.ok || !response.data) {
    return NextResponse.json(
      { error: 'exec-failed', message: response.error ?? 'The task could not be started.' },
      { status: 502 },
    );
  }

  return streamExec(response.data, task);
}

/** Relay the bridge's SSE stream, adding parsed diagnostics before closing. */
function streamExec(bridgeStream: ReadableStream<Uint8Array>, task: string): Response {
  const encoder = new TextEncoder();
  const iterator = parseExecStream(bridgeStream);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // The client hung up mid-stream; the loop below stops on the next read.
        }
      };

      let stdout = '';
      let stderr = '';
      let exitCode: number | null = null;
      let durationMs: number | null = null;
      let sawExit = false;

      try {
        for await (const event of iterator) {
          switch (event.type) {
            case 'start':
              send('start', { task, command: event.data ?? '', cwd: (event as { cwd?: string }).cwd ?? null });
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
              send('exit', { code: exitCode, durationMs });
              break;
            case 'error':
              send('error', { message: event.data ?? 'The task failed.' });
              break;
            default:
              break;
          }
        }

        // Diagnostics are parsed from real output. If no exit was observed the
        // task did not finish, and that is reported rather than guessed.
        const combined = stdout + stderr;
        const diagnostics = [
          ...(task === 'typecheck' ? parseTypeScript(combined) : []),
          ...(task === 'lint' ? parseEslint(combined) : []),
          ...(task === 'test' ? parseTestRunner(combined, exitCode ?? 1) : []),
        ];
        send('diagnostics', { items: diagnostics, sawExit, exitCode });
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