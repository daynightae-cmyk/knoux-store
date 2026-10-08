"use client";
import { useCallback, useEffect, useState } from "react";
import { AiCenterPage } from "./AiCenterLayout";
import { DevPanel, DevEmpty } from "../dev/DevUI";
import { searchModels } from "@/lib/build/model-search";
import type { NormalizedModel, DiscoverySource } from "@/lib/ai/types";

type ModelEntry = {
  providerId: string;
  models: NormalizedModel[];
  source: DiscoverySource | "UNKNOWN";
  discoveredAt: string | null;
  fromCache: boolean;
};

export function AiModelsPage() {
  const [data, setData] = useState<ModelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [capFilter, setCapFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/build/ai/models", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load models");
      const json = await res.json();
      setData(json.providers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // The initial load owns its own fetch inside the effect so no state is set
  // synchronously in the effect body, and so an in-flight response from an
  // unmounted tree can never write state. The manual refresh path reuses
  // fetchModels above.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/build/ai/models", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load models");
        const json = await res.json();
        if (active) setData(json.providers ?? []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function refreshAll() {
    setBusy(true);
    try {
      await fetch("/api/build/ai/models/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      await fetchModels();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  const allModels = data.flatMap((d) =>
    d.models.map((m) => ({
      ...m,
      _source: d.source,
      _discoveredAt: d.discoveredAt,
    })),
  );

  const filtered = searchModels(allModels, filter, providerFilter, capFilter ? capFilter as keyof NormalizedModel['capabilities'] : undefined);

  const providers = [...new Set(data.map((d) => d.providerId))];

  if (loading)
    return (
      <AiCenterPage heading={null}>
        <p className="dev-note">Loading models…</p>
      </AiCenterPage>
    );

  return (
    <AiCenterPage
      heading={
        <header className="dev-page-heading" style={{ marginBottom: 16 }}>
          <span className="dev-mini-label">AI RUNTIME / MODELS</span>
          <h2>Model Discovery</h2>
          <p>
            Live model enumeration with static fallback. Discovery source and
            timestamp shown for each model. Stale cached data is never displayed
            as LIVE.
          </p>
          <span className="dev-page-heading__detail">
            {allModels.length} models ·{" "}
            {
              data.filter(
                (d) => d.source === "LIVE" || d.source === "CACHED_LIVE",
              ).length
            }{" "}
            live providers
          </span>
        </header>
      }
    >
      <div className="dev-actions" style={{ marginBottom: 12 }}>
        <button type="button" disabled={busy} onClick={() => void refreshAll()}>
          {busy ? "REFRESHING…" : "REFRESH DISCOVERY"}
        </button>
      </div>

      {error ? (
        <p
          role="status"
          className="dev-note"
          style={{ color: "var(--dev-bad)" }}
        >
          {error}
        </p>
      ) : null}

      <div
        style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}
      >
        <input
          className="dev-field"
          style={{ flex: 1, minWidth: 200 }}
          aria-label="Search canonical models"
          placeholder="Model, provider or capability…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="dev-field"
          aria-label="Filter models by provider"
        >
          <option value="">All providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={capFilter}
          onChange={(e) => setCapFilter(e.target.value)}
          className="dev-field"
          aria-label="Filter models by capability"
        >
          <option value="">All capabilities</option>
          <option value="tools">Tools</option>
          <option value="vision">Vision</option>
          <option value="streaming">Streaming</option>
          <option value="reasoning">Reasoning</option>
          <option value="structuredOutput">Structured Output</option>
        </select>
      </div>

      <DevPanel title={`Model Table (${filtered.length})`}>
        {filtered.length === 0 ? (
          <DevEmpty
            title="NO MODELS DISCOVERED"
            body="Run model discovery to populate the table. Only configured providers will be queried."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dev-kv-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th scope="col">Model ID</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Display</th>
                  <th scope="col">Context</th>
                  <th scope="col">Max Output</th>
                  <th scope="col">Tools</th>
                  <th scope="col">Vision</th>
                  <th scope="col">Streaming</th>
                  <th scope="col">Reasoning</th>
                  <th scope="col">Lifecycle</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={`${m.providerId}:${m.modelId}:${i}`}>
                    <td>{m.modelId}</td>
                    <td>{m.providerId}</td>
                    <td>{m.displayName}</td>
                    <td>
                      {m.contextWindow ? m.contextWindow.toLocaleString() : "—"}
                    </td>
                    <td>
                      {m.maxOutputTokens
                        ? m.maxOutputTokens.toLocaleString()
                        : "—"}
                    </td>
                    <td>{m.capabilities.tools}</td>
                    <td>{m.capabilities.vision}</td>
                    <td>{m.capabilities.streaming}</td>
                    <td>{m.capabilities.reasoning}</td>
                    <td>{m.lifecycle}</td>
                    <td>
                      <span
                        className="dev-tag"
                        data-tone={
                          m._source === "LIVE"
                            ? "ok"
                            : m._source === "CACHED_LIVE"
                              ? "warn"
                              : "none"
                        }
                      >
                        {m._source}
                      </span>
                    </td>
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
