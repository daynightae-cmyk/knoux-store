# KNOuX Store MCP Gateway

Private MCP gateway for the KNOuX Store outbound Local Bridge control plane.

## Runtime boundary

The gateway does not receive a Supabase service-role key and does not hold the
Bridge Ed25519 signing key.

It receives only:

- `KNOUX_CONTROL_PLANE_URL`
- `KNOUX_GATEWAY_TOKEN`
- `KNOUX_ALLOWED_BRIDGE_ID`

The gateway token is bound server-side to one Bridge ID. Supabase Edge Functions
perform privileged database operations. Bridge ticket private signing material
remains encrypted in Supabase Vault and signatures are created inside Postgres.

The Windows bridge remains loopback-only. Cloud-to-local work is queued in
Supabase and claimed by the local machine over outbound HTTPS.
