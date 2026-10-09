import type { UsageRecord } from '../types';
import type { UsageSnapshot, LimitSnapshot } from './types';
export function unknownUsage(source: UsageSnapshot['source']): UsageSnapshot { return { source, window: null, requests: null, inputTokens: null, outputTokens: null, cost: null, costBasis: 'UNKNOWN', currency: 'USD', measuredAt: null, errors: null, fallbacks: null, latencyMs: null, ttftMs: null }; }
export function measuredUsage(records: UsageRecord[]): UsageSnapshot {
    const result = unknownUsage('KNOuX_MEASURED');
    result.window = 'CURRENT SERVER INSTANCE · retained last 10,000 workspace operations';
    if (!records.length)
        return result;
    const sum = (key: 'inputTokens' | 'outputTokens') => records.some(record => record[key] === null) ? null : records.reduce((total, record) => total + (record[key] ?? 0), 0);
    const costs = records.map(record => record.estimatedCost);
    return { ...result, requests: records.length, inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens'), cost: costs.some(cost => cost?.amount == null) ? null : costs.reduce((total, cost) => total + (cost?.amount ?? 0), 0), costBasis: costs.some(cost => !cost || cost.basis === 'UNKNOWN') ? 'UNKNOWN' : costs.some(cost => cost?.basis === 'ESTIMATED') ? 'ESTIMATED' : 'MEASURED', measuredAt: records[0].timestamp, errors: records.filter(record => !record.success).length, fallbacks: records.reduce((total, record) => total + record.fallbackCount, 0), latencyMs: records.some(record => record.latencyMs === null) ? null : records.reduce((total, record) => total + (record.latencyMs ?? 0), 0) / records.length, ttftMs: records.find(record => record.ttftMs !== null)?.ttftMs ?? null };
}
/** Allowlisted numeric fields only. Raw key labels, hashes and response bodies never leave the server. */
export function openRouterUsage(value: unknown, measuredAt: string): {
    usage: UsageSnapshot;
    limits: LimitSnapshot[];
} {
    const body = value && typeof value === 'object' ? 'data' in value ? (value as {
        data: unknown;
    }).data : null : null;
    const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const numeric = (key: string) => typeof data[key] === 'number' && Number.isFinite(data[key]) && Number(data[key]) >= 0 ? Number(data[key]) : null;
    const total = numeric('limit'), remaining = numeric('limit_remaining'), usage = numeric('usage');
    return { usage: { ...unknownUsage('PROVIDER_REPORTED'), window: 'API KEY · provider-reported lifetime usage', cost: usage, costBasis: usage === null ? 'UNKNOWN' : 'MEASURED', measuredAt }, limits: [{ source: 'PROVIDER_REPORTED', limitType: 'API_KEY_CREDIT_LIMIT_USD', total, remaining, percentRemaining: total !== null && total > 0 && remaining !== null ? Math.min(100, remaining / total * 100) : null, resetAt: null, window: typeof data.limit_reset === 'string' && ['daily', 'weekly', 'monthly'].includes(data.limit_reset) ? data.limit_reset : null, measuredAt }] };
}
