# KNOuX Product Page Cinematic Reference

ROLE: Specialized reference for individual KNOuX product pages only.

AUTHORITATIVE ROUTES:
- /products/[slug]
- current data authority: src/data/software.ts
- current page owner: src/components/ProductDossier.tsx

SOURCE IDEA:
The supplied NovaCore reference demonstrates useful mechanics:
- product-specific loader choreography
- staged reveal from loader to page
- ambient particle field
- cursor-reactive depth
- per-section visual motifs
- modal/detail expansion
- progressive section activation

DO NOT COPY:
- NovaCore branding, typography, colors or content
- Google Fonts/CDN imports
- random fake metrics
- fake status/uptime/performance claims
- fake research timelines
- cyan/magenta/gold/green rainbow identity
- fake product names or fake technical claims
- Math.random()-driven runtime identity

KNOuX PRODUCT PAGE CONTRACT

Every product page keeps one institutional KNOuX DNA:
- accepted site header
- deep black / graphite / off-white / platinum
- restrained KNOuX violet
- thin architectural lines
- evidence-first copy
- repository-backed facts
- existing breadcrumb/navigation conventions

But every product receives a distinct VISUAL PROFILE.

The profile may control ONLY presentation:
- loader title
- loader subtitle
- local logo/mark selection
- scene motif
- accent intensity
- spatial geometry
- section visual signature
- transition choreography

The profile must NOT duplicate:
- product statement
- capabilities
- limitations
- technologies
- evidence
- repository URL
- live URL
- version/status truth

Those remain sourced from softwareProducts.

LOGO RULE
Audit local assets first.
If a verified product-specific logo exists, use it.
If not, use the canonical KNOuX mark + real product shortName.
Never invent a fake logo.

DYNAMIC LOADER

The loader is product-aware, not global-generic.

Required inputs:
- product.slug
- product.name
- product.shortName
- product.code
- product.family
- verified local product logo when available
- visual profile motif

Loader sequence:
1. quiet KNOuX field
2. product mark/name resolves from particles/lines
3. product-specific motif assembles around it
4. real product code/family appears
5. progress reflects actual page readiness where possible
6. scene transitions into the product hero

Do not simulate fake backend work.
Do not print fake messages such as 'neural matrix' or 'quantum sync'.
If progress cannot be tied to actual readiness, use a short deterministic staged transition without a fake percentage.

Loader must run:
- on first product page entry
- when navigating between distinct product slugs only if transition budget allows
- not on every minor rerender

Respect prefers-reduced-motion and session continuity.

PRODUCT VISUAL PROFILES

KNOUX ONE
Motif: systems nucleus / modular Windows intelligence field.
Geometry: modular nodes, service shells, layered operating surfaces.
Motion: ordered assembly and system-path pulses.

KNOuX Forge
Motif: repository / code / engineering topology.
Geometry: branching graph, code planes, build pipeline traces.
Motion: nodes resolve into dependency paths.

KNOuX Repair
Motif: diagnostics / repair / service-ring workstation.
Geometry: radial diagnostic rings, bounded tool sectors, repair pulses.
Motion: scan -> isolate -> resolve, without fake health numbers.

KNOuX SmartOrganizer
Motif: files / storage / clustering.
Geometry: file tiles, folder constellations, storage bands.
Motion: scattered items organize into deterministic clusters.

KNOuX REC
Motif: capture / timeline / recording workspace.
Geometry: framing corners, waveform ribbon, timeline lanes.
Motion: capture frame closes, timeline grows, waveform breathes.

KNOuX Player X
Motif: media playback / signal processing.
Geometry: playback ring, spectral bands, subtitle/time tracks.
Motion: restrained equalizer/spectrum movement and timeline drift.

KNOuX Clipboard AI
Motif: guarded clipboard flow / privacy boundary.
Geometry: clipboard cards, protected channel, inspection gates.
Motion: copied item enters a guarded path; blocked/allowed states only when supported by real product facts.

COMMON HERO STRUCTURE

Each /products/[slug] hero should contain:
- product identity
- product tagline
- product-specific visual scene
- repository action
- declared live URL action only when present
- contact/request action
- status/family/code
- optional version only when present in registry

The hero composition remains recognizably KNOuX,
but scene geometry changes by product profile.

Do not use a generic identical orb for all products.

CONTENT BLOCK SYSTEM

Keep a shared layout grammar but allow motif-aware presentation for:
- Overview
- Capabilities
- Stated limits
- Technologies
- Evidence
- Access
- Related systems

Data remains registry-driven.
Visual wrappers may vary by motif.

INTERACTION

Desktop:
- restrained pointer parallax
- subtle local node attraction
- scene reacts near pointer
- no React state update on every mousemove
- no scroll hijacking

Keyboard:
- every real action reachable
- visible focus
- no information only on hover

Touch:
- no pointer-follow assumptions
- preserve vertical scrolling
- reduce simultaneous visual density

Reduced motion:
- no long loader choreography
- no continuous orbital drift
- final composition appears immediately or with short opacity transition

PERFORMANCE

Prefer one scene/canvas maximum in a product hero.
Reuse existing motion/Three infrastructure.
Do not create a renderer per content block.
Pause when offscreen/document.hidden.
Use adaptive DPR.
Dispose all resources.
Use deterministic seeded layouts.
No Math.random() in identity-critical paths.

QUALITY BAR

The page must feel like:
same KNOuX institution,
different engineered product personality.

Not:
seven identical pages with different text.
Not:
seven unrelated microsites.
Not:
a generic SaaS product template.

