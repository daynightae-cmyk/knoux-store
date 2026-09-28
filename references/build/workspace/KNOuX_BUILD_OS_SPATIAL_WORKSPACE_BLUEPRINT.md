# KNOuX Build OS — Spatial Workspace Blueprint

## Authority

This reference is a specialist interaction authority for the existing `/build` route only.
It does not replace the accepted global KNOuX Hero, global navigation, product system, or existing Composer/Orb contracts.

The user supplied a long-form interactive "Pale Blue Dot" HTML experience as the source mechanic.
Do not copy its climate data, Earth imagery, colors, copy, audio narrative, CDN usage, or branding.
Extract its interaction grammar and remap that grammar to real KNOuX Build OS state.

Companion implementation reference:
`references/build/workspace/knoux-spatial-workspace-reference.html`

## Core transformation

The source experience uses:
- a fixed full-screen stage
- a long scroll narrative
- a persistent data HUD
- a vertical draggable timeline
- event markers
- an evolving central visual
- large background typography
- contextual event copy
- deterministic state interpolation
- mobile recomposition
- reduced-motion behavior

KNOuX Build OS shall translate those mechanics into:
- fixed spatial engineering stage
- evidence-backed project lifecycle
- live project HUD
- execution spine / scrubber
- engineering milestone markers
- living KNOuX project core
- large current-stage typography
- evidence/diagnostic context panel
- deterministic workspace state transitions
- real functional surfaces layered into the stage

## Domain mapping

| Source mechanic | KNOuX Build OS meaning |
| --- | --- |
| Year | Current engineering phase / execution sequence |
| Temperature | Never copy. Use actual verification state only |
| CO2 | Never copy. Use actual complexity/dependency evidence only if measurable |
| Earth | Living KNOuX Project Core |
| Event cards | Build milestone / diagnostic / verification evidence |
| Timeline | Execution Spine |
| Sparkline | Verification trace / command history, only from real records |
| Intro overlay | Project Genesis / Command Deck |
| Closing overlay | Release / production closure |
| Starfield | restrained KNOuX computational field |
| Birth personalization | project/session context, never personal gimmickry |
| Sonification | optional future enhancement; no autoplay audio in current build |

## Canonical engineering stages

The initial visual sequence should resolve around these real stages:

1. INTENT
2. ARCHITECTURE
3. BUILD
4. RUNTIME
5. VERIFY
6. GIT
7. RELEASE

These are not decorative chapters.
Each stage must have a direct path into a functional surface or a truthful unavailable state.

## Workspace surfaces

The stage must support:
- OVERVIEW
- CODE
- PREVIEW
- TERMINAL
- SYSTEM
- DATA
- TESTS
- GIT
- RELEASE
- SENSHIAL

Desktop may use one or two simultaneous surfaces.
Do not build arbitrary nested panes in this sprint.
Mobile uses one primary surface at a time.

## Spatial composition

The default overview should feel like one machine:
- top: compact Build context bar
- left/bottom-left: live project HUD
- center: Living Project Core / Project Cortex
- right: Execution Spine
- context side: selected milestone/evidence
- bottom: restrained surface rail
- background: large stage label and architectural field

Do not fill the screen with independent cards.

## Living Project Core

The central object is not a planet and not a generic orb.
It should be derived from existing KNOuX identity and current Build Composer language.

It should communicate project state through restrained, deterministic changes:
- topology density
- active connection emphasis
- verification rings
- selected subsystem focus
- runtime pulse
- error/failure fracture or warning state
- release closure state

Never encode unverifiable health as a decorative glow.
Visual state must map to known state.

## Execution Spine

The right-side vertical control is a core interaction.

It should:
- display canonical engineering stages
- expose milestone ticks
- support click
- support drag/scrub
- support keyboard interaction
- never hijack page scroll
- expose accessible stage labels
- show current stage
- allow direct navigation to the associated surface

