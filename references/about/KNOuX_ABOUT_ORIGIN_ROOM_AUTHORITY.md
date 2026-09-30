# KNOuX About — Origin Room Reference Authority

Status: SPECIALIST INTERACTION REFERENCE ONLY.
Scope: /about opening experience.
It is NOT global design authority and must NOT override the accepted KNOuX visual system.

## Source artifacts
- references/about/quiet-room-specialist-reference.html
- references/about/quiet-room-scene-mechanics-reference.md
- references/about/quiet-room-source-scene.full-source.txt — FULL 5,942-line user-supplied scene source, preserved read-only for direct implementation study.

IMPORTANT:
The full scene logic is now available for behavior study.
We intentionally preserve only the implementation-relevant mechanics in the repository,
rather than copying the source project's game content, assets, audio, branding, or Vite configuration.

Verified source behavior:
- Begin calls beginExploration().
- Begin changes phase from opening to exploring and removes the intro overlay.
- The source lamp is already ON before Begin; Begin does not switch the lamp on.
- The apparent reveal is primarily phase/overlay transition plus the already-lit Three.js scene.
- KNOuX will intentionally improve this into a real staged lighting wake-up after ENTER KNOuX.
## Existing KNOuX authority

Read before editing:
- references/about/LIVING_IDENTITY_CLOSURE.md
- src/app/about/page.tsx
- src/components/AboutOriginRoom.tsx
- src/components/three/LivingParticleMark.tsx
- src/lib/knouxMark.ts
- src/app/globals.css
- package.json
- next.config.ts

The canonical KNOuX mark geometry,
existing visual tokens,
existing motion grammar,
and current truthful About copy remain authoritative.

The reference is for interaction mechanics only.
## Mechanics we MAY adapt

- immersive dark opening
- one deliberate ENTER action
- reveal from darkness after entry
- progressive environmental illumination
- spatial focus / inspect behavior
- restrained object information card
- exploratory hint
- cinematic negative space
- room-like composition
- staged awakening

## Target adaptation

KNOuX / THE ORIGIN ROOM

Before entry:
- near darkness
- minimal KNOuX signal
- ENTER KNOuX action
- no timer, no game framing
After entry:
- the space wakes progressively
- the desk lamp is the first meaningful physical light source, matching the user's reference intent
- platinum / silver / off-white illumination spreads from the lamp across the workbench and room
- architectural objects emerge gradually
- the canonical LivingParticleMark assembles after the lamp begins revealing the space
- muted violet remains a restrained KNOuX signal accent, not the main room light
- the mark becomes the institutional identity inside the room rather than a giant replacement for the room

Desired sequence:
DARKNESS
→ SIGNAL
→ LIVING MARK
→ LIGHT
→ ARCHITECTURE
→ INFORMATION

The Living Mark must never become a generic orb or alternate logo.
## Semantic object mapping

Use no more than five meaningful objects:

1. Living Mark — WHO WE ARE
2. Workbench / Terminal — WHAT WE BUILD
3. Archive / Records — VERIFIED WORK
4. Blueprint / Schematics — HOW WE BUILD
5. Founder Signature / Object — FOUNDER

Founder label:
Sadek Elgazar
Founder & Software Developer — KNOuX

Cards must use truthful current project data only.
No invented clients, ROI, downloads, users, awards, revenue, or outcomes.
## Reject from the source

Do NOT copy:
- source branding
- timer
- prize
- one-word question game
- restart game
- game HUD
- gold/brown palette
- source copy
- source layout wholesale
- external Google Fonts / Typekit dependency
- hidden native cursor as a requirement
- permanent overflow:hidden on the About page

The source uses cursor:none.
KNOuX should preserve accessible pointer behavior unless an already-approved KNOuX interaction replaces it safely.
## Source configuration boundary

The source project is Vite-based.
KNOuX Store remains Next.js.

Do not copy source build configuration, dev-server CSP relaxations,
runtime CDN assumptions, or external font dependencies into KNOuX.
## Page architecture

The Origin Room is the About OPENING EXPERIENCE,
not the entire information architecture.

Below the immersive opening, preserve semantic DOM content for:
- institutional point of view
- verified Work records
- divisions
- truthful registry counts
- engineering / build continuation

Essential information must remain available without Canvas/WebGL.

## Performance / accessibility

- progressive enhancement
- reduced-motion support
- keyboard-operable entry and object selection
- visible focus states
- touch fallback
- no hover-only essential interaction
- adaptive DPR / particle budget
- pause offscreen and when document.hidden
- avoid unnecessary second heavyweight WebGL scene
- no runtime CDN dependencies
- no external font dependency
## Acceptance

The result must feel like entering the KNOuX institution,
not playing a mini-game.

Same KNOuX DNA.
Different About function.

The existing About truth model must survive.
The existing canonical mark must survive.
The accepted global KNOuX identity must survive.