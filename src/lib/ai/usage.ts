import "server-only";
import { runtimeNamespace, providerRuntimeContext } from "./provider-os/runtime-context";
import type { UsageRecord, UsageSummary, CostEstimate } from "./types";

/**
 * Usage ledger. In-memory per server instance. Records every AI operation
 * with safe metadata — never stores prompt contents or secrets.
 *
 * Prompt/content logging is OFF by default and must not be enabled without
 * an explicit operator action. This module never stores prompt text.
 */

const MAX_RECORDS = 10_000;
const ledgers = new Map<string, UsageRecord[]>();
function scopedRecords(): UsageRecord[] {
  const key = runtimeNamespace();
  if (!ledgers.has(key)) {
    if (ledgers.size >= 128) ledgers.delete(ledgers.keys().next().value!);
    ledgers.set(key, []);
  }
  return ledgers.get(key)!;
}

let recordCounter = 0;

const count = (value: number | null): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

function recordedCost(entry: Omit<UsageRecord, 'id' | 'timestamp'>): CostEstimate | null {
  const cost = entry.estimatedCost;
  if (!cost) return null;
  const known = cost.basis !== 'UNKNOWN' && count(cost.amount) !== null
    && (cost.basis !== 'ESTIMATED' || (count(entry.inputTokens) !== null && count(entry.outputTokens) !== null));
  return { amount: known ? cost.amount : null, basis: known ? cost.basis : 'UNKNOWN', currency: cost.currency };
}

function usdAmount(record: UsageRecord): number | null {
  return record.estimatedCost?.currency === 'USD' && record.estimatedCost.basis !== 'UNKNOWN'
    ? count(record.estimatedCost.amount) : null;
}

export function recordUsage(
  entry: Omit<UsageRecord, "id" | "timestamp">,
): UsageRecord {
  const records = scopedRecords();
  const record: UsageRecord = {
    id: `usage-${Date.now().toString(36)}-${(recordCounter++).toString(36)}`,
    timestamp: new Date().toISOString(),
    // Explicit projection: extra runtime properties can never retain prompts,
    // raw provider bodies or credential-bearing metadata in the usage ledger.
    providerId: entry.providerId, modelId: entry.modelId, operation: entry.operation,
    taskClass: entry.taskClass, inputTokens: count(entry.inputTokens), outputTokens: count(entry.outputTokens),
    cachedTokens: count(entry.cachedTokens), latencyMs: count(entry.latencyMs), ttftMs: count(entry.ttftMs),
    estimatedCost: recordedCost(entry), success: entry.success, errorCategory: entry.errorCategory,
    fallbackCount: count(entry.fallbackCount) ?? 0,
    profileId: providerRuntimeContext()?.profileIds.get(entry.providerId) ?? null,
  };
  records.unshift(record);
  if (records.length > MAX_RECORDS) {
    records.length = MAX_RECORDS;
  }
  return structuredClone(record);
}

export function getUsageRecords(limit = 100): UsageRecord[] {
  const bounded = Number.isFinite(limit) ? Math.max(0, Math.min(MAX_RECORDS, Math.trunc(limit))) : 100;
  return scopedRecords().slice(0, bounded).map((record) => structuredClone(record));
}

export function getUsageSummary(): UsageSummary {
  const records = scopedRecords();
  const totalRequests = records.length;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const byProvider: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  > = Object.create(null);
  const byModel: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  > = Object.create(null);

  for (const r of records) {
    if (r.inputTokens) totalInputTokens += r.inputTokens;
    if (r.outputTokens) totalOutputTokens += r.outputTokens;

    // A record with no cost, or a cost whose basis is UNKNOWN, contributes
    // nothing to the numeric total. Accumulating it as 0 would make an
    // unpriced provider indistinguishable from a free one, which is exactly
    // the "UNKNOWN COST != ZERO" rule this ledger has to honour.
    const amount = usdAmount(r);

    const pKey = r.providerId;
    if (!byProvider[pKey])
      byProvider[pKey] = { requests: 0, tokens: 0, cost: 0 };
    byProvider[pKey].requests++;
    byProvider[pKey].tokens += (r.inputTokens ?? 0) + (r.outputTokens ?? 0);
    if (amount !== null) {
      byProvider[pKey].cost = (byProvider[pKey].cost ?? 0) + amount;
    }

    const mKey = `${r.providerId}:${r.modelId}`;
    if (!byModel[mKey]) byModel[mKey] = { requests: 0, tokens: 0, cost: 0 };
    byModel[mKey].requests++;
    byModel[mKey].tokens += (r.inputTokens ?? 0) + (r.outputTokens ?? 0);
    if (amount !== null) {
      byModel[mKey].cost = (byModel[mKey].cost ?? 0) + amount;
    }
  }

  // A partial priced sum is not a total bill. Preserve unknown costs at every scope.
  for (const record of records) {
    if (usdAmount(record) === null) {
      byProvider[record.providerId].cost = null;
      byModel[`${record.providerId}:${record.modelId}`].cost = null;
    }
  }
  const knownCosts = records.length > 0 && records.every((record) => usdAmount(record) !== null);
  const mergedCost = {
    amount: knownCosts ? Math.round(records.reduce((total, record) => total + usdAmount(record)!, 0) * 1_000_000) / 1_000_000 : null,
    basis: !knownCosts ? 'UNKNOWN' as const
      : records.every((record) => record.estimatedCost?.basis === 'MEASURED') ? 'MEASURED' as const : 'ESTIMATED' as const,
  };

  return {
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    totalEstimatedCost: mergedCost.amount,
    byProvider,
    byModel,
    costBasis: mergedCost.basis,
  };
}