When real execution history exists, additional ticks may represent:
- command runs
- tests
- commits
- CI checks
- deployment

Do not fabricate historical ticks.

## HUD truth model

Recommended live fields:
- project
- active environment
- branch
- HEAD SHA
- runtime
- active provider/model
- permission mode
- verification summary

Use actual values where available.
If missing, use truthful states:
- NOT CONNECTED
- NOT RUN
- UNCONFIGURED
- BLOCKED
- NOT VERIFIED

Never replace missing values with demo numbers in production.

## Senshial placement

KNOuX Senshial should be integrated as project intelligence, not a floating chatbot.
The selected project state, file, diagnostic, diff, terminal output, or stage becomes context.

Modes remain explicit:
- ASK
- PLAN
- EXECUTE

The mode must be visible before any action.

## Reference mechanics to reject

Do not carry forward:
- climate content
- Earth textures
- thousands of random stars
- runtime CDN dependencies
- 6000vh literal scroll length
- autoplay audio
- hidden fake telemetry
- Math.random branded geometry
- huge mobile scroll traps
- decorative metrics without evidence
- copied warm/cool climate color semantics

Use the interaction grammar, not the original subject matter.

## Performance rules

This surface must remain usable on modest integrated GPUs.

Required:
- one visual field only; avoid multiple full-screen WebGL contexts
- prefer DOM/CSS/Canvas 2D where it achieves the design
- lazy-load heavy surfaces such as Monaco, graph libraries, database tools
- cap DPR
- stop/reduce offscreen or hidden animation
- no React state updates on every pointer movement
- deterministic particle positions
- no external runtime assets for identity
- dispose resources on unmount
- honor prefers-reduced-motion

## Mobile

Do not shrink the desktop IDE.

Mobile overview:
- compact project header
- reduced central visual
- readable HUD
- stage selector
- one active functional surface
- bottom or sheet-based surface navigation

Execution Spine may move to an edge or convert into a compact vertical stage rail.
No horizontal document overflow.

## Functional boundary

The cinematic overview is an interface to real tools.
It is not a substitute for them.

CODE must connect to real ProjectAdapter capabilities.
PREVIEW must use a real reachable runtime.
TERMINAL must show unavailable if no shell bridge exists.
GIT must derive from real Git state.
TESTS must derive from actual configured test commands.
RELEASE must separate local, pushed, CI, merged and production states.

## Visual acceptance

The result should feel like:
"KNOuX opened into an engineering instrument."

It must not feel like:
- VS Code with a black skin
- a generic SaaS dashboard
- a climate-demo reskin
- a collection of cards
- a Three.js demo with controls bolted on

The accepted KNOuX Hero remains the visual ancestor.
Same DNA, different function.

## Final principle

TRUTH > DECORATION.

Unknown state remains unknown.
Unconfigured state remains unconfigured.
Local success is not CI.
CI success is not production.
A rendered control is not proof that its integration exists.

---

# Implementation record

Branch: `feat/spatial-build-workspace`. Baseline `main`: `b21bad2`.
Route: `/build`.

## Implemented components

| Component | File | Role |
| --- | --- | --- |
| `SpatialWorkspace` | `components/build/spatial/SpatialWorkspace.tsx` | The composition: context bar, HUD, core, spine, evidence, surface rail, ambient typography |
| `ProjectCore` | `components/build/spatial/ProjectCore.tsx` | Canvas 2D living project core |
| `ExecutionSpine` | `components/build/spatial/ExecutionSpine.tsx` | Seven-stage vertical timeline |
| `ProjectHud` / `EvidencePanel` | `components/build/spatial/ProjectHud.tsx` | Live HUD and evidence panel |
| stage model | `lib/build/stages.ts` | Seven canonical stages, pure |
| spatial math | `lib/build/spatial.ts` | Clamp, spine geometry, deterministic field, rings, posture |

## Actual state sources

