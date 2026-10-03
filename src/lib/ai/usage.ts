import "server-only";
import type { UsageRecord, UsageSummary, CostEstimate } from "./types";
import { mergeCostBasis } from "./cost";

/**
 * Usage ledger. In-memory per server instance. Records every AI operation
 * with safe metadata — never stores prompt contents or secrets.
 *
 * Prompt/content logging is OFF by default and must not be enabled without
 * an explicit operator action. This module never stores prompt text.
 */

const MAX_RECORDS = 10_000;
const records: UsageRecord[] = [];

let recordCounter = 0;

export function recordUsage(
  entry: Omit<UsageRecord, "id" | "timestamp">,
): UsageRecord {
  const record: UsageRecord = {
    id: `usage-${Date.now().toString(36)}-${(recordCounter++).toString(36)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  records.unshift(record);
  if (records.length > MAX_RECORDS) {
    records.length = MAX_RECORDS;
  }
  return record;
}

export function getUsageRecords(limit = 100): UsageRecord[] {
  return records.slice(0, limit);
}

export function getUsageSummary(): UsageSummary {
  const totalRequests = records.length;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const allCosts: CostEstimate[] = [];

  const byProvider: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  > = {};
  const byModel: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  > = {};

  for (const r of records) {
    if (r.inputTokens) totalInputTokens += r.inputTokens;
    if (r.outputTokens) totalOutputTokens += r.outputTokens;
    if (r.estimatedCost) allCosts.push(r.estimatedCost);

    // A record with no cost, or a cost whose basis is UNKNOWN, contributes
    // nothing to the numeric total. Accumulating it as 0 would make an
    // unpriced provider indistinguishable from a free one, which is exactly
    // the "UNKNOWN COST != ZERO" rule this ledger has to honour.
    const amount = r.estimatedCost?.amount ?? null;

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

  const mergedCost = mergeCostBasis(...allCosts);

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
