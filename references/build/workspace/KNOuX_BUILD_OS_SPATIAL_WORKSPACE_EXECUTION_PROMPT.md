# KNOuX Build OS — Spatial Workspace Execution Prompt

CONTINUE THE EXISTING KNOuX STORE PROJECT.

THIS IS AN IMPLEMENTATION TASK.
DO NOT RETURN A DESIGN PLAN AND STOP.
DO NOT RESTART THE BUILD OS FROM SCRATCH.
DO NOT DISCARD THE EXISTING IN-PROGRESS BUILD OS WORK.

PROJECT ROOT:
`D:\Knoux Store`

REPOSITORY:
`daynightae-cmyk/knoux-store`

TARGET ROUTE:
`/build`

CURRENT HANDOFF OBSERVATION AT REFERENCE CREATION:
- branch: `feat/knoux-build-os`
- HEAD at that moment: `484bba7382b1c6d04735daa34f90954c1a15e45f`
- origin/main at that moment: same SHA
- working tree was DIRTY with active Build OS implementation work

THE ABOVE SHA IS HISTORICAL HANDOFF CONTEXT ONLY.
DO NOT ASSUME IT IS STILL CURRENT.
FIRST ACTION IS A REALITY REFRESH.

## Mandatory specialist references

Read these completely before editing:

`references/build/workspace/KNOuX_BUILD_OS_SPATIAL_WORKSPACE_BLUEPRINT.md`
`references/build/workspace/knoux-spatial-workspace-reference.html`

Also read all existing Build references:

`references/build/KNOuX-build-composer-orb-reference.md`
`references/build/KNOuX_BUILD_COMPOSER_ORB_IMPLEMENTATION_PROMPT.txt`
`references/build/KNOuX_BUILD_COMPOSER_ORB_CONTINUATION_PROMPT.txt`

The new spatial references are SPECIALIST AUTHORITIES for the /build workspace interaction model.
They are NOT new global design authority.
The accepted KNOuX Hero remains the global visual ancestor.

## 1 — Reality refresh

Before changing anything:

```powershell
cd "D:\Knoux Store"
git status
git branch --show-current
git rev-parse HEAD
git remote -v
git fetch origin --prune
git rev-parse origin/main
git log -12 --oneline --decorate
git worktree list --porcelain
```

Then inspect the complete current diff.

Classify all dirty files.

Current expected in-progress areas may include:
- `src/app/build/page.tsx`
- `src/app/api/build/`
- `src/components/build/surfaces/`
- `src/components/build/workspace/`
- `src/lib/build/`
- `tests/build-os.test.mjs`

These are NOT disposable experiments merely because they are uncommitted.

DO NOT:
- reset them
- restore them away
- create a replacement branch to evade integration
- create BuildOSV2
- duplicate the workspace architecture
- overwrite work without reading it

If another process/agent is actively editing the same worktree, avoid conflicting write concurrency.

## 2 — Read current implementation before redesign

Read completely:
- `src/app/build/page.tsx`
- `src/components/Composer.tsx`
- `src/components/build/*`
- `src/components/build/workspace/*`
- `src/components/build/surfaces/*`
- `src/lib/build/**/*`
- `tests/build-os.test.mjs`
- relevant global CSS/tokens

Determine what from the previous Build OS sprint is already functional.

PRESERVE REAL FUNCTIONALITY.
The goal is to transform the PRESENTATION AND INTERACTION MODEL around that work, not throw it away.

## 3 — Exact transformation

The current /build page must become a SPATIAL ENGINEERING WORKSPACE.

The supplied reference source demonstrated a compelling pattern:
- persistent fixed stage
- evolving central visual
- scroll/scrub progression
- left-side live HUD
- right-side event/context panel
- vertical timeline with milestones
- large ambient stage typography
- small persistent controls
- deterministic motion
- visual changes tied to data/state

Adapt that grammar to KNOuX Build OS.

DO NOT copy:
- Earth
- climate story
- years 1880–2026
- temperature/CO2 metaphors
- source copy
- source color semantics
- source branding
- source CDN dependencies
- source audio system
- source random starfield
- literal 6000vh scrolling

The KNOuX version must use our engineering state.

The visual should communicate:
INTENT
→ ARCHITECTURE
→ BUILD
→ RUNTIME
→ VERIFY
→ GIT
→ RELEASE

The user should feel that the project itself is alive in the middle of the workspace.

## 4 — Default workspace overview

Create a default OVERVIEW / PROJECT CORTEX composition.