Every value on the stage is read from resolved adapter state. No value is authored.

- HUD, topbar: `adapter`, `project`, `git`, `runtime`, `ai`, `environment` from the workspace store.
- Evidence panel: per-stage facts, including real Git SHAs, real graph node and edge counts, real exit codes, and the exact capability blocker where one applies.
- Core rings: `graph.nodes` counted per domain, relative to the busiest domain.
- Core outer ring: the verification aggregate, folded through `toRingState`.
- Subsystem buttons: `graph.nodes` counts. A domain with zero nodes is disabled rather than invented.

## Accepted mechanics

- Bounded, normalised stage progress owned by the workspace store, added to the existing reducer rather than a second store.
- Click, pointer-capture drag, and full keyboard navigation (arrows, Home/End, PageUp/PageDown) on a vertical `tablist`.
- Deterministic golden-angle field, no entropy.
- Ambient stage typography behind the core.
- Mobile recomposition: the spine becomes a horizontal rail and the layout becomes one surface at a time.

## Rejected mechanics

Explicitly taken from the reference prototype and **not** carried forward:

| Reference mechanic | Decision |
| --- | --- |
| 6000vh scroll space | Rejected. The stage is `clamp(560px, 86vh, 940px)` and the page scrolls normally. |
| `scrollTo` inside the scrub handler | Rejected. The spine never drives window scroll. A regression test asserts no `scrollTo`, `scrollBy`, `scrollIntoView` or scroll listener exists. |
| Scroll-driven timeline | Rejected. Progress is owned by the component, not the document. |
| Earth / climate content | Rejected. No planet, no temperature, no CO2. |
| 120-point starfield | Adapted, not copied: a deterministic field of 150 points whose emphasis follows real domain selection. |
| Three.js for the central visual | Rejected. Canvas 2D. The site already owns WebGL contexts for the Orb and the Living Mark; a third is the wrong trade. |
| Autoplay audio | Rejected. No audio at all. |
| Hardcoded branch and verification labels | Rejected. Every label is read from state. |
| Warm/cool climate palette | Rejected. KNOuX tokens only. |

## Performance decisions

- **Render technology:** Canvas 2D, not WebGL. Zero additional WebGL contexts.
- **One loop.** A guarded `ensureRunning` is the single starter; `tick` re-arms itself. An earlier draft had five unguarded `requestAnimationFrame(tick)` call sites, which could start concurrent chains. A test now fails if that returns.
- **DPR** capped at 1.5.
- **Hidden tab** stops the loop. **Offscreen** stops the loop via `IntersectionObserver`.
- **Reduced motion** freezes elapsed time, so amplitude is exactly 0 and the shape is static.
- **No pointer or scroll listeners** added by the spatial layer.
- **Lazy:** the core and spine are plain DOM/Canvas; no editor, graph or database dependency was added.
- **Payload:** the spatial stage adds no third-party runtime asset and no CDN dependency.

## Capability blockers

Unchanged from the previous sprint, and restated rather than hidden:

- Terminal — no shell in a hosted deployment.
- Project write and Git write — no mutation method exists on the adapter.
- Database — no connection, no adapter.
- AI providers — 0 of 8 configured; none implements `execute`.
- Verification runner — disabled unless `KNOUX_BUILD_ALLOW_VERIFY=1`.
- Deploy — owned by the pipeline.

A stage whose capability is missing stays reachable on the spine and opens the surface, which then states the blocker. The spine marks it with a dashed amber tick rather than hiding it.

## Verification evidence

- Stage model, spine geometry, ring derivation, posture and the no-fake-pass rules are covered by `tests/spatial-workspace.test.mjs`.
- `not-applicable` folds to `not-run` and renders identically. A test asserts the two rings are deep-equal, so absence can never be drawn as success.
- Browser QA at 1600, 1440, 1366, 1024, 768, 430, 390 and 375: zero horizontal overflow, zero console errors, zero page errors.
