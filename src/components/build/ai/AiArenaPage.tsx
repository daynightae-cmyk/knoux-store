"use client";
import { useEffect, useState } from "react";
import { AiCenterPage } from "./AiCenterLayout";
import { DevPanel, DevEmpty } from "../dev/DevUI";
import type {
  ArenaResult,
  CostEstimate,
  GenerationResponse,
  TokenUsage,
} from "@/lib/ai/types";

type ArenaModel = { providerId: string; modelId: string };

/**
 * The browser projection of an arena row.
 *
 * The canonical `ArenaResult` is a server-only type, so a client component
 * cannot import it directly; this narrows it to the fields the page renders
 * instead of restating the whole shape as a fresh literal.
 */
type ArenaResultView = Omit<ArenaResult, "response"> & {
  response: Pick<
    GenerationResponse,
    "ok" | "text" | "finishReason" | "latencyMs" | "ttftMs"
  > & {
    usage: Pick<TokenUsage, "inputTokens" | "outputTokens"> | null;
    estimatedCost: Pick<CostEstimate, "amount" | "basis"> | null;
    error: { category: string; safeMessage: string } | null;
  };
};

type ProviderModel = {
  providerId: string;
  modelId: string;
  displayName: string;
};

export function AiArenaPage() {
  const [prompt, setPrompt] = useState("");
  const [system, setSystem] = useState("");
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [selected, setSelected] = useState<ArenaModel[]>([]);
  const [results, setResults] = useState<ArenaResultView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/build/ai/models", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const models: ProviderModel[] = [];
        for (const p of data.providers ?? []) {
          for (const m of p.models ?? []) {
            models.push({
              providerId: p.providerId,
              modelId: m.modelId,
              displayName: m.displayName ?? m.modelId,
            });
          }
        }
        setAvailableModels(models);
      })
      .catch(() => {});
  }, []);

  function toggleModel(model: ArenaModel) {
    setSelected((old) => {
      const exists = old.some(
        (m) => m.providerId === model.providerId && m.modelId === model.modelId,
      );
      if (exists)
        return old.filter(
          (m) =>
            !(m.providerId === model.providerId && m.modelId === model.modelId),
        );
      if (old.length >= 4) return old;
      return [...old, model];
    });
  }

  async function run() {
    if (!prompt.trim() || selected.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/build/ai/arena", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          system: system || undefined,
          selections: selected,
        }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arena failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AiCenterPage
      heading={
        <header className="dev-page-heading" style={{ marginBottom: 16 }}>
          <span className="dev-mini-label">AI RUNTIME / ARENA</span>
          <h1>Model Arena</h1>
          <p>
            Run one prompt against 2–4 models in parallel. Compare output,
            latency, cost, and errors. No winner is declared automatically.
            Arena is READ-ONLY — no filesystem, Git, terminal, or deploy tools.
          </p>
        </header>
      }
    >
      <DevPanel title="Prompt">
        <textarea
          className="dev-field"
          style={{
            width: "100%",
            minHeight: 80,
            padding: 12,
            fontFamily: "inherit",
          }}
          placeholder="Enter a prompt to compare across models…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div style={{ height: 8 }} />
        <input
          className="dev-field"
          style={{ width: "100%", padding: 8 }}
          placeholder="Optional system prompt…"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
        />
      </DevPanel>

      <div style={{ height: 16 }} />

      <DevPanel title={`Model Selection (${selected.length}/4)`}>
        {availableModels.length === 0 ? (
          <DevEmpty
            title="NO MODELS AVAILABLE"
            body="Run model discovery on the Models page first."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 8,
            }}
          >
            {availableModels.map((m) => {
              const isSel = selected.some(
                (s) => s.providerId === m.providerId && s.modelId === m.modelId,
              );
              return (
                <button
                  key={`${m.providerId}:${m.modelId}`}
                  type="button"
                  onClick={() =>
                    toggleModel({
                      providerId: m.providerId,
                      modelId: m.modelId,
                    })
                  }
                  style={{
                    padding: 10,
                    border: `1px solid ${isSel ? "var(--dev-ok)" : "var(--dev-line)"}`,
                    borderRadius: 4,
                    background: isSel
                      ? "rgba(var(--dev-ok-rgb, 40, 200, 80), 0.08)"
                      : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--dim)" }}>
                    {m.providerId}
                  </span>
                  <div style={{ fontSize: 13 }}>{m.displayName}</div>
                </button>
              );
            })}
          </div>
        )}
      </DevPanel>

      <div style={{ height: 16 }} />

      <div className="dev-actions">
        <button
          type="button"
          className="bo-action bo-action--primary"
          disabled={!prompt.trim() || selected.length < 2 || loading}
          onClick={() => void run()}
        >
          {loading ? "RUNNING ARENA…" : "RUN ARENA"}
        </button>
      </div>

      {error ? (
        <p
          role="status"
          className="dev-note"
          style={{ color: "var(--dev-bad)", marginTop: 12 }}
        >
          {error}
        </p>
      ) : null}

      {results ? (
        <div style={{ marginTop: 16 }}>
          <DevPanel title="Comparison">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${results.length}, 1fr)`,
                gap: 12,
              }}
            >
              {results.map((r) => (
                <div
                  key={`${r.providerId}:${r.modelId}`}
                  style={{
                    border: "1px solid var(--dev-line)",
                    borderRadius: 4,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      className="dev-tag"
                      data-tone={r.response.ok ? "ok" : "bad"}
                    >
                      {r.response.ok ? "OK" : "FAIL"}
                    </span>
                    <span className="dev-tag">{r.displayName}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--dim)",
                      marginBottom: 6,
                    }}
                  >
                    {r.response.latencyMs}ms
                    {r.response.ttftMs !== null
                      ? ` · TTFT ${r.response.ttftMs}ms`
                      : ""}
                    {r.response.usage
                      ? ` · ${r.response.usage.inputTokens ?? "?"}→${r.response.usage.outputTokens ?? "?"} tok`
                      : ""}
                    {r.response.estimatedCost?.amount
                      ? ` · $${r.response.estimatedCost.amount.toFixed(6)}`
                      : ""}
                  </div>
                  {r.response.ok ? (
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                        fontFamily: "inherit",
                        fontSize: 12,
                        lineHeight: 1.5,
                        maxHeight: 300,
                        overflow: "auto",
                      }}
                    >
                      {r.response.text}
                    </pre>
                  ) : (
                    <p className="dev-note" style={{ color: "var(--dev-bad)" }}>
                      {r.response.error?.category}:{" "}
                      {r.response.error?.safeMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </DevPanel>
        </div>
      ) : null}
    </AiCenterPage>
  );
}
