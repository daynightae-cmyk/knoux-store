import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as ed from "npm:@noble/ed25519@2.3.0";

const te = new TextEncoder();
const SESSION_TTL_MS = 12 * 60 * 60_000;
const ONLINE_WINDOW_MS = 90_000;
const MAX_CLOCK_SKEW_MS = 2 * 60_000;
const MAX_JOB_WAIT_MS = 25_000;
const TOOL_SCOPES: Record<string, string[]> = {
  "bridge.handshake": ["terminal:open"],
  "git.status": ["git:read"],
  "metrics.read": ["metrics:read"],
  "proc.list": ["proc:list"],
  "logs.read": ["logs:read"],
  "fs.list": ["fs:read"],
  "fs.read": ["fs:read"],
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

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function base64ToBytes(value: string): Uint8Array {
  const bin = atob(value.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(te.encode(value));
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return base64ToBytes(normalized + padding);
}

async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const input = typeof value === "string" ? te.encode(value) : value;
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", input)));
}

function pemToSpki(pem: string): Uint8Array | null {
  try {
    const body = pem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s+/g, "");
    const der = base64ToBytes(body);
    const prefix = "302a300506032b6570032100";
    if (der.length !== 44 || bytesToHex(der.slice(0, 12)) !== prefix) return null;
    return der;
  } catch {
    return null;
  }
}

function rawEd25519PublicKey(pem: string): Uint8Array | null {
  const spki = pemToSpki(pem);
  return spki ? spki.slice(spki.length - 32) : null;
}

function spkiPem(rawPublicKey: Uint8Array): string {
  const prefix = hexToBytes("302a300506032b6570032100");
  const der = new Uint8Array(prefix.length + rawPublicKey.length);
  der.set(prefix, 0);
  der.set(rawPublicKey, prefix.length);
  const b64 = bytesToBase64(der);
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return "-----BEGIN PUBLIC KEY-----\n" + lines.join("\n") + "\n-----END PUBLIC KEY-----\n";
}

function randomToken(bytes = 32): string {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  return bytesToBase64Url(raw);
}

function serviceKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      if (typeof parsed?.default === "string" && parsed.default) return parsed.default;
    } catch {}
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Supabase server key unavailable");
  return legacy;
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL unavailable");
  return createClient(url, serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

type Signer = {
  seed: Uint8Array;
  publicKey: Uint8Array;
  publicKeyPem: string;
  fingerprint: string;
};

let signerCache: Signer | null = null;

async function loadSigner(admin: ReturnType<typeof adminClient>): Promise<Signer> {
  if (signerCache) return signerCache;
  const { data, error } = await admin.rpc("knoux_bridge_runtime_secret", {
    p_name: "knoux_bridge_signing_seed",
  });
  if (error || typeof data !== "string") throw new Error("Bridge signer unavailable");
  const seed = base64ToBytes(data);
  if (seed.length !== 32) throw new Error("Bridge signer seed invalid");
  const publicKey = await ed.getPublicKeyAsync(seed);
  const pem = spkiPem(publicKey);
  const spki = pemToSpki(pem);
  if (!spki) throw new Error("Bridge signer public key invalid");
  signerCache = {
    seed,
    publicKey,
    publicKeyPem: pem,
    fingerprint: await sha256Hex(spki),
  };
  return signerCache;
}

async function verifyRegistrationEnvelope(value: unknown): Promise<
  { ok: true; payload: Record<string, unknown> } | { ok: false; error: string }
> {
  if (!value || typeof value !== "object") return { ok: false, error: "invalid-envelope" };
  const env = value as Record<string, unknown>;
  if (typeof env.payload !== "string" || typeof env.signature !== "string") {
    return { ok: false, error: "invalid-envelope" };
  }
  if (env.payload.length > 64_000 || env.signature.length > 1_000) {
    return { ok: false, error: "invalid-envelope" };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(env.payload);
  } catch {
    return { ok: false, error: "invalid-payload" };
  }

  const fields = ["bridgeId", "fingerprint", "publicKey", "nonce", "timestamp", "hostname", "platform", "arch", "version"];
  for (const field of fields) {
    if (typeof payload[field] !== "string") return { ok: false, error: "invalid-payload" };
  }
  if (!payload.capabilities || typeof payload.capabilities !== "object" || Array.isArray(payload.capabilities)) {
    return { ok: false, error: "invalid-payload" };
  }

  const bridgeId = payload.bridgeId as string;
  const fingerprint = payload.fingerprint as string;
  const nonce = payload.nonce as string;
  const publicKey = payload.publicKey as string;
  const timestamp = payload.timestamp as string;

  if (!/^[0-9a-f]{64}$/.test(fingerprint)) return { ok: false, error: "invalid-fingerprint" };
  if (bridgeId !== fingerprint.slice(0, 16)) return { ok: false, error: "bridge-id-mismatch" };
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) return { ok: false, error: "invalid-nonce" };

  const measuredAt = Date.parse(timestamp);
  if (!Number.isFinite(measuredAt) || Math.abs(Date.now() - measuredAt) > MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: "stale-registration" };
  }

  const rawPublic = rawEd25519PublicKey(publicKey);
  if (!rawPublic || await sha256Hex(rawPublic) !== fingerprint) {
    return { ok: false, error: "public-key-mismatch" };
  }

  try {
    const valid = await ed.verifyAsync(
      base64UrlToBytes(env.signature),
      te.encode(env.payload),
      rawPublic,
    );
    if (!valid) return { ok: false, error: "invalid-signature" };
  } catch {
    return { ok: false, error: "invalid-signature" };
  }

  return { ok: true, payload };
}

