# KNOuX Build Bridge

The bridge is a separate, authenticated, locally-hosted Node service that owns the shell, filesystem, git credentials, and process supervision for the KNOuX DEV workspace. The hosted Next.js workspace talks to it through a signed, short-lived, least-privilege channel.

## Architecture

```
Browser ←WSS (signed ticket)→ Bridge
Browser ←HTTPS (cookies)→ Next.js BFF ←HTTPS + signed request→ Bridge
```

The Next.js server never proxies the PTY stream. Terminal sessions go directly from the browser to the bridge over WebSocket, using a 60-second, single-use, Ed25519-signed ticket minted by the BFF.

## Install

```bash
cd bridge
npm install
npm run build
```

## Quick start

### 1. Initialize the bridge identity

```bash
npx knoux-bridge init
```

This generates an Ed25519 keypair in `~/.knoux/bridge/identity.json` (0600 permissions) and prints the public key fingerprint.

### 2. Start the bridge

```bash
npx knoux-bridge start
```

The bridge listens on `127.0.0.1:7331` by default. It refuses to listen on a non-loopback interface without TLS.

### 3. Pair from the DEV workspace

1. Open `/build/settings` → "Connect bridge"
2. Enter the bridge URL (e.g. `http://127.0.0.1:7331`) and the pairing code
3. The BFF calls `POST /v1/pair` with the code and the web app's public key
4. The bridge stores the web app public key as trusted issuer
5. Verify the fingerprint matches what `knoux-bridge init` printed

### 4. Open a terminal

Navigate to `/build/terminal`. The page requests a ticket from the BFF, connects to the bridge over WebSocket, and opens a real shell session.

## Configuration

Create `bridge.config.json` in the working directory:

```json
{
  "root": "C:\\dev\\knoux-store",
  "port": 7331,
  "host": "127.0.0.1",
  "requireTls": true,
  "allowEnvWrite": false,
  "loadProfile": false,
  "limits": {
    "maxSessions": 3,
    "idleTimeoutMinutes": 30,
    "maxLifetimeHours": 8,
    "scrollbackBytes": 262144,
    "detachTtlMinutes": 10
  },
  "allowlistedTasks": {
    "lint": ["npm", "run", "lint"],
    "typecheck": ["npm", "run", "typecheck"],
    "build": ["npm", "run", "build"],
    "test": ["npm", "run", "test"]
  },
  "processProfiles": {
    "dev": { "cmd": "npm", "args": ["run", "dev"], "port": 3000 },
    "tunnel": { "cmd": "cloudflared", "args": ["tunnel", "run", "knoux-bridge"] }
  }
}
```

## Tunnel modes

The bridge needs a reachable URL for the browser to connect to. Three modes:

1. **localhost** — for local dev. The bridge listens on `127.0.0.1:7331`. The browser connects directly.
2. **Cloudflare Tunnel / Tailscale Funnel / ngrok** — creates an HTTPS tunnel to a home PC. The bridge listens on localhost; the tunnel provides the public URL.
3. **Private VPS** — the bridge runs on a VPS behind a reverse proxy with TLS. Set `host: "0.0.0.0"` and `requireTls: true`.

The bridge refuses to listen on a non-loopback interface without TLS or an explicit `--i-understand-the-risk` flag.

## Security

- Tickets are Ed25519-signed JWTs with 60-second expiry, single-use jti, and scope enforcement.
- The bridge verifies: size limit → parse → alg/typ allowlist → signature → aud → exp/iat (±5s skew) → jti unseen → scope → origin allowlist.
- All filesystem paths are relative to the configured root. Absolute paths, traversal, symlinks outside root, and UNC paths are denied.
- Writes to `.git/**`, bridge config, and `.env*` are denied by default.
- The PTY environment is allowlisted — secrets are never forwarded.
- Every privileged action is audited to a local append-only JSONL log.

## Windows service

```bash
npx knoux-bridge install-service
```

This prints NSSM instructions. The service runs as the current user (not SYSTEM) so the shell has the owner's environment.

## API

All endpoints except `/v1/health` require a valid signed ticket (Bearer token).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/health` | Health check |
| POST | `/v1/pair` | Pair with a new issuer |
| POST | `/v1/unpair` | Remove all trusted issuers |
| GET | `/v1/handshake` | Capabilities, host info, versions |
| GET | `/v1/fs/list?path=` | List directory entries |
| GET | `/v1/fs/read?path=` | Read file content |
| POST | `/v1/fs/write` | Write file (atomic) |
| GET | `/v1/git/status` | Git status |
| GET | `/v1/git/log` | Git log |
| POST | `/v1/exec/run` | Run allowlisted task (SSE) |
| GET | `/v1/proc/list` | List supervised processes |
| POST | `/v1/proc/start` | Start a supervised process |
| POST | `/v1/proc/stop` | Stop a supervised process |
| GET | `/v1/metrics` | System metrics sample |
| GET | `/v1/logs?name=` | Tail process logs |
| GET | `/v1/audit` | Read audit log |
| WS | `/v1/terminal?ticket=&session=` | Terminal WebSocket |

## Testing

```bash
cd bridge
npm test
```
