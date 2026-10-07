"use client";
import { useCallback, useEffect, useState } from "react";
import { AiCenterPage } from "./AiCenterLayout";
import { DevPanel, DevEmpty } from "../dev/DevUI";
import type { ProviderHealth } from "@/lib/ai/types";

type ProbeResult = {
  providerId: string;
  authenticated: boolean;
  detail: string;
  latencyMs: number;
};

export function AiProvidersPage({ embedded = false }: Readonly<{ embedded?: boolean }> = {}) {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, ProbeResult>>({});
  const [discovery, setDiscovery] = useState<
    Record<string, { source: string; count: number; error: string | null }>
  >({});
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/build/ai/providers", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load provider health");
      const data = await res.json();
      setProviders(data.providers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // The initial load owns its fetch inside the effect so no state is set
  // synchronously in the effect body, and unmount cancels the write-back.
  // Later refreshes (post-probe, post-discovery) reuse fetchProviders.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/build/ai/providers", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load provider health");
        const data = await res.json();
        if (active) setProviders(data.providers ?? []);
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

  async function probeProvider(providerId: string) {
    setBusy(providerId);
    try {
      const res = await fetch("/api/build/ai/providers/probe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      const result: ProbeResult = await res.json();
      if (!res.ok) throw new Error('Provider probe was refused by the server.');
      setProbes((old) => ({ ...old, [providerId]: result }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Probe failed");
    } finally {
      setBusy(null);
      void fetchProviders();
    }
  }

  async function refreshModels(providerId?: string) {
    const key = providerId ?? "__all__";
    setBusy(key);
    try {
      const res = await fetch("/api/build/ai/models/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(providerId ? { provider: providerId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Model discovery was refused by the server.');
      if (providerId) {
        const result = data.providers?.[0];
        if (result) {
          setDiscovery((old) => ({
            ...old,
            [providerId]: {
              source: result.source,
              count: result.models?.length ?? 0,
              error: result.error?.safeMessage ?? null,
            },
          }));
        }
      } else {
        const map: Record<
          string,
          { source: string; count: number; error: string | null }
        > = {};
        for (const r of data.providers ?? []) {
          map[r.providerId] = {
            source: r.source,
            count: r.models?.length ?? 0,
            error: r.error?.safeMessage ?? null,
          };
        }
        setDiscovery(map);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setBusy(null);
      void fetchProviders();
    }
  }

  function authLabel(h: ProviderHealth): string {
    if (!h.configured) return "UNCONFIGURED";
    if (probes[h.providerId])
      return probes[h.providerId].authenticated ? "PASS" : "FAIL";
    return h.auth === "CONFIGURED_UNTESTED"
      ? "UNTESTED"
      : h.auth.replace(/_/g, " ");
  }

  function discoveryLabel(h: ProviderHealth): string {
    if (!h.configured) return "UNCONFIGURED";
    if (discovery[h.providerId])
      return discovery[h.providerId].source === "LIVE" ? "PASS" : "FAIL";
    return h.discovery === "CONFIGURED_UNTESTED"
      ? "UNTESTED"
      : h.discovery.replace(/_/g, " ");
  }

  if (loading)
    return (
      <AiCenterPage embedded={embedded} heading={null}>
        <p className="dev-note">Loading provider health…</p>
      </AiCenterPage>
    );

  return (
    <AiCenterPage embedded={embedded}
      heading={
        <header className="dev-page-heading" style={{ marginBottom: 16 }}>
          <span className="dev-mini-label">AI RUNTIME / PROVIDERS</span>
          <h2>Provider Registry</h2>
          <p>
            13 adapters. Each capability state is independently measured.
            Credential presence does not mean provider health.
          </p>
          <span className="dev-page-heading__detail">
            {providers.filter((p) => p.configured).length} configured ·{" "}
            {providers.length} total
          </span>
        </header>
      }
    >
      <div className="dev-actions" style={{ marginBottom: 16 }}>
        <button
          type="button"
          disabled={busy !== null || !providers.some(provider => provider.configured)}
          onClick={() => void refreshModels()}
        >
          REFRESH ALL MODELS
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

      <DevPanel title="Provider Matrix">
        <div className="dev-integration-ledger">
          {providers.length ? (
            providers.map((provider) => (
              <article key={provider.providerId}>
                <div>
                  <h2>{provider.displayName}</h2>
                  <span
                    className="dev-tag"
                    data-tone="none"
                    style={{ marginLeft: 8 }}
                  >
                    {provider.transport}
                  </span>
                  <span
                    className={`dev-tag ${provider.configured ? "" : "warn"}`}
                    style={{ marginLeft: 4 }}
                  >
                    {provider.configured ? "CONFIGURED" : "UNCONFIGURED"}
                  </span>
                </div>

                <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table
                  className="dev-kv-table"
                  style={{ marginTop: 10, width: "100%" }}
                >
                  <thead>
                    <tr>
                      <th scope="col">Auth</th>
                      <th scope="col">Discovery</th>
                      <th scope="col">Generation</th>
                      <th scope="col">Streaming</th>
                      <th scope="col">Tools</th>
                      <th scope="col">Vision</th>
                      <th scope="col">Structured</th>
                      <th scope="col">Models</th>
                      <th scope="col">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <CellState
                          label={authLabel(provider)}
                          ok={probes[provider.providerId]?.authenticated}
                        />
                      </td>
                      <td>
                        <CellState
                          label={discoveryLabel(provider)}
                          ok={discovery[provider.providerId]?.source === "LIVE"}
                        />
                      </td>
                      <td>
                        <CellState
                          label={
                            provider.generation === "CONFIGURED_UNTESTED"
                              ? "UNTESTED"
                              : provider.generation.replace(/_/g, " ")
                          }
                        />
                      </td>
                      <td>
                        <CellState
                          label={
                            provider.streaming === "CONFIGURED_UNTESTED"
                              ? "UNTESTED"
                              : provider.streaming.replace(/_/g, " ")
                          }
                        />
                      </td>
                      <td>{provider.tools}</td>
                      <td>{provider.vision}</td>
                      <td>{provider.structuredOutput}</td>
                      <td>
                        {provider.modelCount ||
                          (discovery[provider.providerId]?.count ?? 0)}
                      </td>
                      <td>
                        {provider.latencyMs !== null
                          ? `${provider.latencyMs}ms`
                          : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>

                {provider.lastError ? (
                  <p
                    className="dev-note"
                    style={{ color: "var(--dev-bad)", marginTop: 6 }}
                  >
                    Last error: {provider.lastError.category} —{" "}
                    {provider.lastError.safeMessage}
                  </p>
                ) : null}

                {probes[provider.providerId] ? (
                  <p className="dev-note" style={{ marginTop: 6 }}>
                    Probe: {probes[provider.providerId].detail} (
                    {probes[provider.providerId].latencyMs}ms)
                  </p>
                ) : null}

                <div className="dev-actions" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    disabled={
                      !provider.configured || busy === provider.providerId
                    }
                    onClick={() => void probeProvider(provider.providerId)}
                  >
                    {busy === provider.providerId ? "TESTING…" : "TEST AUTH"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      !provider.configured || busy === provider.providerId
                    }
                    onClick={() => void refreshModels(provider.providerId)}
                  >
                    {busy === provider.providerId
                      ? "REFRESHING…"
                      : "REFRESH MODELS"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <DevEmpty
              title="NO PROVIDERS"
              body="No provider adapters are registered."
            />
          )}
        </div>
      </DevPanel>
    </AiCenterPage>
  );
}

function CellState({ label, ok }: { label: string; ok?: boolean }) {
  const tone =
    ok === true
      ? "ok"
      : ok === false
        ? "bad"
        : label === "UNTESTED" || label === "UNCONFIGURED"
          ? "warn"
          : "none";
  return (
    <span className={`dev-tag`} data-tone={tone === "none" ? undefined : tone}>
      {label}
    </span>
  );
}