async function recordEvent(
  admin: ReturnType<typeof adminClient>,
  input: {
    owner_id: string;
    machine_id?: string | null;
    session_id?: string | null;
    job_id?: string | null;
    event: string;
    detail?: Record<string, unknown>;
  },
) {
  try {
    await admin.from("knoux_bridge_events").insert({
      owner_id: input.owner_id,
      machine_id: input.machine_id ?? null,
      session_id: input.session_id ?? null,
      job_id: input.job_id ?? null,
      event: input.event,
      detail: input.detail ?? {},
    });
  } catch {}
}

async function machineAuth(req: Request, admin: ReturnType<typeof adminClient>) {
  const auth = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,256})$/i.exec(auth);
  if (!match) return null;
  const tokenHash = await sha256Hex(match[1]);

  const { data: session, error } = await admin
    .from("knoux_bridge_sessions")
    .select("id,machine_id,owner_id,expires_at,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) return null;

  const { data: machine, error: machineError } = await admin
    .from("knoux_bridge_machines")
    .select("id,owner_id,bridge_id,fingerprint,status")
    .eq("id", session.machine_id)
    .maybeSingle();

  if (machineError || !machine || machine.status === "revoked" || machine.owner_id !== session.owner_id) return null;
  return { session, machine };
}

async function gatewayAuth(req: Request, admin: ReturnType<typeof adminClient>) {
  const token = req.headers.get("x-knoux-gateway-token")?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const { data, error } = await admin
    .from("knoux_bridge_gateway_tokens")
    .select("id,bridge_id,revoked_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data || typeof data.bridge_id !== "string" || !data.bridge_id) return null;
  await admin.from("knoux_bridge_gateway_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return data;
}

function validateToolArgs(tool: string, raw: unknown): Record<string, unknown> {
  const args = raw && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {};

  if (["bridge.handshake", "git.status", "metrics.read", "proc.list"].includes(tool)) {
    if (Object.keys(args).length !== 0) throw new Error(tool + " does not accept arguments");
    return {};
  }

  if (tool === "logs.read") {
    const name = typeof args.name === "string" ? args.name.trim() : "";
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) throw new Error("invalid process name");
    const since = Number.isInteger(args.since) && Number(args.since) >= 0 ? Number(args.since) : 0;
    const limit = Number.isInteger(args.limit) ? Math.max(1, Math.min(500, Number(args.limit))) : 200;
    return { name, since, limit };
  }

  if (tool === "fs.list" || tool === "fs.read") {
    const path = typeof args.path === "string" ? args.path.trim() : "";
    if (!path || path.length > 4096 || path.includes("\0")) throw new Error("invalid path");
    return { path };
  }

  throw new Error("tool not allowlisted");
}

async function mintTicket(
  signer: Signer,
  input: { ownerId: string; bridgeId: string; jobId: string; scopes: string[] },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "EdDSA",
    typ: "KNX-TKT",
    kid: signer.fingerprint.slice(0, 16),
  };
  const claims = {
    iss: "knoux-bff",
    aud: input.bridgeId,
    sub: input.ownerId,
    sid: "cloud-job-" + input.jobId,
    scope: input.scopes,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + 60,
  };
  const h = textToBase64Url(JSON.stringify(header));
  const c = textToBase64Url(JSON.stringify(claims));
  const signingInput = h + "." + c;
  const signature = await ed.signAsync(te.encode(signingInput), signer.seed);
  return signingInput + "." + bytesToBase64Url(signature);
}

