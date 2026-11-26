import type { CostEstimate, StreamChunk } from '@/lib/ai/types';

/** Display the reported currency without conversion or treating UNKNOWN as free. */
export function formatRuntimeCost(cost: CostEstimate | null | undefined): string {
  if (!cost || cost.basis === 'UNKNOWN' || typeof cost.amount !== 'number' || !Number.isFinite(cost.amount) || typeof cost.currency !== 'string' || !cost.currency.trim()) {
    return 'cost UNKNOWN';
  }
  return `${cost.basis} ${cost.currency} ${cost.amount.toFixed(6)}`;
}

export async function readRuntimeJson<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(value?.message ?? value?.error?.safeMessage ?? `Runtime request failed (HTTP ${response.status}).`);
  }
  if (!value || typeof value !== 'object') throw new Error('The runtime returned an invalid response.');
  return value as T;
}

export type RuntimeStreamEvent = StreamChunk & {
  actualModelId?: string | null;
  estimatedCost?: CostEstimate | null;
};

/** Consume the actual SSE completion; EOF alone never establishes success. */
export async function readRuntimeStream(response: Response, onChunk: (chunk: RuntimeStreamEvent) => void): Promise<RuntimeStreamEvent> {
  if (!response.ok) {
    const value = await response.clone().json().catch(() => null);
    throw new Error(value?.message ?? value?.error?.safeMessage ?? `Stream request failed (HTTP ${response.status}).`);
  }
  if (!response.body) throw new Error('The runtime returned no stream body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let data: string[] = [];
  function event(): RuntimeStreamEvent | null {
    if (!data.length) return null;
    const text = data.join('\n');
    data = [];
    let chunk: RuntimeStreamEvent;
    try { chunk = JSON.parse(text) as RuntimeStreamEvent; } catch { throw new Error('The runtime returned a malformed stream event.'); }
    if (!chunk || typeof chunk.delta !== 'string' || typeof chunk.done !== 'boolean') throw new Error('The runtime returned an invalid stream event.');
    if (chunk.error) throw new Error(chunk.error.safeMessage ?? 'Provider stream failed.');
    onChunk(chunk);
    return chunk.done ? chunk : null;
  }
  function line(text: string): RuntimeStreamEvent | null {
    if (text === '') return event();
    if (text.startsWith('data:')) data.push(text.slice(5).replace(/^ /, ''));
    return null;
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const text = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        const terminal = line(text);
        if (terminal) return terminal;
      }
      if (done) {
        if (buffer) {
          const terminal = line(buffer.replace(/\r$/, ''));
          if (terminal) return terminal;
        }
        const terminal = event();
        if (terminal) return terminal;
        throw new Error('The provider stream ended without a completion receipt.');
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
