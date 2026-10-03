import { NextResponse, type NextRequest } from "next/server";
import { guardBuildApi } from "@/lib/build/api-guard";
import { runSenshial } from "@/lib/ai/senshial";
import {
  buildContextBundle,
  formatContextForPrompt,
} from "@/lib/ai/context-manager";
import { estimateTokens } from "@/lib/ai/contract";
import type { SenshialRequest } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

/** POST /api/build/ai/senshial — real ASK/PLAN inference. EXECUTE is blocked. */
export async function POST(request: NextRequest) {
  const denied = await guardBuildApi(request, { scope: "ai-senshial" });
  if (denied) return denied;

  let body: SenshialRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Expected Senshial request." },
      { status: 400 },
    );
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      { message: "Prompt is required." },
      { status: 400 },
    );
  }

  if (body.mode !== "ask" && body.mode !== "plan" && body.mode !== "execute") {
    return NextResponse.json(
      { message: "Mode must be ask, plan, or execute." },
      { status: 400 },
    );
  }

  // Context content arrives from the browser, so the prompt context is rebuilt
  // server-side through the context manager rather than trusted as sent. That
  // applies the exclusion list (no .env, key or credential file can be smuggled
  // in under a different label) and the size ceilings, so one call cannot pull
  // an unbounded amount of text into a paid prompt.
  const supplied = new Map<string, string>();
  const selections = [];
  for (const entry of body.context ?? []) {
    if (typeof entry.content !== "string") continue;
    const key = entry.path ?? `pasted:${entry.label}`;
    supplied.set(key, entry.content);
    selections.push({ type: entry.type, label: entry.label, path: entry.path });
  }

  const bundle = buildContextBundle(selections, supplied);
  const formatted = formatContextForPrompt(bundle);

  const response = await runSenshial(
    {
      ...body,
      context: formatted
        ? [
            {
              type: "pasted",
              label: "Selected Context",
              path: null,
              content: formatted,
              tokenEstimate: estimateTokens(formatted),
            },
          ]
        : [],
    },
    process.env,
  );

  const status = response.blocked ? 403 : response.ok ? 200 : 502;
  return NextResponse.json(response, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
