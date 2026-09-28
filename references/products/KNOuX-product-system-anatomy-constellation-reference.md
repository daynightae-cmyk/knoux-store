# KNOuX Product System Anatomy Constellation

ROLE:
Specialized interaction reference for /products/[slug] only.

PURPOSE:
Turn verified product structure into an explorable 3D system-anatomy block.

DO NOT use it as:
- global hero
- /products universe replacement
- product loader replacement
- site-wide visual authority

SOURCE MECHANICS TO ADAPT:
- deterministic point lattice
- semantic nodes embedded in the field
- hover emphasis
- click/tap selection
- selected-path highlighting
- camera reframing
- detail panel update
- screen-space picking
- bounded orbit with damping
- idle camera drift
- selected-state dimming
- relation signal animation
- offscreen and hidden-tab pause

KNOuX DATA AUTHORITY:

Primary truth:
- src/data/software.ts
- current ProductDossier data flow
- existing product visual profiles

Allowed node meanings:
- CORE: product identity
- CAPABILITY: verified capability/cluster
- TECHNOLOGY: registry technology
- BOUNDARY: limitation/safety constraint
- EVIDENCE: repository artefact
- RELATED: relatedIds resolved to real products

Do not pad node counts.
If a product has 5 meaningful verified concepts, render 5.
Never invent density.

VISUAL CONTRACT:

Use existing KNOuX tokens:
- #08090a background
- #101113 / #16171a surfaces
- #f1eee8 off-white
- #e6e2da platinum
- #b8b5b4 silver
- #a18acb restrained violet
- #c2b5d8 selected signal
- #292a2d structural lines
- #51455b connector violet-gray

No imported palette from the reference.

PRODUCT MOTIFS:
- ONE: system nucleus / modular operating field
- Forge: repository/dependency lattice
- Repair: diagnostic/service lattice
- SmartOrganizer: file/storage clusters
- REC: capture/timeline topology
- Player X: playback/signal topology
- Clipboard AI: guarded flow/privacy gates

INTERACTION CONTRACT:

Idle:
- subtle deterministic field motion
- gentle bounded camera drift

Hover:
- restrained halo/scale
- local path highlight
- no essential hover-only information

Select:
- selected node dominates
- unrelated field dims
- related pathways brighten
- camera reframes to selected node
- real info panel updates
- optional relation signal travels to a related node

Clear:
- Escape or clear control
- panel closes
- camera returns to neutral after delay

Desktop:
- drag orbit
- damping
- no pan
- do not steal page scroll with wheel zoom

Touch:
- tap select
- larger hit targets
- preserve vertical page scroll

PICKING / DETERMINISM:

Use screen-space picking with stable pixel targets.
Do not rely on one fixed world-space radius.

Stable layout seeds come from:
- product.id
- product.slug
- node.id
- stable index

No Math.random() in semantic topology.

Same product data must reproduce:
- semantic node positions
- relation edges
- initial framing
- node ordering

Ambient time motion can animate, but meaning must not reshuffle.

PANEL / ACCESSIBILITY / PERFORMANCE:

Selected panel may show only supported facts:
- title
- kind
- verified description
- relationship
- evidence source
- status/boundary
- real route/action

No fake:
- confidence
- health score
- benchmark
- completion
- AI reasoning

Canvas is progressive enhancement.
Provide a semantic DOM node index with:
- keyboard focus
- Enter/Space selection
- Escape clear
- visible focus
- selected-state announcement

Performance:
- one anatomy canvas maximum
- reuse current Three/R3F infrastructure
- capped DPR
- quality tiers
- pause offscreen
- pause document.hidden
- reduced-motion final state
- dispose resources

Optional guided tour / 2D blueprint are allowed only if they improve comprehension and use the SAME real node data.
