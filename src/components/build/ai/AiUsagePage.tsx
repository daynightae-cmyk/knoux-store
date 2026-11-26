"use client";
import { useEffect, useState } from "react";
import { AiCenterPage } from "./AiCenterLayout";
import { DevPanel, DevEmpty } from "../dev/DevUI";
import { readRuntimeJson } from './runtime-response';
import type { UsageRecord, UsageSummary } from '@/lib/ai/types';

export function AiUsagePage() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Polling owns its fetch inside the effect so no state is set synchronously
  // in the effect body, and teardown cancels both the interval and any
  // in-flight write-back.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const res = await fetch("/api/build/ai/usage", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        const data = await readRuntimeJson<{ records: UsageRecord[]; summary: UsageSummary }>(res);
        if (!Array.isArray(data.records) || !data.summary || typeof data.summary.totalRequests !== 'number') throw new Error('The runtime returned no usage snapshot.');
        if (!active) return;
        setRecords(data.records);
        setSummary(data.summary);
        setUpdatedAt(new Date().toISOString());
        setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'The usage ledger could not be read.');
      } finally {
        if (active) {
          setLoading(false);
          timer = setTimeout(() => void load(), 5000);
        }
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  if (loading)
    return (
      <AiCenterPage heading={null}>
        <p className="dev-note">Loading usage…</p>
      </AiCenterPage>
    );

  return (
    <AiCenterPage
      heading={
        <header className="dev-page-heading" style={{ marginBottom: 16 }}>
          <span className="dev-mini-label">AI RUNTIME / USAGE</span>
          <h2>Usage Ledger</h2>
          <p>
            Current server instance · up to 10,000 retained workspace operations.
            Prompt contents and secrets are never stored. This is a runtime ledger, not a provider invoice.
          </p>
          {summary ? (
            <span className="dev-page-heading__detail">
              {summary.totalRequests} requests ·{" "}
              {summary.totalInputTokens.toLocaleString()} known input /{" "}
              {summary.totalOutputTokens.toLocaleString()} known output tokens ·{" "}
              {summary.totalEstimatedCost !== null
                ? `$${summary.totalEstimatedCost.toFixed(6)}`
                : "cost unknown"}{" "}
              ({summary.costBasis})
            </span>
          ) : null}
        </header>
      }
    >
      {error ? <p className="dev-note" role="alert">Usage unavailable: {error}{updatedAt ? ` Showing the last successful snapshot from ${updatedAt}.` : ''}</p> : null}
      {summary && summary.totalRequests > 0 ? (
        <>
          <DevPanel title="By Provider">
            <table className="dev-kv-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Requests</th>
                  <th>Tokens</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byProvider).map(([key, val]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{val.requests}</td>
                    <td>{val.tokens.toLocaleString()}</td>
                    <td>
                      {val.cost !== null ? `$${val.cost.toFixed(6)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DevPanel>

          <div style={{ height: 16 }} />

          <DevPanel title="By Model">
            <table className="dev-kv-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Requests</th>
                  <th>Tokens</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.byModel).map(([key, val]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{val.requests}</td>
                    <td>{val.tokens.toLocaleString()}</td>
                    <td>
                      {val.cost !== null ? `$${val.cost.toFixed(6)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DevPanel>

          <div style={{ height: 16 }} />
        </>
      ) : null}

      <DevPanel title={`Records (${records.length})`}>
        {records.length === 0 ? (
          <DevEmpty
            title={error && !summary ? 'USAGE UNAVAILABLE' : 'NO USAGE RECORDED'}
            body={error && !summary ? 'The ledger could not be read. An unavailable ledger does not establish zero usage or zero cost.' : 'AI operations will appear here once you run generations, streams, or arena comparisons.'}
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dev-kv-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Op</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Latency</th>
                  <th>TTFT</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Fallback</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.timestamp.slice(11, 19)}</td>
                    <td>{r.providerId}</td>
                    <td
                      style={{
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.modelId}
                    </td>
                    <td>{r.operation}</td>
                    <td>{r.inputTokens ?? "—"}</td>
                    <td>{r.outputTokens ?? "—"}</td>
                    <td>{r.latencyMs === null ? '—' : `${r.latencyMs}ms`}</td>
                    <td>{r.ttftMs !== null ? `${r.ttftMs}ms` : "—"}</td>
                    <td>
                      {r.estimatedCost?.amount !== null &&
                      r.estimatedCost?.amount !== undefined
                        ? `${r.estimatedCost.currency} ${r.estimatedCost.amount.toFixed(6)} · ${r.estimatedCost.basis}`
                        : "—"}
                    </td>
                    <td>
                      <span
                        className="dev-tag"
                        data-tone={r.success ? "ok" : "bad"}
                      >
                        {r.success ? "OK" : "FAIL"}
                      </span>
                    </td>
                    <td>{r.fallbackCount > 0 ? `×${r.fallbackCount}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DevPanel>
    </AiCenterPage>
  );
}
