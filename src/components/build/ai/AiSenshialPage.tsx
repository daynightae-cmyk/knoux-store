"use client";
import { useRef, useState } from "react";
import { AiCenterPage } from "./AiCenterLayout";
import { DevPanel } from "../dev/DevUI";

type SenshialResponse = {
  ok: boolean;
  mode: "ask" | "plan" | "execute";
  text: string;
  providerId: string | null;
  modelId: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    source: string;
  } | null;
  latencyMs: number | null;
  estimatedCost: { amount: number | null; basis: string } | null;
  error: { category: string; safeMessage: string } | null;
  blocked: boolean;
  blocker: string | null;
};

const MODES = [
  {
    id: "ask" as const,
    label: "ASK",
    desc: "READ-ONLY · Real inference · Answer questions and summarize context",
  },
  {
    id: "plan" as const,
    label: "PLAN",
    desc: "READ-ONLY · Real inference · Produce structured engineering plans",
  },
  {
    id: "execute" as const,
    label: "EXECUTE",
    desc: "BLOCKED · Agent write runtime not yet security-verified",
  },
];

export function AiSenshialPage() {
  const [mode, setMode] = useState<"ask" | "plan" | "execute">("ask");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<SenshialResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    if (mode === "execute") {
      setResponse({
        ok: false,
        mode: "execute",
        text: "",
        providerId: null,
        modelId: null,
        usage: null,
        latencyMs: null,
        estimatedCost: null,
        error: null,
        blocked: true,
        blocker:
          "EXECUTE BLOCKED — Agent write runtime is not yet security-verified. No file mutations, commands, or deployments are performed.",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/build/ai/senshial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, prompt }),
      });
      const data: SenshialResponse = await res.json();
      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function runStream() {
    if (!prompt.trim() || streaming || mode === "execute") return;
    setStreaming(true);
    setStreamText("");
    setError(null);
    setResponse(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/build/ai/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: response?.providerId ?? "openai",
          modelId: response?.modelId ?? "gpt-4.1-mini",
          messages: [{ role: "user", content: prompt }],
          system:
            mode === "ask"
              ? "You are KNOuX Senshial in ASK mode. READ-ONLY. Answer questions and summarize context."
              : "You are KNOuX Senshial in PLAN mode. READ-ONLY. Produce structured engineering plans.",
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        setError("Stream failed to start");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const chunk = JSON.parse(trimmed.slice(6));
            if (chunk.delta) setStreamText((prev) => prev + chunk.delta);
            if (chunk.done) break;
          } catch {
            /* skip */
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // Cancelled by user
      } else {
        setError(e instanceof Error ? e.message : "Stream failed");
      }
    } finally {
      setStreaming(false);
    }
  }

  function cancelStream() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  return (
    <AiCenterPage
      heading={
        <header className="dev-page-heading" style={{ marginBottom: 16 }}>
          <span className="dev-mini-label">AI RUNTIME / SENSHIAL</span>
          <h1>Senshial — Real Inference</h1>
          <p>
            ASK and PLAN use real AI inference. EXECUTE is blocked until the
            agent write runtime is security-verified.
          </p>
        </header>
      }
    >
      <DevPanel title="Mode">
        <div className="dev-tabs" role="tablist" aria-label="Senshial mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              className={`dev-tab ${mode === m.id ? "dev-tab--active" : ""}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="dev-note" style={{ marginTop: 8 }}>
          {MODES.find((m) => m.id === mode)?.desc}
        </p>
      </DevPanel>

      <div style={{ height: 16 }} />

      <DevPanel title="Request">
        <textarea
          className="dev-field"
          style={{
            width: "100%",
            minHeight: 100,
            padding: 12,
            fontFamily: "inherit",
          }}
          placeholder="Describe what you want to understand about this project."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-label="Senshial request"
        />
        <div className="dev-actions" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="bo-action bo-action--primary"
            disabled={!prompt.trim() || loading || mode === "execute"}
            onClick={() => void run()}
          >
            {loading ? "RUNNING…" : `RUN ${mode.toUpperCase()}`}
          </button>
          {mode !== "execute" && (
            <button
              type="button"
              disabled={!prompt.trim() || streaming}
              onClick={() => void runStream()}
            >
              {streaming ? "STREAMING…" : "STREAM"}
            </button>
          )}
          {streaming && (
            <button type="button" onClick={cancelStream}>
              CANCEL
            </button>
          )}
        </div>
      </DevPanel>

      <div style={{ height: 16 }} />

      {error ? (
        <p
          role="status"
          className="dev-note"
          style={{ color: "var(--dev-bad)" }}
        >
          {error}
        </p>
      ) : null}

      {streaming || streamText ? (
        <DevPanel title="Stream Output">
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {streamText}
            {streaming ? <span className="dev-blink">▋</span> : null}
          </pre>
        </DevPanel>
      ) : null}

      {response ? (
        <DevPanel title="Response">
          {response.blocked ? (
            <div
              style={{
                padding: 16,
                border: "1px solid var(--dev-bad)",
                borderRadius: 4,
              }}
            >
              <strong style={{ color: "var(--dev-bad)" }}>
                EXECUTE BLOCKED
              </strong>
              <p className="dev-note" style={{ marginTop: 8 }}>
                {response.blocker}
              </p>
            </div>
          ) : response.ok ? (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <span className="dev-tag" data-tone="ok">
                  {response.mode.toUpperCase()}
                </span>
                <span className="dev-tag">{response.providerId ?? "—"}</span>
                <span className="dev-tag">{response.modelId ?? "—"}</span>
                {response.latencyMs !== null ? (
                  <span className="dev-tag">{response.latencyMs}ms</span>
                ) : null}
                {response.usage ? (
                  <span className="dev-tag">
                    {response.usage.inputTokens ?? "?"} in /{" "}
                    {response.usage.outputTokens ?? "?"} out
                  </span>
                ) : null}
                {response.estimatedCost?.amount !== null &&
                response.estimatedCost?.amount !== undefined ? (
                  <span className="dev-tag">
                    ${response.estimatedCost.amount.toFixed(6)}
                  </span>
                ) : null}
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  fontFamily: "inherit",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                {response.text}
              </pre>
            </>
          ) : (
            <div
              style={{
                padding: 16,
                border: "1px solid var(--dev-bad)",
                borderRadius: 4,
              }}
            >
              <strong style={{ color: "var(--dev-bad)" }}>
                {response.error?.category ?? "FAILED"}
              </strong>
              <p className="dev-note" style={{ marginTop: 8 }}>
                {response.error?.safeMessage ??
                  response.blocker ??
                  "Generation failed."}
              </p>
              {response.providerId ? (
                <p className="dev-note">
                  Provider: {response.providerId} / {response.modelId}
                </p>
              ) : null}
            </div>
          )}
        </DevPanel>
      ) : null}
    </AiCenterPage>
  );
}