Preferred information zones:

TOP:
compact KNOuX Build context bar

LEFT / LOWER-LEFT:
real Project HUD

CENTER:
Living Project Core / Project Cortex visualization

RIGHT:
Execution Spine / draggable engineering timeline

RIGHT-CONTEXT:
selected milestone / diagnostic / evidence

BOTTOM:
restrained functional surface selector

BACKGROUND:
large editorial current-stage typography + architectural grid/field

Do not create a generic dashboard card matrix.

The negative space is intentional.
The center must breathe.

## 5 — Project HUD

HUD values must come from real state wherever available.

At minimum support truthful fields for:
- project/root
- current environment
- current branch
- HEAD SHA
- runtime status
- active workspace surface
- active Senshial mode
- selected provider/model when configured
- verification state

Truthful fallback values:
- NOT CONNECTED
- NOT RUN
- NOT VERIFIED
- UNCONFIGURED
- BLOCKED
- UNAVAILABLE

Do not put demo metrics in production.

No fake "98% ready".
No fake token counts.
No fake test count.
No fake latency.
No fake provider health.

## 6 — Execution Spine

Implement the vertical engineering timeline as a first-class component.

Suggested internal name:
`BuildExecutionSpine`

Stages:
1. INTENT
2. ARCHITECTURE
3. BUILD
4. RUNTIME
5. VERIFY
6. GIT
7. RELEASE

Required interaction:
- current indicator
- progress fill
- stage ticks
- hover/focus labels
- click stage
- pointer drag/scrub
- keyboard navigation
- touch support
- stage context update
- direct navigation to associated workspace state

The timeline must not hijack native scroll.
It must not create a 6000vh gimmick.
Use a bounded cinematic overview and/or normalized stage progress suitable for a real engineering tool.

When real execution history exists, show additional event marks for actual:
- commands
- tests
- commits
- CI events
- deployments

Never fabricate event marks.

## 7 — Living Project Core

The central visual replaces the source's globe.

It is NOT:
- Earth
- a planet
- a generic glowing sphere
- a random particle blob
- a second Build Orb
- a duplicate LivingParticleMark renderer

It should derive from current KNOuX identity and existing Build language.

Preferred concept:
a living computational model of the current project.

Potential visual layers:
- KNOuX mark geometry
- subsystem rings
- route/data/API connections
- active execution path
- verification ring
- selected subsystem focus
- restrained particle field
- evidence pulses

Every meaningful visual state should map to known state.

Examples:
- runtime active → subtle deterministic pulse
- failed verification → precise warning fracture/segment
- selected DATA subsystem → data ring emphasis
- selected TESTS → verification ring emphasis
- release verified → controlled closure/assembly

Do not encode unknown health as green.
Do not use random visual behavior.

Reuse existing identity primitives before creating new render infrastructure.

## 8 — Existing Composer and Orb

PRESERVE:
- existing Composer
- existing Build Composer Orb
- current registry matching
- current deterministic selection logic

The Composer remains PROJECT GENESIS.

The spatial workspace begins from or around the Composer.

A valid flow is:

COMMAND / COMPOSER
→ structured intent
→ project overview
→ architecture
→ functional surfaces
→ verification
→ release

Do not rebuild Orb physics.
Do not create a second Orb.
Do not replace accepted interactions unless a real bug is demonstrated.

## 9 — Functional workspace surfaces

Preserve/finish the real surfaces already being built.

Expected surface model:
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

The cinematic overview is the navigation/intelligence layer over the engineering system.
It must not replace actual tools with animation.

## 10 — Surface behavior

CODE:
- real editor or truthful read-only state
- selected path
- dirty state
- save only when ProjectAdapter allows write
- never fake local filesystem access

PREVIEW:
- real reachable runtime URL only
- viewport presets
- refresh
- runtime/console state when technically available
- show NO ACTIVE RUNTIME if absent

TERMINAL:
- real adapter-backed sessions only
- command, cwd, PID when available, exit code, stdout/stderr
- hosted mode without shell bridge = UNAVAILABLE
- never use prerecorded terminal output

SYSTEM:
- Project Cortex topology
- routes/components/APIs/data/tests/deployment from real sources
- nodes carry evidence/source

DATA:
- actual configured database adapter only
- no unrestricted client-side SQL
- no exposed service role credentials

TESTS:
- actual scripts/tooling only
- show command, exit code and counts when available

GIT:
- branch, SHA, dirty/staged/untracked/ahead/behind from real Git state
- separate local, committed, pushed, CI, merged and deployed