async function handleEnroll(req: Request, admin: ReturnType<typeof adminClient>) {
  const auth = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/.exec(auth);
  if (!match) return json({ error: "unauthorized" }, 401);
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) return json({ error: "unauthorized" }, 401);

  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const { data: row, error: insertError } = await admin
    .from("knoux_bridge_enrollments")
    .insert({
      owner_id: data.user.id,
      token_hash: await sha256Hex(token),
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !row) return json({ error: "enrollment-create-failed" }, 503);
  return json({
    ok: true,
    enrollmentId: row.id,
    enrollmentToken: token,
    expiresAt,
    oneTime: true,
  }, 201);
}

async function handleRegister(req: Request, admin: ReturnType<typeof adminClient>) {
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "invalid-body" }, 400); }

  const verified = await verifyRegistrationEnvelope(body);
  if (!verified.ok) return json({ error: verified.error }, 401);
  const payload = verified.payload;
  const bridgeId = payload.bridgeId as string;
  const fingerprint = payload.fingerprint as string;
  const publicKey = payload.publicKey as string;

  const { data: existing, error: lookupError } = await admin
    .from("knoux_bridge_machines")
    .select("id,owner_id,bridge_id,fingerprint,public_key,status")
    .eq("bridge_id", bridgeId)
    .maybeSingle();

  if (lookupError) return json({ error: "machine-lookup-failed" }, 503);

  let machine: { id: string; owner_id: string; bridge_id: string };
  let enrolled = false;

  if (existing) {
    if (existing.fingerprint !== fingerprint || existing.public_key !== publicKey || existing.status === "revoked") {
      return json({ error: "machine-identity-rejected" }, 403);
    }
    machine = { id: existing.id, owner_id: existing.owner_id, bridge_id: existing.bridge_id };
  } else {
    const enrollmentToken = typeof payload.enrollmentToken === "string" ? payload.enrollmentToken.trim() : "";
    if (!/^[A-Za-z0-9_-]{20,128}$/.test(enrollmentToken)) {
      return json({ error: "enrollment-required" }, 403);
    }

    const { data: created, error: enrollError } = await admin.rpc("knoux_bridge_enroll_machine", {
      p_token_hash: await sha256Hex(enrollmentToken),
      p_bridge_id: bridgeId,
      p_fingerprint: fingerprint,
      p_public_key: publicKey,
      p_hostname: (payload.hostname as string).slice(0, 255),
      p_platform: (payload.platform as string).slice(0, 64),
      p_arch: (payload.arch as string).slice(0, 64),
      p_bridge_version: (payload.version as string).slice(0, 64),
      p_capabilities: payload.capabilities,
    });
    const row = Array.isArray(created) ? created[0] : null;
    if (enrollError || !row) return json({ error: "enrollment-invalid-or-expired" }, 403);
    machine = { id: row.id, owner_id: row.owner_id, bridge_id: row.bridge_id };
    enrolled = true;
  }

  const now = new Date().toISOString();
  const { error: nonceError } = await admin.from("knoux_bridge_registration_nonces").insert({
    nonce: payload.nonce,
    machine_id: machine.id,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (nonceError) return json({ error: "registration-replay" }, 409);

  if (!enrolled) {
    const { error: updateError } = await admin.from("knoux_bridge_machines").update({
      hostname: (payload.hostname as string).slice(0, 255),
      platform: (payload.platform as string).slice(0, 64),
      arch: (payload.arch as string).slice(0, 64),
      bridge_version: (payload.version as string).slice(0, 64),
      capabilities: payload.capabilities,
      status: "online",
      last_seen_at: now,
      updated_at: now,
    }).eq("id", machine.id);
    if (updateError) return json({ error: "machine-refresh-failed" }, 503);
  }

  await admin.from("knoux_bridge_sessions").update({ revoked_at: now })
    .eq("machine_id", machine.id).is("revoked_at", null);

  const sessionToken = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { data: session, error: sessionError } = await admin.from("knoux_bridge_sessions").insert({
    machine_id: machine.id,
    owner_id: machine.owner_id,
    token_hash: await sha256Hex(sessionToken),
    expires_at: expiresAt,
    last_seen_at: now,
  }).select("id").single();

  if (sessionError || !session) return json({ error: "session-create-failed" }, 503);

  const signer = await loadSigner(admin);
  await recordEvent(admin, {
    owner_id: machine.owner_id,
    machine_id: machine.id,
    session_id: session.id,
    event: enrolled ? "machine.enrolled" : "machine.reconnected",
    detail: {
      bridgeId,
      hostname: payload.hostname,
      platform: payload.platform,
      version: payload.version,
    },
  });

  return json({
    ok: true,
    machineId: machine.id,
    sessionId: session.id,
    sessionToken,
    expiresAt,
    heartbeatIntervalMs: 30_000,
    idlePollMs: 2_000,
    issuerPublicKey: signer.publicKeyPem,
    issuerFingerprint: signer.fingerprint,
  });
}

async function handleHeartbeat(req: Request, admin: ReturnType<typeof adminClient>) {
  const auth = await machineAuth(req, admin);
  if (!auth) return json({ error: "machine-unauthorized" }, 401);
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
  } catch {}

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status: "online", last_seen_at: now, updated_at: now };
  if (typeof body.version === "string" && body.version.length <= 64) update.bridge_version = body.version;
  if (body.capabilities && typeof body.capabilities === "object") update.capabilities = body.capabilities;

  await Promise.all([
    admin.from("knoux_bridge_machines").update(update).eq("id", auth.machine.id),
    admin.from("knoux_bridge_sessions").update({ last_seen_at: now }).eq("id", auth.session.id),
  ]);

  return json({
    ok: true,
    machineId: auth.machine.id,
    serverTime: now,
    sessionExpiresAt: auth.session.expires_at,
  });
}

