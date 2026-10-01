# KNOuX Build Bridge

The bridge is a local service that gives the DEV workspace real access to your
machine: a shell, the filesystem under your workspace root, git, allowlisted
verification tasks, and supervised processes.

It exists so that "build this for me" means something. A deployment on a server
cannot run your project's tests against your local files, and it should not
pretend to. The bridge runs on your machine, and the workspace talks to it.

## What is real, and what is not

Every value the bridge reports was measured:

- **Status.** `/v1/health` answers only because the process is running. A
  reachable bridge is not a paired one, and the workspace distinguishes them.
- **Capabilities.** The handshake lists the shell profiles this host actually
  probed. `terminal` is true because a shell was found, not because terminals
  are a product feature.
- **Metrics.** CPU, memory, disk and network are sampled from the platform at
  request time. A value that cannot be measured is `null`. It is never a
  plausible-looking `0` standing in for something that was not read.
- **Processes.** `proc:list` reports the state of a real child process. A
  process that exited non-zero is `failed` with its real exit code. Logs are the
  bytes the process actually wrote.
- **Filesystem.** Reads and writes go to the path you asked for, inside the
  configured root. Symlinks are resolved and re-checked; a link pointing out of
  the root is refused.
- **Git.** Branch, head and status come from `git`. In a directory that is not a
  repository, the snapshot reports `available: false` and a blocker.

If a capability is not there, the workspace shows it as blocked and says why.

## Install

```bash
cd bridge
npm install
npm run build
```

## Pair

Two steps, in this order.

**1. On this machine**, create the identity and note the code:

```
node dist/main.js init
```

It prints a bridge id, a fingerprint, and an eight-character pairing code that
is valid for fifteen minutes and works once.

**2. Configure the workspace** so it knows a bridge exists:

```bash
KNOUX_BRIDGE_URL=http://127.0.0.1:7331
KNOUX_BRIDGE_SIGNING_KEY=<a base64 32-byte Ed25519 seed, or a PKCS8 PEM>
```

Generate a seed:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Both variables stay on the server. The seed is the identity that mints tickets,
so it never leaves the deployment and never reaches a browser.

**3. Start the bridge and pair it from the workspace** settings page, entering
the code from step 1.

Pairing records the bridge's id and fingerprint. Compare the fingerprint the
workspace shows against `node dist/main.js pair-status` — if they differ, you
are not talking to the machine you think you are.

## Run

```
node dist/main.js start
```

Commands:

| Command | What it does |
| --- | --- |
| `init` | Create the identity and print a pairing code |
| `start` | Run the server |
| `pair-status` | Show identity, trusted issuers, pending codes |
| `unpair` | Remove all trusted issuers and pending codes |
| `doctor` | Probe this host and report what is actually available |
| `install-service` | Print Windows service instructions |

`doctor` is the honest answer to "what can this bridge do here":

```
$ node dist/main.js doctor
KNOuX Bridge diagnostics
=========================
Platform:     win32 (x64)
Node:         v24.19.0
Root:         D:\Knoux Store
Listen:       127.0.0.1:7331
Identity:     present

Shell profiles:
  powershell: C:\Windows\...\powershell.exe (version 5.1...)
  cmd: C:\Windows\System32\cmd.exe (version unknown)

Network counters:
  available (rx 91244123 B, tx 6102931 B cumulative)

Metrics sample:
  cpu:            3% (process), 12% (system)
  memory:         8123 MiB / 31892 MiB
  disk free:      51234 MiB
  network rx/tx:  4410 / 1203 B/s
```

## Configuration

`bridge.config.json` beside the compiled sources. `bridge.config.example.json` is
the committed example; `bridge.config.local.json` overrides it and is ignored by
git.

```json
{
  "root": "..",
  "port": 7331,
  "host": "127.0.0.1",
  "allowEnvWrite": false,
  "loadProfile": false,
  "limits": {
    "maxSessions": 3,
    "idleTimeoutMinutes": 30,
    "maxLifetimeHours": 8,
    "detachTtlMinutes": 10
  },
  "allowlistedTasks": {
    "lint": ["npm", "run", "lint"],
    "typecheck": ["npm", "run", "typecheck"]
  },
  "processProfiles": {
    "dev": { "cmd": "npm", "args": ["run", "dev"], "port": 3000 }
  }
}
```

Notes on what the validator actually enforces:

- **`root` resolves against the config directory**, not the process working
  directory, so starting the bridge from anywhere still points at the same tree.
- **`allowEnvWrite: true` is required, as `true`,** to write `.env` files. A
  string `"false"` is not a way to say no; it is not a way to say yes either.
- **`allowlistedTasks` is replaced, not merged.** An empty object disables
  execution entirely; a malformed one does the same rather than falling back to
  the defaults. A configuration error must never be a privilege grant.
- **`processProfiles` entries without a runnable command are dropped** at load,
  so `proc:list` never advertises a process that cannot start.
- **`loadProfile`** defaults to false: a shell starts without your PowerShell
  profile, so what you see in the workspace is the shell and not your dotfiles.

The bridge refuses to bind anything but loopback. It speaks plain HTTP, and the
security of the ticket scheme rests on the ticket never crossing a network.

## Security model

**Tickets.** The workspace mints an Ed25519-signed ticket per request. Each is
audience-bound to this bridge's id, scoped to what the route needs, single-use,
and valid for sixty seconds. The bridge checks, in order: size, shape,
`alg`/`typ`, `kid` against its trust store, signature, issuer, audience,
`iat`/`exp` against a lifetime ceiling, replay of `jti`, then scope. Any failure
returns the same `403 invalid-ticket` with no detail, so the endpoint is not an
oracle; the specific reason goes to the local audit log.

Ed25519 hashes internally, so both sides pass `null` where a digest argument
would otherwise go. Passing `'sha256'` throws, which would silently refuse every
valid ticket.

**Filesystem.** Paths are relative to `root`; absolute paths are refused. Every
route re-checks containment after `realpath`, so a symlink or junction pointing
out of the root is caught even though its lexical path is inside. `.git/**` and
`bridge/**` are never reachable through the filesystem API, and `.env*` needs
`allowEnvWrite`. Writes are atomic: a temporary file in the same directory,
then a rename, so a reader never sees half a file.

**Exec.** The route accepts one of four task names. Each maps to an argv array in
the bridge's own config and runs with `shell: false`. Nothing a caller writes can
reach a command line, and there is no scope anywhere in the system for an
arbitrary command.

**Terminal.** The ticket is required on the socket. A session is capped, a
disconnected session is retained for `detachTtlMinutes` so a browser refresh
resumes the same shell rather than starting a new one, and a resume replays only
the frames the client missed.

**What is stored where.** The issuer private key never leaves the deployment and
is never written to the database. The bridge keeps its identity and trust store
under `~/.knoux/bridge`, and its audit log under `~/.knoux/bridge/audit`. The
database stores fingerprints and timestamps only.

## Tests

```
cd bridge
npm test
```

148 tests over policy, tickets, sessions, config, the HTTP surface and the
terminal socket. The socket tests spawn real shells, so the suite needs a working
PTY and takes about eight seconds.

## Known limits

- **Sessions and process state are in memory.** A restarted bridge has no
  sessions. `alive()` never claims otherwise.
- **`fs.watch` does not exist.** The bridge polls; it does not watch the
  filesystem. The workspace's capability list says `blocked` for it.
- **Network rates need two samples.** The first `/v1/metrics` call returns
  `null` for rx/tx because a rate is a difference and there is nothing to
  difference against yet.
- **`command.arbitrary` is permanently blocked.** Not unimplemented: there is no
  scope that could grant it.