RELEASE:
- evidence-backed pipeline
- LOCAL → TEST → BUILD → COMMIT → PUSH → PR → CI → PREVIEW → MERGE → PRODUCTION

SENSHIAL:
- project intelligence layer
- ASK / PLAN / EXECUTE
- current mode always visible
- no hidden mutation

## 11 — State architecture

Do not create a second conflicting workspace store if one already exists.

Audit the current Build OS state code first.

Retain/normalize state domains around:
- project
- workspace
- execution stage
- runtime
- preview
- terminal
- AI/provider
- permissions
- Git
- verification
- selected evidence

Avoid scattered unrelated useState state if a coherent store/reducer already exists.

Persist only safe UI/project preferences.
Never persist raw provider secrets in client state.

## 12 — Provider and model truth

Keep provider access behind clean server-safe contracts.

A provider logo is not an integration.
A model dropdown is not execution.

Provider states:
- CONFIGURED
- UNCONFIGURED
- DEGRADED
- UNAVAILABLE

Model routing:
- MANUAL
- AUTO

AUTO routing decisions must be explainable:
- task class
- selected provider
- selected model
- reason

Do not silently change providers.

Never expose provider secret keys to the browser.

## 13 — Permission model

Preserve/implement explicit action classes:

READ
EDIT
RUN
INSTALL
DATABASE_WRITE
GIT_WRITE
DEPLOY

Sensitive changes must pass through permission-aware execution boundaries.

Do not rely on a decorative confirmation dialog while leaving mutation APIs unrestricted.

No unauthenticated arbitrary shell endpoint.
No arbitrary filesystem path write endpoint.
No arbitrary production SQL endpoint.

## 14 — Evidence panel

The source reference used an event card.

Transform this into an engineering context/evidence panel.

Depending on selection, it may show:
- stage description
- selected subsystem
- diagnostic
- latest command
- test result
- Git event
- CI state
- deployment evidence

Preferred structure:
CATEGORY
TITLE
FACTUAL DESCRIPTION
SOURCE / COMMAND / PATH
STATUS

When evidence is absent, say so.

## 15 — Large stage typography

The source uses a huge low-opacity year.

KNOuX should use the current engineering stage or selected subsystem:
INTENT
SYSTEM
BUILD
RUNTIME
VERIFY
GIT
RELEASE

It must remain atmospheric and non-obstructive.
It must not reduce editor readability when a functional surface is open.

## 16 — Motion

Use one KNOuX motion grammar.

Required:
- deterministic
- restrained
- meaningful
- interruptible
- reduced-motion aware
- visibility aware
- performance bounded

Do not use Math.random() for branded geometry.

Use deterministic seeds/constants if a particle field is needed.

Do not create React setState loops for pointer movement.

Avoid independent RAF loops per component.

If a central visual already owns a render loop, integrate carefully rather than adding another heavyweight full-screen loop.

Pause or reduce motion when:
- document.hidden
- offscreen
- reduced motion
- low performance tier

## 17 — Performance

Target modest integrated Windows GPUs.

Audit:
- WebGL contexts
- Canvas DPR
- particle counts
- animation loops
- pointer/scroll listeners
- graph rendering
- code editor bundle
- terminal bundle
- lazy loading
- resource disposal

Prefer the cheapest technology that achieves the visual result.

Do NOT assume Three.js is required simply because the source used Three.js.

DOM/CSS/Canvas 2D is acceptable and often preferable for overview motion.

Heavy surfaces should be dynamically imported where practical.

## 18 — Responsive design

Verify at minimum:
- 1600x1000
- 1440x900
- 1366x768
- 1024x768
- 768x1024
- 430x932
- 390x844
- 375x812

Desktop:
- spatial overview may expose multiple contextual zones
- functional mode may support one or two panes

Tablet:
- simplify simultaneous regions

Mobile:
- one primary engineering surface at a time
- compact project HUD
- readable selected-stage context
- reduced/anchored project core
- accessible stage selector
- compact surface navigation

Do not squeeze a desktop IDE into 390px.

No horizontal document overflow.

## 19 — Accessibility

The spatial experience must remain a real application.

Verify:
- keyboard reachability
- visible focus
- semantic tabs/buttons
- ARIA state for selected surfaces/stages
- accessible stage names
- touch targets
- reduced motion
- screen-reader text for non-text visual state
- no hover-only actions
- no pointer-only stage navigation

Canvas/WebGL is presentation only.
Essential state must exist in DOM.

## 20 — Visual language