async function handlePoll(req: Request, admin: ReturnType<typeof adminClient>) {
  const auth = await machineAuth(req, admin);
  if (!auth) return json({ error: "machine-unauthorized" }, 401);

  const now = new Date().toISOString();
  await Promise.all([
    admin.from("knoux_bridge_machines").update({ status: "online", last_seen_at: now, updated_at: now })
      .eq("id", auth.machine.id),
    admin.from("knoux_bridge_sessions").update({ last_seen_at: now }).eq("id", auth.session.id),
  ]);

  const { data, error } = await admin.rpc("knoux_bridge_claim_job", {
    p_machine_id: auth.machine.id,
    p_session_id: auth.session.id,
  });
  if (error) return json({ error: "job-claim-failed" }, 503);

  const job = Array.isArray(data) ? data[0] : null;
  if (!job) return new Response(null, { status: 204 });

  const scopes = TOOL_SCOPES[job.tool];
  if (!scopes || job.mutating === true) {
    await admin.from("knoux_bridge_jobs").update({
      status: "failed",
      completed_at: now,
      error: "Control plane refuses unregistered or mutating tools.",
    }).eq("id", job.id);
    return json({ error: "job-not-allowlisted" }, 409);
  }

  const signer = await loadSigner(admin);
  const ticket = await mintTicket(signer, {
    ownerId: auth.session.owner_id,
    bridgeId: auth.machine.bridge_id,
    jobId: job.id,
    scopes,
  });

  await recordEvent(admin, {
    owner_id: auth.session.owner_id,
    machine_id: auth.machine.id,
    session_id: auth.session.id,
    job_id: job.id,
    event: "job.claimed",
    detail: { tool: job.tool },
  });

  return json({
    ok: true,
    job: { id: job.id, tool: job.tool, args: job.args ?? {}, expiresAt: job.expires_at },
    bridgeTicket: ticket,
  });
}

