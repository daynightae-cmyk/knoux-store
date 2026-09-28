# KNOuX Build OS — Architecture

Route: `/build`. Branch: `feat/knoux-build-os`. Baseline: `484bba7`.

The Build OS is an engineering workspace inside KNOuX Store. It is not an IDE
embedded in a website. The distinction matters for every decision below: a
browser-hosted deployment has no shell, no writable disk and no credentials, so
the workspace is built as a set of contracts and a truthful projection of the
adapter that is actually present, not as a set of buttons that do nothing.

## The governing rule

If a capability cannot perform the operation for real, it is not a feature. It
is a status.

This is enforced structurally rather than by discipline:

- The read-only adapter class exposes **no write method at all**. There is no
  `writeFile`, no `deleteFile`, and no arbitrary `runCommand`. A capability
  reported as `blocked` is not a policy flag that could later be bypassed,
  because the code to bypass it does not exist.
- `VerificationStatus` has **no optimistic member**. There is no `PASS` default.
  A check that never ran is `not-run`.
- The status rail renders every declared capability with its real state and the
  exact requirement that would change it. There is no path in the UI where a
  control looks working and is not.

## Layout

```
KnouxBuildWorkspace            owns the single reducer and the single fetch pass
├── BuildWorkspaceHeader       context strip: environment, project, branch, HEAD,
│                              working tree, runtime, mode, routing, config
├── WorkspaceModeSwitcher      nine modes, none hidden when blocked
├── WorkspaceCanvas            split geometry: single | side-by-side | stacked
│   ├── CommandDeck            the preserved Composer + specification reader
│   ├── CodeSurface            real source, read-only
│   ├── PreviewSurface         real runtime, real viewports
│   ├── TerminalSurface        blocked, explained
│   ├── SystemSurface          adapter, configuration presence, runtime, database
│   ├── DataSurface            blocked, adapter capability declared
│   ├── TestSurface            allowlisted runner, disabled by default
│   ├── GitSurface             real Git, read-only
│   ├── ReleaseSurface         stage-by-stage real evidence
│   └── SystemCluster
│       ├── ArchitectureSurface   Project Cortex + Impact Radar
│       ├── DiagnosticsSurface    normalised, never guessed
│       ├── SenshialSurface       ASK / PLAN / EXECUTE, always visible
│       ├── ProviderCenter        presence, models, routing reasons
│       ├── RealityLedger         six independent axes
│       ├── ProjectHealth         evidence-driven, score withheld when unrun
│       └── ExecutionHistory      replay + failure memory
└── WorkspaceStatusRail        every capability, its state, its requirement
```

## State

One reducer in `lib/build/workspace-state.ts`. No component owns project state.
This is what prevents the header and a pane from disagreeing about the same
fact, which is the failure mode that makes a workspace feel untrustworthy.

State is grouped by lifetime rather than by component:

| Group | Contents | Lifetime |
| --- | --- | --- |
| `adapter` | capabilities, blockers, environment | replaced on resolve |
| `project`, `graph`, `git`, `environment`, `database` | facts about the machine | replaced wholesale |
| `workspace` | active surface, split, open files, selection | navigation only |
| `ai`, `terminal`, `executions`, `failures` | session history | grows, bounded |

There is no field for a secret anywhere in this state, and no provider value is
ever placed in it. The provider projection carries environment variable *names*
so a developer knows what to set; values are read on the server and discarded.

## Adapters

`ProjectAdapter` is the only route from the workspace to the outside world. The
shipped implementation is `FsProjectAdapter`, which reads the real checkout that
produced the running build.

| Capability | State | Why |
| --- | --- | --- |
| `project.read`, `project.files` | available | `node:fs` read of the deployment |
| `git.read` | available | `git` spawned with a fixed argument list |
| `preview.live` | available | the deployment is itself a real runtime |
| `project.write`, `project.delete` | blocked | no write method exists on the class |
| `git.write` | blocked | would need credentials a web server must not hold |
| `command.arbitrary` | blocked | would be remote code execution on the public site |
| `terminal.interactive` | blocked | a web deployment has no shell |
| `runtime.manage` | blocked | cannot start, stop or supervise processes |
| `database.read` | unconfigured | no connection string |
| `database.write` | blocked | needs a connection *and* an elevated path |
| `provider.execute` | unconfigured | no provider credential |
| `deploy.trigger` | blocked | release belongs to the pipeline |

## Command Deck

The existing `Composer` is preserved unchanged and is the genesis layer. It
still resolves a sentence to real KNOuX registry records through
`evaluateComposer`, and the Build Orb is untouched.

Beside it, `compileBuildIntent` adds a second deterministic pass for the
vocabulary a specification needs: product kind, stack, integrations, language
and deployment target. It delegates registry resolution to the same
`evaluateComposer` the Composer uses, so the deck and the orb can never
disagree about what a phrase means.

It is not a model and does not pretend to be one. A word it cannot resolve is
returned in `unresolvedTerms` rather than mapped to something adjacent.

## Providers and routing

Eight provider adapters are declared. None implements `execute`, because no
credential exists and shipping an unused network call would be decoration.

A provider with no credential is `unconfigured` — never "online" and never
"offline", because those describe a service that was contacted.

Model metadata is declared in source, never discovered. The router only ever
matches a property a model actually declares, so it cannot route on a
capability it invented. When nothing qualifies the decision is `unavailable`
with the blocker; no substitute is chosen. The UI shows the rule that fired.

## Permissions

`evaluatePermission` is pure and takes only the action, so a caller cannot
obtain approval by constructing a different object than the one it displays.
`ceilingForMode` caps what a Senshial mode may even propose: `ask` is `read`,
`plan` is `edit`, `execute` is `deploy`. That is the mechanism that stops a plan
quietly becoming an edit.

## Security

- No `NEXT_PUBLIC_*` key. A test fails the build if one appears.
- `/api/build/file` validates the path before touching the disk, and the adapter
  re-validates by resolving and requiring containment inside the root.
- `/api/build/verify` accepts one of four task names, maps them to the project's
  own package scripts inside the adapter, and builds the argument vector itself.
  There is no path from the request to `spawn` with caller-controlled arguments.
  It is refused unless `KNOUX_BUILD_ALLOW_VERIFY=1`, and the adapter permits one
  run at a time, because an unauthenticated endpoint that can start builds is a
  denial-of-service vector.
- Git and npm are spawned with `shell: false` and fixed argument lists.
- Terminal, log and diagnostic output is rendered as text nodes, never markup.
  The tokenizer returns spans; it never returns an HTML string.
- `/api/build/environment` reports configuration *presence* only.

## Performance

No editor, graph, or database dependency was added. The tokenizer is ~150 lines
and returns spans. The heaviest artefacts remain the pre-existing Three.js orb
and the Living Particle Mark, both unchanged. The workspace adds no WebGL
context, no `requestAnimationFrame` loop and no pointer listener. `/build` is
rendered per request rather than prerendered, because the Composer's
`useSearchParams` would otherwise force the whole workspace into client-side
rendering and ship no server markup at all.

## Extension seams

- A local or remote bridge implements `ProjectAdapter` and the workspace gains
  terminal, write, runtime and Git write without a UI change.
- A provider gains `execute` and Senshial stops reporting `blocked`.
- A Postgres adapter implements the database contract and the Data surface
  becomes a schema inspector.
- `SCOREABLE_CHECKS` in `verification.ts` is the set a health score is measured
  over, so adding a gate changes the denominator deliberately.