Use current KNOuX design tokens and identity.

Target:
- deep black
- graphite
- off-white
- platinum
- restrained violet
- precision lines
- controlled glow
- technical editorial typography
- large negative space
- structural asymmetry
- evidence-first labels

Reject:
- generic purple dashboard
- glass-card wall
- gaming HUD
- cyberpunk overload
- rainbow gradients
- generic AI sparkle UI
- decorative fake telemetry
- random blobs
- cloned source palette

The final experience should feel related to:
- accepted Hero
- Living Mark
- Composer
- Build Orb

Same institution.
Different function.

## 21 — Reference code status

`knoux-spatial-workspace-reference.html` is a DESIGN/INTERACTION PROTOTYPE.

Do not copy it wholesale into production.
Do not ship its hardcoded branch value.
Do not ship its static verification/runtime labels as facts.

Extract:
- composition
- progression
- stage scrubber mechanics
- HUD hierarchy
- deterministic visual field
- mobile strategy

Replace prototype values with current application state.

## 22 — Error/empty states

Every major engineering surface requires:
- LOADING
- READY
- EMPTY
- UNCONFIGURED
- BLOCKED
- ERROR

No eternal spinner.
No mysterious empty black pane.
No fake success.

## 23 — Tests

Add/update targeted tests for deterministic behavior.

Prioritize:
- stage model
- stage-to-surface mapping
- execution spine keyboard behavior
- truthful status rendering
- adapter capability gating
- provider configured/unconfigured states
- permission gating
- verification aggregation
- no fake PASS fallback
- reduced-motion branch if testable

Do not write brittle tests for exact decorative particle positions.

Preserve existing Build OS tests.

## 24 — Runtime inspection

After implementation, run one known application server.

Do not leave multiple mystery Next.js servers.

Record:
- command
- PID
- port
- URL
- relevant log path/output

Inspect the actual /build route.

Check:
- visual composition
- stage scrubber
- click/drag
- keyboard
- surface transitions
- code surface
- preview state
- terminal state
- System/Cortex
- Tests
- Git
- Release
- Senshial
- console
- hydration
- network failures
- layout
- mobile

The page must be usable, not merely cinematic.

## 25 — Required local gates

Inspect package.json and use canonical scripts.

Expected gates where defined:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

For each command record:
- exact command
- exit code
- factual result

If a script is not defined:
report SCRIPT NOT DEFINED.
Do not invent PASS.

Classify failure as:
A — introduced by this sprint
B — pre-existing
C — external/environment

Fix all A.
Do not hide B or C.

## 26 — Browser acceptance

At minimum verify:
- 1600x1000
- 1440x900
- 1366x768
- 1024x768
- 768x1024
- 430x932
- 390x844
- 375x812

Required observations:
- header remains intact
- no regression in global nav
- no clipped workspace
- no document-level horizontal overflow
- execution spine remains reachable
- current stage is understandable
- HUD values remain readable
- project core never blocks controls
- functional surfaces remain usable
- keyboard focus is visible
- reduced motion remains coherent
- hidden tab reduces/stops decorative animation

## 27 — Security review

Especially inspect new/changed:
- build API routes
- local/remote adapter seams
- provider routes
- terminal execution
- filesystem operations
- database operations
- Git mutations

Verify:
- no command injection
- no arbitrary unauthenticated command execution
- no path traversal
- no unrestricted arbitrary file write
- no secret exposure
- no credential logging
- no raw HTML from terminal/AI output
- no open proxy/SSRF
- no service-role key in browser
- mutation routes have authorization/capability enforcement

Do not weaken security to make a button appear functional.

## 28 — Regression boundary

Do not redesign unrelated routes.

Do not regress:
- accepted Home Hero
- global header/navigation
- About
- Work
- Products
- WordPress
- current Composer
- current Build Orb
- LivingParticleMark
- mobile nav
- global search

The spatial source is specialist authority for Build OS only.

## 29 — Documentation closure

Update:
`references/build/workspace/KNOuX_BUILD_OS_SPATIAL_WORKSPACE_BLUEPRINT.md`

Add a factual implementation section after completion:
- implemented components
- actual state sources
- accepted mechanics
- rejected mechanics
- performance decisions
- capability blockers
- verification evidence

Do not rewrite the source/reference prototype as if it were production code.

## 30 — Git delivery

Once implementation and local verification are factual:

```powershell
git status
git diff --check
```

Review the complete diff.

Do not commit unrelated user work accidentally.

Create logical commit(s) on the existing feature branch.

