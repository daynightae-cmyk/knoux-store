"use client";
import { useEffect, useState } from "react";
import { AiCenterPage } from "./AiCenterLayout";
import { DevPanel, DevEmpty } from "../dev/DevUI";

type UsageRecord = {
  id: string;
  timestamp: string;
  providerId: string;
  modelId: string;
  operation: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedTokens: number | null;
  latencyMs: number | null;
  ttftMs: number | null;
  estimatedCost: { amount: number | null; basis: string } | null;
  success: boolean;
  errorCategory: string | null;
  fallbackCount: number;
};

type UsageSummary = {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number | null;
  byProvider: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  >;
  byModel: Record<
    string,
    { requests: number; tokens: number; cost: number | null }
  >;
  costBasis: string;
};

export function AiUsagePage() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Polling owns its fetch inside the effect so no state is set synchronously
  // in the effect body, and teardown cancels both the interval and any
  // in-flight write-back.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/build/ai/usage", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setRecords(data.records ?? []);
        setSummary(data.summary ?? null);
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
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
          <h1>Usage Ledger</h1>
          <p>
            Every AI operation is recorded with safe metadata. Prompt contents
            are never stored. Secrets are never logged.
          </p>
          {summary ? (
            <span className="dev-page-heading__detail">
              {summary.totalRequests} requests ·{" "}
              {summary.totalInputTokens.toLocaleString()} in /{" "}
              {summary.totalOutputTokens.toLocaleString()} out ·{" "}
              {summary.totalEstimatedCost !== null
                ? `$${summary.totalEstimatedCost.toFixed(6)}`
                : "cost unknown"}{" "}
              ({summary.costBasis})
            </span>
          ) : null}
        </header>
      }
    >
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
            title="NO USAGE RECORDED"
            body="AI operations will appear here once you run generations, streams, or arena comparisons."
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
                    <td>{r.latencyMs ?? "—"}ms</td>
                    <td>{r.ttftMs !== null ? `${r.ttftMs}ms` : "—"}</td>
                    <td>
                      {r.estimatedCost?.amount !== null &&
                      r.estimatedCost?.amount !== undefined
                        ? `$${r.estimatedCost.amount.toFixed(6)}`
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
