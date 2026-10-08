import { createServer, type ServerResponse } from 'node:http';
import type { Page } from '@playwright/test';
import { contractPlan } from './build-generator';

/** A real incremental HTTP response carrying explicitly labelled contract data. */
export async function incrementalPlanFixture(page: Page, product = 'delivery platform') {
  let response: ServerResponse | null = null;
  let connected!: () => void;
  const ready = new Promise<void>((resolve) => { connected = resolve; });
  const server = createServer((request, result) => {
    if (request.method === 'OPTIONS') { result.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' }); result.end(); return; }
    request.resume(); response = result;
    result.writeHead(200, { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
    connected();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Contract HTTP server did not start.');
  await page.route('**/api/build/ai/stream', (route) => route.continue({ url: `http://127.0.0.1:${address.port}/contract-stream` }));
  const plan = JSON.stringify(contractPlan(product));
  const boundary = plan.indexOf(',"ARCHITECTURE"');
  const send = (chunk: unknown) => response?.write(`data: ${JSON.stringify(chunk)}\n\n`);
  return {
    ready,
    open() { response?.flushHeaders(); },
    first() { send({ delta: plan.slice(0, boundary), done: false }); },
    finish() { send({ delta: plan.slice(boundary), done: false }); send({ delta: '', done: true, actualProviderId: 'gemini', actualModelId: 'contract-version', usage: { inputTokens: 12, outputTokens: 40 }, latencyMs: 20, ttftMs: 4 }); response?.end(); },
    async close() { response?.end(); server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); },
  };
}
