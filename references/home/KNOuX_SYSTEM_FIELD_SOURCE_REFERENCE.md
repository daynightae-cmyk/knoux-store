# KNOuX System Field — Specialist Source Reference

Status: SPECIALIST INTERACTION REFERENCE ONLY.
Scope: Home page block 02 / SOFTWARE UNIVERSE.
It is NOT global design authority and must not replace the accepted Home Hero.

## Source identity
Source supplied by user: Three.js 3D profile / achievement map.
Useful implementation stack observed:
- Three.js Scene / PerspectiveCamera / WebGLRenderer
- OrbitControls
- Fog
- layered Directional / Point / Spot lighting
- orbit-distributed cards
- QuadraticBezierCurve3 + TubeGeometry connectors
- Raycaster hover detection
- HTML information overlay
- auto camera orbit with user interruption
- particle field and rotating visual layers

## Mechanics worth adapting
1. One strong visual core.
2. System/project nodes arranged spatially around that core.
3. Curved signal paths from core to nodes.
4. Slow ambient orbital/parallax motion.
5. Pointer focus via raycasting or equivalent R3F interaction.
6. Focused item reveals a compact side dossier.
7. Non-focused field visually recedes.
8. Full-field composition reads like a map, not a card grid.

## Source mechanics observed
The source places cards around a shared radius using angle-based coordinates.
Each node faces the center.
Curves extend from the center toward each node.
Raycasting detects a hovered card and updates the side readout.
The source continuously rotates the camera and cards in the animation loop.

## KNOuX translation
The central avatar is NOT retained.
Replace it with the canonical KNOuX Core / Living Mark.

The source achievement cards are NOT retained.
Replace them with real entries from src/data/software via softwareProducts.

The source score/stat model is NOT retained.
Focused metadata must come from the real KNOuX registry:
- index / code
- product name
- discipline / family
- status
- platform
- tagline
- canonical /products/[slug] route

## Reject completely
Do not copy:
- Atul Verma identity/content
- student/achievement framing
- avatar / graduation cap
- gold/orange/cyan/green/magenta palette
- score or exam cards
- barcode decoration
- rotating biography text ring
- Google Fonts imports
- CDN import map
- raw source navigation
- fake project counts or metrics
- permanent uncontrolled OrbitControls
- continuous fast carousel motion

## Motion correction
The source's always-rotating cards/camera are inspiration only.
KNOuX must remain readable.

Preferred KNOuX motion:
- spatial positions remain deterministic
- very slow orbital breathing / parallax while idle
- no project runs away while the visitor tries to read it
- hover/focus gently pulls the selected system toward the core/camera
- its signal path brightens silver → muted lavender
- unrelated nodes recede
- camera shift is restrained
- pointer leave or Back restores the field

## Visual authority
Use existing KNOuX tokens only:
deep black
graphite
off-white
silver
platinum
muted lavender used as signal

No gold.
No rainbow node colors.
No cyberpunk neon.

## Architecture boundary
This reference targets the current Home block:
02 / SOFTWARE UNIVERSE

Current implementation authority:
src/components/HomeExperience.tsx
src/components/HomeSoftwareField.tsx
src/data/software
src/lib/knouxMark.ts
src/components/three/LivingParticleMark.tsx

The full /products route remains the serious searchable/filterable technical explorer.
The Home field is a cinematic preview/navigation surface, not a duplicate of /products.
