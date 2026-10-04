# KNOuX Store MCP Gateway

Private MCP gateway for the KNOuX Store outbound Local Bridge control plane.

## Security model

- Deploy behind Cloud Run IAM; do not allow unauthenticated invocation.
- Restrict the gateway to exactly one bridge identity with `KNOUX_ALLOWED_BRIDGE_ID`.
- `SUPABASE_SERVICE_ROLE_KEY` stays server-side in the Cloud Run secret store.
- The gateway exposes read-only tools in v1.
- It never opens a route into the Windows machine. Jobs are queued in the cloud
  and claimed by the Windows bridge through outbound HTTPS polling.
- Machine liveness is derived from measured heartbeat timestamps. No hard-coded
  `local_machine_connected` state exists.

## Required environment

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>
KNOUX_ALLOWED_BRIDGE_ID=<16-64 lowercase hex>
```

Optional:

```
KNOUX_ALLOWED_OWNER_ID=
KNOUX_MACHINE_ONLINE_WINDOW_SECONDS=90
KNOUX_JOB_TIMEOUT_SECONDS=30
```

The Agent Engine caller should use Cloud Run IAM identity, as with the existing
authenticated MCP proof. No static MCP bearer token is required.
