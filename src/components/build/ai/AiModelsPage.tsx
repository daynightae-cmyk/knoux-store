"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DiscoverySource, NormalizedModel } from "@/lib/ai/types";
import { searchModels } from "@/lib/build/model-search";
import { cueAtmosphere } from "../dev/living-atmosphere";
import { useBuildWorkspace } from "../workspace/KnouxBuildWorkspace";
import { AiCenterNav } from "./AiCenterLayout";
import styles from "./model-discovery.module.css";

type ModelEntry = {
  providerId: string;
  models: NormalizedModel[];
  source: DiscoverySource;
  discoveredAt: string | null;
};

const discoveryDate = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});
const modelNameOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function AiModelsPage() {
  const { state } = useBuildWorkspace();
  const [data, setData] = useState<ModelEntry[]>([]);
  const [pending, setPending] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState("");
  const [provider, setProvider] = useState("");
  const [capability, setCapability] = useState("");
  const [descending, setDescending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = AbortSignal.timeout(30_000);
    const signal = AbortSignal.any([controller.signal, timeout]);

    async function readCatalog() {
      try {
        if (attempt > 0) {
          const refresh = await fetch("/api/build/ai/models/refresh", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
            signal,
          });
          if (!refresh.ok) throw new Error(refresh.status === 401 || refresh.status === 403
            ? "Sign in with Build access to refresh discovery."
            : "Model discovery could not be refreshed.");
        }
        const response = await fetch("/api/build/ai/models", { cache: "no-store", signal });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403
          ? "Sign in with Build access to view the model catalog."
          : "The model catalog could not be loaded.");
        const catalog: { providers: ModelEntry[] } = await response.json();
        if (!Array.isArray(catalog.providers)) throw new Error("The model catalog returned an invalid response.");
        if (!controller.signal.aborted) {
          setData(catalog.providers);
          // A completed discovery is a real event: the sky answers once.
          if (attempt > 0) cueAtmosphere("success");
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(timeout.aborted
            ? "Discovery timed out. Refresh to try again."
            : failure instanceof Error ? failure.message : "The model catalog is unavailable.");
          if (attempt > 0) cueAtmosphere("error");
        }
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }

    void readCatalog();
    return () => controller.abort();
  }, [attempt]);

  function refreshCatalog() {
    cueAtmosphere("confirm");
    setError(undefined);
    setPending(true);
    setAttempt((current) => current + 1);
  }

  const models = data.flatMap((entry) => entry.models.map((model) => ({
    ...model,
    source: model.source === "LIVE" && entry.source === "CACHED_LIVE" ? entry.source : model.source,
    discoveredAt: model.discoveredAt ?? entry.discoveredAt,
  })));
  const providers = [...new Set(data.filter((entry) => entry.models.length).map((entry) => entry.providerId))]
    .sort((a, b) => modelNameOrder.compare(a, b));
  const providerFilter = providers.includes(provider) ? provider : "";
  const filtered = searchModels(models, filter, providerFilter, capability ? capability as keyof NormalizedModel["capabilities"] : undefined)
    .sort((a, b) => (descending ? -1 : 1) * modelNameOrder.compare(a.displayName, b.displayName));
  const liveProviders = data.filter((entry) => entry.source === "LIVE" && entry.models.length).length;
  const cachedProviders = data.filter((entry) => entry.source === "CACHED_LIVE" && entry.models.length).length;

  return (
    <div className={`dev-route ${styles.discovery}`} data-discovering={pending} data-reduced={state.preferences.motion === "reduced" ? "" : undefined}>
      <div className={styles.sky} aria-hidden="true">
        <div className={styles.orbit}><span /><span /><span /><i /><i /><i /></div>
      </div>
      <div className={styles.content}>
        <AiCenterNav />
        <header className={styles.heading}>
          <span>AI RUNTIME / MODELS</span>
          <h1>Model Discovery</h1>
          <p>Search the canonical model catalog and inspect capabilities, context limits, discovery source, and timestamp.</p>
          <p className={styles.metrics} aria-live="polite">
            {pending && !models.length ? "Reading model catalog…" : error && !models.length ? "Catalog unavailable" : `${models.length.toLocaleString()} models · ${liveProviders} live providers${cachedProviders ? ` · ${cachedProviders} cached` : ""}`}
          </p>
        </header>

        <button type="button" className={styles.refresh} onClick={refreshCatalog} disabled={pending}>
          <span aria-hidden="true">⟳</span> {pending ? "Discovering…" : "Refresh discovery"}
        </button>
        {error ? <p className={styles.error} role="status">{error}{models.length ? " Previously loaded results remain visible." : ""}</p> : null}

        <div className={styles.filters}>
          <label><span>Search models</span><input type="search" aria-label="Search canonical models" placeholder="Model, provider or capability…" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
          <label className={styles.facet}><span>Provider</span><select aria-label="Filter models by provider" value={providerFilter} onChange={(event) => setProvider(event.target.value)}>
            <option value="">All providers</option>
            {providers.map((item) => <option key={item} value={item}>{item}</option>)}
          </select></label>
          <label className={styles.facet}><span>Capability</span><select aria-label="Filter models by capability" value={capability} onChange={(event) => setCapability(event.target.value)}>
            <option value="">All capabilities</option>
            <option value="tools">Tools</option>
            <option value="vision">Vision</option>
            <option value="streaming">Streaming</option>
            <option value="reasoning">Reasoning</option>
            <option value="structuredOutput">Structured Output</option>
          </select></label>
        </div>

        <section className={styles.results} aria-labelledby="model-results-heading" aria-busy={pending}>
          <h2 id="model-results-heading"><span aria-hidden="true">✦</span> Model Table ({filtered.length.toLocaleString()})</h2>
          {filtered.length ? (
            <div className={styles.tableFrame} tabIndex={0} role="region" aria-label="Scrollable model table">
              <table>
                <thead><tr>
                  <th scope="col" aria-sort={descending ? "descending" : "ascending"}>
                    <button type="button" onClick={() => setDescending((value) => !value)}>Model name <span aria-hidden="true">{descending ? "▴" : "▾"}</span></button>
                  </th>
                  {["Model ID", "Provider", "Context", "Max output", "Tools", "Vision", "Streaming", "Reasoning", "Lifecycle", "Source", "Discovered (UTC)"].map((label) => <th scope="col" key={label}>{label}</th>)}
                </tr></thead>
                <tbody>{filtered.map((model, index) => (
                  <tr key={`${model.providerId}:${model.modelId}:${index}`}>
                    <th scope="row">{model.displayName}</th>
                    <td className={styles.modelId}>{model.modelId}</td>
                    <td>{model.providerId}</td>
                    <td>{model.contextWindow?.toLocaleString() ?? "—"}</td>
                    <td>{model.maxOutputTokens?.toLocaleString() ?? "—"}</td>
                    <td>{model.capabilities.tools}</td>
                    <td>{model.capabilities.vision}</td>
                    <td>{model.capabilities.streaming}</td>
                    <td>{model.capabilities.reasoning}</td>
                    <td>{model.lifecycle}</td>
                    <td><span className={styles.source} data-source={model.source}>{model.source}</span></td>
                    <td>{model.discoveredAt && Number.isFinite(Date.parse(model.discoveredAt))
                      ? <time dateTime={model.discoveredAt}>{discoveryDate.format(new Date(model.discoveredAt))}</time>
                      : "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>
              <p>{pending ? "Reading model catalog…" : error && !models.length ? "Catalog unavailable" : models.length ? "No models match these filters." : "No models discovered."}</p>
              {!pending && !error && !models.length ? <small>Refresh discovery or <Link href="/build/providers">inspect providers</Link>.</small> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
