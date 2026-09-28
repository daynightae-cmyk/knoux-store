# KNOuX Build Composer Orb — Specialized Reference

## Authority and scope

This reference is ONLY for the KNOuX /build Composer experience.
It is not a global design authority.
It must not replace the accepted homepage Hero, Product Universe, Auth scene, or navigation.
The existing Composer logic and registries remain authoritative.

## Current implementation reality

Current route:
- src/app/build/page.tsx

Current engine:
- src/components/Composer.tsx
- src/data/composer-rules.ts

The existing Composer is deterministic.
It resolves the visitor's sentence against real KNOuX registries.
It does not estimate price, delivery time, or outcome.
That behavior MUST remain intact.

## What the supplied 3D source actually contains

The source demonstrates:
- a Three.js Scene + PerspectiveCamera + WebGLRenderer
- ACES filmic tone mapping
- damped OrbitControls
- icon sprites generated from local SVG path data
- a Fibonacci-sphere distribution
- inner and outer spherical layers
- slow group rotation
- small per-node floating motion
- CanvasTexture-based icon rendering
- a central prompt input
- smooth position interpolation
- a 3D object that can be dragged/orbited

These mechanics are useful as interaction reference only.

## Explicit source defects / rejected behavior

DO NOT copy:
- Math.random() topology
- random icon assignment
- random palette assignment
- shuffleGlobe()
- rebuildAllIconTextures()
- fake semantic response to typed text
- Google Fonts runtime injection
- generic blue/mint/peach/rainbow identity
- dark/light theme toggle from the demo
- direct document.body mutation as architecture
- full-window renderer ownership
- wheel zoom that steals page scroll
- 700 sprites as a fixed requirement
- fake AI interpretation
- decorative nodes with no registry meaning

The supplied demo changes the globe randomly after text submission.
KNOuX must NEVER imply that random reshuffling represents semantic reasoning.

## KNOuX adaptation goal

Create a Build Intelligence Orb inside /build.

The orb visualizes the REAL Composer result.
It never generates the result itself.

Flow:

VISITOR INTENT
→ evaluateComposer()
→ verified matches / entityIds / stack
→ KNOuX Build Intelligence Orb
→ editable real stack
→ structured build request

## Scene identity

Visual language:
- deep KNOuX black
- graphite
- off-white
- platinum / silver
- restrained KNOuX violet
- very limited cool-violet bloom

No rainbow taxonomy.
No SaaS neon.
No blue dashboard aesthetic.
No unrelated gradients.

The scene must feel like the same institution as the accepted KNOuX Hero.

## Orb composition

Center:
- KNOuX / Composer nucleus
- not a fake AI brain
- not a chatbot avatar

First ring:
- real divisions represented only when relevant

Canonical Composer division order:
1. Solutions
2. Software
3. WordPress
4. Web
5. Growth
6. Creative

Outer nodes:
- only entities returned by the real Composer stack
- plus entities manually added by the user
- removed entities disappear from the visual state

Every node must map to a real DiscoverableEntity id.

## Deterministic topology

Node position MUST be stable.

Use a deterministic seed derived from:
- entity.id
- division
- stable index

Acceptable:
- small deterministic hash function
- seeded PRNG with fixed seed per entity

Forbidden:
- Math.random()
- render-time random placement
- random re-layout on refresh

The same Composer result must resolve to the same spatial composition.

## Interaction model

Idle:
- quiet KNOuX nucleus
- subtle orbital motion
- no fake service nodes

Typing:
- restrained energy response only
- do not claim semantic recognition before Assemble
- no fake live recommendations

Assemble:
- existing evaluateComposer() runs
- resolved divisions emerge
- real matched entities travel into stable positions
- connector arcs resolve between nucleus → division → entity
- matched paths brighten
- unrelated space stays quiet

Manual add/remove:
- orb updates from the same stack state
- deterministic spatial transition
- no unrelated reshuffle

Empty result:
- no invented nodes
- quiet nucleus
- existing honest empty-state copy remains available

## Node behavior

Pointer hover:
- restrained halo
- entity shortName / division hint
- no tooltip spam

Click / tap:
- select the same real entity represented in Composer
- expose its existing summary / route
- do not create a parallel data source

