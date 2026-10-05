/* eslint-disable @typescript-eslint/no-explicit-any */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? "";
const CONTROL_URL = `${SUPABASE_URL}/functions/v1/knoux-bridge-control`;
const PROTOCOL_VERSION = "2025-06-18";

type JsonRpcId = string | number | null;

const TOOLS = [
  {
    name: "gateway_status",
    description: "Return measured KNOuX Store local-machine connectivity and heartbeat state.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "machine_git_status",
    description: "Read the real Git status and recent commits from the enrolled KNOuX Store Windows machine.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "machine_metrics",
    description: "Read measured CPU, memory, disk, network and bridge process metrics from the enrolled machine.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "machine_processes",
    description: "List supervised KNOuX Store processes. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "machine_list_files",
    description: "List files under the KNOuX Store bridge root. The local path policy remains authoritative.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", default: "." } },
      additionalProperties: false,
    },
  },
  {
    name: "machine_read_file",
    description: "Read one file under the KNOuX Store bridge root. Read-only and root-confined.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    },
  },
  {
    name: "machine_logs",
    description: "Read bounded output from one supervised KNOuX Store process.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        since: { type: "integer", minimum: 0, default: 0 },
        limit: { type: "integer", minimum: 1, maximum: 500, default: 200 },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
] as const;

function rpcResult(id: JsonRpcId, result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "mcp-protocol-version": PROTOCOL_VERSION,
    },
  });
}

function rpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  status = 200,
  data?: unknown,
): Response {
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "mcp-protocol-version": PROTOCOL_VERSION,
    },
  });
}

function textContent(value: unknown, isError = false) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify(value, null, 2),
    }],
    isError,
  };
}

async function control(
  token: string,
  path: "gateway/status" | "gateway/run",
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; body: any }> {
  const response = await fetch(`${CONTROL_URL}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    payload = { error: "control-plane-non-json" };
  }

  return { ok: response.ok, status: response.status, body: payload };
}

function tokenFrom(req: Request): string | null {
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,256})$/i.exec(
    req.headers.get("authorization") ?? "",
  );
  return match?.[1] ?? null;
}

function validPath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 4096
    && !value.includes("\0");
}

async function callTool(
  token: string,
  name: string,
  rawArgs: unknown,
): Promise<{ result: unknown; isError: boolean }> {
  const args = rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
    ? rawArgs as Record<string, unknown>
    : {};

  if (name === "gateway_status") {
    const out = await control(token, "gateway/status", {});
    return { result: out.body, isError: !out.ok };
  }

  let tool = "";
  let toolArgs: Record<string, unknown> = {};

  switch (name) {
    case "machine_git_status":
      tool = "git.status";
      break;
    case "machine_metrics":
      tool = "metrics.read";
      break;
    case "machine_processes":
      tool = "proc.list";
      break;
    case "machine_list_files": {
      const path = args.path ?? ".";
      if (!validPath(path)) {
        return { result: { error: "invalid-path" }, isError: true };
      }
      tool = "fs.list";
      toolArgs = { path };
      break;
    }
    case "machine_read_file": {
      if (!validPath(args.path)) {
        return { result: { error: "invalid-path" }, isError: true };
      }
      tool = "fs.read";
      toolArgs = { path: args.path };
      break;
    }
    case "machine_logs": {
      const processName = typeof args.name === "string" ? args.name.trim() : "";
      if (!/^[A-Za-z0-9._-]{1,64}$/.test(processName)) {
        return { result: { error: "invalid-process-name" }, isError: true };
      }
      const since = Number.isInteger(args.since) && Number(args.since) >= 0
        ? Number(args.since) : 0;
      const limit = Number.isInteger(args.limit)
        ? Math.max(1, Math.min(500, Number(args.limit)))
        : 200;
      tool = "logs.read";
      toolArgs = { name: processName, since, limit };
      break;
    }
    default:
      return { result: { error: "unknown-tool", name }, isError: true };
  }

  const out = await control(token, "gateway/run", { tool, args: toolArgs });
  return { result: out.body, isError: !out.ok };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    return new Response(JSON.stringify({
      ok: true,
      service: "knoux-store-mcp-gateway",
      transport: "streamable-http-json",
      protocolVersion: PROTOCOL_VERSION,
      tools: TOOLS.length,
    }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const token = tokenFrom(req);
  if (!token) {
    return rpcError(null, -32001, "Unauthorized", 401);
  }

  let message: any;
  try {
    const text = await req.text();
    if (text.length > 256_000) {
      return rpcError(null, -32600, "Request too large", 413);
    }
    message = JSON.parse(text);
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }

  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(message?.id ?? null, -32600, "Invalid Request", 400);
  }

  const id: JsonRpcId = message.id ?? null;

  if (message.method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (message.method === "initialize") {
    const authCheck = await control(token, "gateway/status", {});
    if (!authCheck.ok) {
      return rpcError(id, -32001, "Unauthorized", 401);
    }

    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: {
        name: "KNOuX Store MCP Gateway",
        version: "1.0.0",
      },
      instructions:
        "Read-only KNOuX Store local-machine tools routed through the outbound KNOuX Bridge control plane.",
    });
  }

  if (message.method === "ping") {
    return rpcResult(id, {});
  }

  if (message.method === "tools/list") {
    const authCheck = await control(token, "gateway/status", {});
    if (!authCheck.ok) {
      return rpcError(id, -32001, "Unauthorized", 401);
    }
    return rpcResult(id, { tools: TOOLS });
  }

  if (message.method === "tools/call") {
    const params = message.params;
    if (!params || typeof params.name !== "string") {
      return rpcError(id, -32602, "Invalid params");
    }
    const called = await callTool(token, params.name, params.arguments);
    return rpcResult(id, textContent(called.result, called.isError));
  }

  return rpcError(id, -32601, "Method not found");
});
