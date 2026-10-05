import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ONLINE_WINDOW_MS = 90_000;
const JOB_TIMEOUT_MS = 25_000;
const POLL_INTERVAL_MS = 500;

const TOOL_SPECS: Record<string, { scopes: string[] }> = {
  "bridge.handshake": { scopes: ["terminal:open"] },
  "git.status": { scopes: ["git:read"] },
  "metrics.read": { scopes: ["metrics:read"] },
  "proc.list": { scopes: ["proc:list"] },
  "logs.read": { scopes: ["logs:read"] },
  "fs.list": { scopes: ["fs:read"] },
  "fs.read": { scopes: ["fs:read"] },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getSecretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (typeof parsed.default === "string" && parsed.default) return parsed.default;
      const first = Object.values(parsed).find((value) => typeof value === "string" && value);
      if (first) return first;
    } catch {
      // Fall through to the legacy server key.
    }
  }

  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Supabase server secret is unavailable.");
  return legacy;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
if (!supabaseUrl) throw new Error("SUPABASE_URL is unavailable.");

const admin = createClient(supabaseUrl, getSecretKey(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

type GatewayAccess = {
  id: string;
  bridge_id: string;
  expires_at: string | null;
};

async function authenticateGateway(request: Request): Promise<GatewayAccess | null> {
  const token = request.headers.get("x-knoux-gateway-token")?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{40,256}$/.test(token)) return null;

  const tokenHash = await sha256Hex(token);
  const { data, error } = await admin
    .from("knoux_bridge_gateway_tokens")
    .select("id,bridge_id,expires_at,active")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return null;
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return null;

  await admin
    .from("knoux_bridge_gateway_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    id: data.id,
    bridge_id: data.bridge_id,
    expires_at: data.expires_at,
  };
}

async function getMachine(bridgeId: string) {
  const { data, error } = await admin
    .from("knoux_bridge_machines")
    .select(
      "id,owner_id,bridge_id,hostname,platform,arch,bridge_version,capabilities,status,last_seen_at,registered_at",
    )
    .eq("bridge_id", bridgeId)
    .maybeSingle();

  if (error) throw new Error("Machine lookup failed.");
  return data;
}

function machineState(machine: Record<string, unknown> | null) {
  if (!machine) {
    return { online: false, ageMs: null as number | null };
  }

  const status = String(machine.status ?? "");
  const lastSeenAt = String(machine.last_seen_at ?? "");
  const measured = Date.parse(lastSeenAt);

  if (status === "revoked" || !Number.isFinite(measured)) {
    return { online: false, ageMs: null as number | null };
  }

  const ageMs = Math.max(0, Date.now() - measured);
  return {
    online: ageMs <= ONLINE_WINDOW_MS,
    ageMs,
  };
}

function validateArgs(
  tool: string,
  raw: unknown,
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  const args =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  switch (tool) {
    case "bridge.handshake":
    case "git.status":
    case "metrics.read":
    case "proc.list":
      return Object.keys(args).length === 0
        ? { ok: true, args: {} }
        : { ok: false, error: tool + " does not accept arguments." };

    case "logs.read": {
      const name = typeof args.name === "string" ? args.name.trim() : "";
      if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) {
        return { ok: false, error: "logs.read requires a valid supervised process name." };
      }
      const since = Number.isInteger(args.since) && Number(args.since) >= 0
        ? Number(args.since)
        : 0;
      const limit = Number.isInteger(args.limit)
        ? Math.max(1, Math.min(500, Number(args.limit)))
        : 200;
      return { ok: true, args: { name, since, limit } };
    }

    case "fs.list":
    case "fs.read": {
      const path = typeof args.path === "string" ? args.path.trim() : "";
      if (!path || path.length > 4096 || path.includes("\0")) {
        return { ok: false, error: tool + " requires a valid path." };
      }
      return { ok: true, args: { path } };
    }

    default:
      return { ok: false, error: "Tool is not allowlisted." };
  }
}

async function gatewayStatus(access: GatewayAccess): Promise<Response> {
  const machine = await getMachine(access.bridge_id);
  const state = machineState(machine);

  return json({
    ok: true,
    service: "knoux-bridge-gateway-api",
    product: "KNOuX Store",
    mode: "OUTBOUND_CONTROL_PLANE",
    local_machine_connected: state.online,
    machine: machine
      ? {
          bridge_id: machine.bridge_id,
          hostname: machine.hostname,
          platform: machine.platform,
          arch: machine.arch,
          version: machine.bridge_version,
          status: machine.status === "revoked"
            ? "revoked"
            : state.online
              ? "online"
              : "offline",
          last_seen_at: machine.last_seen_at,
          last_seen_age_ms: state.ageMs,
          registered_at: machine.registered_at,
          capabilities: machine.capabilities ?? {},
        }
      : null,
    measured_at: new Date().toISOString(),
  });
}

async function gatewayTool(
  access: GatewayAccess,
  body: Record<string, unknown>,
): Promise<Response> {
  const tool = typeof body.tool === "string" ? body.tool.trim() : "";
  const spec = TOOL_SPECS[tool];
  if (!spec) return json({ ok: false, error: "tool-not-allowlisted" }, 400);

  const validated = validateArgs(tool, body.args);
  if (!validated.ok) {
    return json({ ok: false, error: "invalid-tool-args", message: validated.error }, 400);
  }

  const machine = await getMachine(access.bridge_id);
  if (!machine) return json({ ok: false, error: "machine-not-found" }, 404);

  const state = machineState(machine);
  if (!state.online) {
    return json({ ok: false, error: "machine-offline" }, 409);
  }

  const { data: job, error: insertError } = await admin
    .from("knoux_bridge_jobs")
    .insert({
      owner_id: machine.owner_id,
      machine_id: machine.id,
      tool,
      args: validated.args,
      required_scopes: spec.scopes,
      mutating: false,
      idempotency_key: "gateway-" + crypto.randomUUID(),
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    })
    .select("id,status,created_at,expires_at")
    .single();

  if (insertError || !job) {
    return json({ ok: false, error: "job-create-failed" }, 503);
  }

  const deadline = Date.now() + JOB_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const { data: current, error: readError } = await admin
      .from("knoux_bridge_jobs")
      .select("id,status,result,error,duration_ms,claimed_at,completed_at")
      .eq("id", job.id)
      .maybeSingle();

    if (readError) {
      return json({ ok: false, error: "job-read-failed", job_id: job.id }, 503);
    }

    if (current) {
      if (current.status === "succeeded") {
        return json({
          ok: true,
          job_id: job.id,
          tool,
          result: current.result,
          duration_ms: current.duration_ms,
          claimed_at: current.claimed_at,
          completed_at: current.completed_at,
        });
      }

      if (["failed", "cancelled", "expired"].includes(current.status)) {
        return json({
          ok: false,
          job_id: job.id,
          tool,
          status: current.status,
          error: current.error ?? "The local job did not succeed.",
          duration_ms: current.duration_ms,
          completed_at: current.completed_at,
        }, 502);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return json({
    ok: false,
    error: "job-timeout",
    job_id: job.id,
    tool,
  }, 504);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method-not-allowed" }, 405);
  }

  const access = await authenticateGateway(request);
  if (!access) {
    return json({ ok: false, error: "gateway-unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body =
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
  } catch {
    return json({ ok: false, error: "invalid-json" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "status") return await gatewayStatus(access);
    if (action === "tool") return await gatewayTool(access, body);
    return json({ ok: false, error: "unknown-action" }, 400);
  } catch {
    return json({ ok: false, error: "gateway-internal-error" }, 500);
  }
});