# VOID — Single Product Cinematic Reference

Status: SPECIALIST INTERACTION / CHOREOGRAPHY REFERENCE ONLY.
Scope: individual KNOuX product routes: /products/[slug].
This is NOT a projects index, NOT the Home System Field, and NOT global site design authority.

## User intent
A click on any system inside the Home KNOuX System Field must navigate to that ONE system's dedicated product page:
- KForge node -> /products/kforge
- KNOuX REC node -> /products/knoux-rec
- KNOuX ONE node -> /products/knoux-one
- etc.

The same product-page ENGINE is reused for every product, while data and scene motif change by slug.
Do NOT clone seven independent hard-coded pages.

## Source mechanics worth adapting
The supplied VOID source demonstrates:
- full-screen product-aware arrival/loader layer
- fixed full-viewport WebGL canvas behind semantic DOM
- cinematic section choreography driven by scroll
- long sticky narrative chapters
- hero geometry that transforms rather than hard-cuts
- particle dissolve / reassembly
- ring-gate / tunnel transition
- surface reveal / spatial cards
- section progress indicator
- subtle film grain
- restrained pointer parallax
- magnetic CTA / local tilt interactions
- reduced-motion fallback

## Source section grammar
S1 / HERO
Large identity + short proposition + CTA over one persistent 3D scene.

S2 / DISSOLVE
A solid form converts into particles while a sticky narrative explains the next layer.

S3 / TRAVERSE
The camera/scene moves through ring geometry, creating a spatial transition chapter.

S4 / SURFACE
The scene resolves into a grounded spatial composition with supporting information modules.

S5 / CLOSING
Large concluding statement + next action.

## KNOuX translation
This is a PRODUCT DOSSIER, not abstract art.

Map the cinematic grammar to truthful product information:

ARRIVAL
-> current product identity

HERO
-> product name, tagline, status, family, platform, repository/live/request actions

SYSTEM REVEAL
-> product statement + product-specific scene motif

CAPABILITY FLOW
-> real capabilities / system anatomy

EVIDENCE SURFACE
-> technologies + limitations + evidence

CLOSING
-> related systems + previous/next + real CTA

## Reject from source
Do not copy:
- VOID name/content
- amber + blue palette
- Google Fonts
- CDN GSAP / Three.js
- hidden native cursor
- fake loader percentage
- Math.random() loading progress
- generic icosahedron as product identity
- generic crystals unrelated to product truth
- identical geometry for every product
- scroll hijacking
- fake cinematic claims

## Visual authority
Use existing KNOuX:
deep black
graphite
off-white
silver
platinum
restrained muted violet

Same KNOuX institution.
Different engineered product personality.

## Product truth authority
All business/product facts remain in:
src/data/software.ts

Presentation authority remains in:
src/data/product-visuals.ts

Never duplicate statements, capabilities, limitations, technologies, evidence, repository URLs, live URLs, status or version inside visual profile code.