async function handleResult(req: Request, admin: ReturnType<typeof adminClient>) {
  const auth = await machineAuth(req, admin);
  if (!auth) return json({ error: "machine-unauthorized" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid-body" }, 400); }

  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return json({ error: "invalid-job-id" }, 400);

  const { data: job } = await admin.from("knoux_bridge_jobs")
    .select("id,owner_id,machine_id,status")
    .eq("id", jobId)
    .eq("machine_id", auth.machine.id)
    .maybeSingle();

  if (!job) return json({ error: "job-not-found" }, 404);
  if (!["claimed", "running"].includes(job.status)) return json({ error: "job-not-claimable" }, 409);

  const ok = body.ok === true;
  const completedAt = new Date().toISOString();
  const durationMs = Number.isFinite(body.durationMs) && Number(body.durationMs) >= 0
    ? Math.min(Number(body.durationMs), 86_400_000) : null;
  const update: Record<string, unknown> = {
    status: ok ? "succeeded" : "failed",
    completed_at: completedAt,
    result: ok ? (body.result ?? null) : null,
    error: ok ? null : (typeof body.error === "string" ? body.error.slice(0, 2000) : "Local bridge failure"),
    duration_ms: durationMs,
  };
  if (job.status === "claimed") update.started_at = completedAt;
  await admin.from("knoux_bridge_jobs").update(update).eq("id", job.id);

  await recordEvent(admin, {
    owner_id: auth.session.owner_id,
    machine_id: auth.machine.id,
    session_id: auth.session.id,
    job_id: job.id,
    event: ok ? "job.succeeded" : "job.failed",
    detail: { durationMs },
  });

  return json({ ok: true });
}

async function gatewayMachine(admin: ReturnType<typeof adminClient>, bridgeId: string) {
  const { data, error } = await admin.from("knoux_bridge_machines")
    .select("id,owner_id,bridge_id,hostname,platform,arch,bridge_version,capabilities,status,last_seen_at,registered_at")
    .eq("bridge_id", bridgeId)
    .maybeSingle();
  if (error || !data) return null;
  const ageMs = Math.max(0, Date.now() - Date.parse(data.last_seen_at));
  return { ...data, ageMs, online: data.status !== "revoked" && ageMs <= ONLINE_WINDOW_MS };
}

async function handleStatus(req: Request, admin: ReturnType<typeof adminClient>) {
  const gateway = await gatewayAuth(req, admin);
  if (!gateway) return json({ error: "gateway-unauthorized" }, 401);
  const machine = await gatewayMachine(admin, gateway.bridge_id);
  if (!machine) {
    return json({
      ok: true,
      service: "knoux-bridge-control",
      local_machine_connected: false,
      machine: null,
      reason: "machine-not-registered",
      measuredAt: new Date().toISOString(),
    });
  }
  return json({
    ok: true,
    service: "knoux-bridge-control",
    local_machine_connected: machine.online,
    machine: {
      bridgeId: machine.bridge_id,
      hostname: machine.hostname,
      platform: machine.platform,
      arch: machine.arch,
      version: machine.bridge_version,
      capabilities: machine.capabilities,
      status: machine.online ? "online" : "offline",
      lastSeenAt: machine.last_seen_at,
      lastSeenAgeMs: machine.ageMs,
      registeredAt: machine.registered_at,
    },
    measuredAt: new Date().toISOString(),
  });
}

async function handleRun(req: Request, admin: ReturnType<typeof adminClient>) {
  const gateway = await gatewayAuth(req, admin);
  if (!gateway) return json({ error: "gateway-unauthorized" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid-body" }, 400); }
  const tool = typeof body.tool === "string" ? body.tool.trim() : "";
  const scopes = TOOL_SCOPES[tool];
  if (!scopes) return json({ error: "tool-not-allowlisted" }, 400);

  let args: Record<string, unknown>;
  try { args = validateToolArgs(tool, body.args); }
  catch (error) { return json({ error: "invalid-tool-args", message: String(error) }, 400); }

  const machine = await gatewayMachine(admin, gateway.bridge_id);
  if (!machine) return json({ error: "machine-not-found" }, 404);
  if (!machine.online) return json({ error: "machine-offline" }, 409);

  const { data: job, error } = await admin.from("knoux_bridge_jobs").insert({
    owner_id: machine.owner_id,
    machine_id: machine.id,
    tool,
    args,
    required_scopes: scopes,
    mutating: false,
    idempotency_key: crypto.randomUUID(),
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
  }).select("id,status,created_at,expires_at").single();

  if (error || !job) return json({ error: "job-create-failed" }, 503);

  const deadline = Date.now() + MAX_JOB_WAIT_MS;
  while (Date.now() < deadline) {
    const { data: current } = await admin.from("knoux_bridge_jobs")
      .select("id,status,result,error,duration_ms,completed_at")
      .eq("id", job.id)
      .maybeSingle();

    if (current && ["succeeded", "failed", "cancelled", "expired"].includes(current.status)) {
      if (current.status === "succeeded") {
        return json({
          ok: true,
          jobId: current.id,
          tool,
          result: current.result,
          durationMs: current.duration_ms,
          completedAt: current.completed_at,
        });
      }
      return json({
        ok: false,
        jobId: current.id,
        tool,
        status: current.status,
        error: current.error ?? "job failed",
      }, 502);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return json({ ok: false, jobId: job.id, tool, status: "pending", error: "job-timeout" }, 504);
}

Deno.serve(async (req: Request) => {
  try {
    const admin = adminClient();
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const action = parts[parts.length - 1];

    if (req.method === "GET" && (action === "knoux-bridge-control" || action === "health")) {
      return json({ ok: true, service: "knoux-bridge-control", version: "1.0.0" });
    }
    if (req.method === "POST" && action === "enroll") return await handleEnroll(req, admin);
    if (req.method === "POST" && action === "register") return await handleRegister(req, admin);
    if (req.method === "POST" && action === "heartbeat") return await handleHeartbeat(req, admin);
    if (req.method === "POST" && action === "poll") return await handlePoll(req, admin);
    if (req.method === "POST" && action === "result") return await handleResult(req, admin);
    if (req.method === "GET" && action === "status") return await handleStatus(req, admin);
    if (req.method === "POST" && action === "run") return await handleRun(req, admin);

    return json({ error: "not-found" }, 404);
  } catch (error) {
    console.error("[knoux-bridge-control]", error instanceof Error ? error.message : String(error));
    return json({ error: "internal-control-plane-error" }, 500);
  }
});