Keyboard:
- semantic DOM controls mirror canvas nodes
- visible focus
- Enter / Space activates
- information must not depend on hover

## Orbit / drag behavior

Desktop:
- drag to rotate
- damping enabled
- no pan
- no wheel zoom
- page scroll must remain native
- subtle automatic drift only while visible

Touch:
- single-finger page scroll remains primary
- use explicit drag area or controlled gesture
- tap nodes to inspect
- avoid accidental scroll trapping

Reduced motion:
- static deterministic composition
- no auto rotation
- no floating
- no spring travel
- all information remains available

## Sprite / icon system

The supplied SVG icon-path technique may be adapted.
Icons must become semantic and registry-backed.

Prefer:
- division icon mapping
- capability icon mapping
- service/system icon mapping

Do not assign icons randomly.

Reuse local icon geometry already present in the project when possible.
Do not fetch icon packs at runtime.

## Data contract

Primary truth:
- evaluateComposer()
- DiscoverableEntity
- composerFallbacks()
- existing division labels/routes
- existing registry data

The 3D layer receives serializable visual data derived from the current stack.

Suggested visual node contract:

type ComposerOrbNode = {
  id: string;
  code: string;
  label: string;
  division: DivisionId;
  route?: string;
  summary: string;
  selected: boolean;
  reason?: string;
};

Do not duplicate service/product truth inside the 3D component.

## Recommended component boundary

Add a specialized component such as:
- src/components/build/BuildComposerOrb.tsx

Optional supporting files:
- src/components/build/orb-layout.ts
- src/components/build/orb-icons.ts
- src/components/build/orb-types.ts

Composer.tsx remains owner of:
- input
- evaluation
- selected stack
- removed ids
- manually added ids
- request flow

BuildComposerOrb receives the derived state as props.

## Rendering strategy

Reuse the project's existing Three.js / React Three Fiber stack.
Do not create a second framework.

One Build orb Canvas maximum on /build.
Lazy-load the 3D scene.
Do not render it on routes that do not need it.

Pause or reduce rendering when:
- document.hidden
- orb is offscreen
- reduced motion is enabled

Use adaptive DPR and a sane upper bound.
Dispose textures/materials/geometries on unmount.

## Performance budget

Do not inherit the demo's fixed 700-sprite design.

Start from the data:
- one nucleus
- relevant division nodes
- matched entity nodes
- restrained ambient particles if budget allows

Node count should be proportional to real content.

Target:
- smooth on integrated GPUs
- no permanent high-DPR rendering
- no React state update on every pointer move
- no per-node independent RAF loops

## Layout inside /build

Do not replace the whole Build page.

Preferred composition:
- keep PageIntro
- turn the current Composer input block into the control surface
- place the Orb as the central visual intelligence layer
- preserve the detailed stack readout below / beside it
- preserve manual add/remove
- preserve Build Request

The orb is not decoration.
It is the spatial visualization of the existing deterministic result.

## Mobile

Do not shrink desktop blindly.

Mobile should:
- keep the input first
- use a compact orb
- reduce labels/connectors
- disable wheel/orbit assumptions
- expose result nodes through an accessible list
- preserve add/remove and Build Request
- have zero horizontal overflow

If GPU capability is insufficient:
- fall back to SVG / DOM constellation
- preserve the same data and selection state

## Accessibility

Canvas is progressive enhancement.

Provide:
- semantic heading
- accessible description
- DOM list for real nodes
- keyboard-equivalent node selection
- visible focus
- reduced-motion path
- no essential information only inside WebGL

## Truthfulness rules

Never show:
- fake confidence
- fake percentage
- fake completion
- fake cost
- fake duration
- fake delivery date
- fake AI reasoning
- fake service
- fake product
- fake telemetry

The visual must represent only what the existing Composer can prove.

## Acceptance bar

PASS only if:
- same input gives same topology
- Assemble still uses evaluateComposer()
- add/remove stays synchronized
- empty input/result stays honest
- page scroll is not trapped
- no runtime external font/icon CDN
- no Math.random() in the Build orb path
- desktop pointer interaction works
- touch works
- keyboard equivalent exists
- reduced motion works
- no horizontal overflow
- no console errors
- no fake entities
- build gates pass

This reference is a specialist interaction reference.
KNOuX identity and the current project architecture remain the higher authority.