Push the SAME branch.

Open/update the PR targeting:
`main`

PR description must include:
- starting main SHA
- ending feature SHA
- spatial workspace architecture
- current Composer/Orb preservation
- Execution Spine
- Project HUD
- Living Project Core
- functional surface integration
- provider/model state
- permission behavior
- performance
- accessibility
- security
- local gates
- browser QA
- known real blockers

## 31 — CI and merge

Do not call PR creation completion.

Wait for actual required CI on the exact feature HEAD.

If CI fails:
- inspect real failure
- fix on same branch
- push
- wait again

Merge only when:
- exact feature HEAD is known
- PR is mergeable
- required CI is green
- typecheck is verified
- tests are verified
- build is verified
- diff check is verified
- no known security regression
- /build runtime QA is completed
- accepted Hero/Composer/Orb are not regressed

If external infrastructure remains unavailable, it may remain BLOCKED only if the UI is truthful and unrelated gates are green.

After merge:
- record merge SHA
- fetch origin/main
- verify exact final main SHA
- verify Vercel production corresponds to new main
- verify `https://knoux.store/build`
- verify representative global route(s)
- then update local main with ff-only

Do not claim production complete while Vercel is pending.

## 32 — Final status vocabulary

Use only:
- COMPLETE — implemented and verified
- PARTIAL — implemented but a defined verification is missing
- BLOCKED — requires genuine unavailable external infrastructure/configuration
- UNCHANGED — intentionally preserved and verified as correct

Do not use:
- mostly done
- basically complete
- should work
- probably fixed

## 33 — Final report

Return a factual closure dossier with:

REPOSITORY
- starting main SHA
- feature branch
- feature HEAD
- PR
- merge SHA
- final main SHA

SPATIAL WORKSPACE
- old composition
- new composition
- Execution Spine
- Project HUD
- Living Project Core
- stage/surface mapping

FUNCTIONALITY
- CODE
- PREVIEW
- TERMINAL
- SYSTEM
- DATA
- TESTS
- GIT
- RELEASE
- SENSHIAL

For each:
- implementation status
- capability source
- verification
- blocker if any

PROVIDERS
- implemented adapters
- configured providers
- unconfigured providers
- actual model routing state

TRUTH
- what is real
- what remains unavailable
- no fake integration claims

PERFORMANCE
- render technology
- WebGL/context count
- lazy loading
- reduced motion
- hidden-tab behavior
- mobile behavior

SECURITY
- terminal boundary
- filesystem boundary
- provider secret boundary
- database boundary
- Git mutation boundary

GATES
- command
- exit code
- result

BROWSER QA
- actual viewports tested
- console/runtime state
- accessibility observations

CI
- exact checked SHA
- result

PRODUCTION
- deployment state
- /build HTTP/runtime result
- final production SHA where provable

REMAINING BLOCKERS
- only genuine blockers

## 34 — Anti-fake-closure law

A component file is not evidence that the feature works.
A rendered button is not evidence that an integration works.
A provider name is not evidence that credentials exist.
A terminal-looking panel is not a terminal.
A local build is not CI.
Green CI is not proof of production runtime.
A deployment record is not proof the route renders correctly.

Every claim must carry the corresponding evidence.

## FINAL DIRECTIVE

START NOW.

DO NOT RETURN A ROADMAP.

READ THE CURRENT DIRTY BUILD OS WORK FIRST.
PRESERVE IT.
INTEGRATE IT.

USE THE NEW SPATIAL REFERENCES AS THE BUILD WORKSPACE INTERACTION AUTHORITY.

TRANSFORM /build FROM AN EMPTY/DASHBOARD-LIKE WORKSPACE INTO A DISTINCT KNOuX SPATIAL ENGINEERING ENVIRONMENT.

USE REAL PROJECT STATE.
USE REAL EVIDENCE.
USE TRUTHFUL UNAVAILABLE STATES.

NO CLIMATE RESKIN.
NO EARTH.
NO GENERIC IDE CLONE.
NO CARD WALL.
NO FAKE PROVIDERS.
NO FAKE TERMINAL.
NO FAKE GIT.
NO FAKE TESTS.
NO FAKE CI.
NO FAKE PRODUCTION.

IMPLEMENT.
RENDER.
INSPECT.
CORRECT.
TEST.
VERIFY.
COMMIT.
PUSH.
PR.
CI.
MERGE ONLY WHEN GREEN.
VERIFY PRODUCTION.
RETURN THE EXACT FINAL SHA.