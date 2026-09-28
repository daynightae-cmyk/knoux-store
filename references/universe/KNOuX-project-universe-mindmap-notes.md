# KNOuX Project Universe — Omma 3D Mind Map Reference

## Scope
This reference is ONLY for the second major homepage block:
**Projects / Product Universe / Software Universe map.**

It is NOT a Hero reference and must never replace or redesign the accepted KNOuX Hero.

## Supplied source
The supplied Omma export is a 3D Interactive Mind Map using:
- hierarchical node data
- curved links
- progressive expand/collapse
- raycast hover and click
- drag interaction
- OrbitControls
- moving signal particles along links
- ambient particles
- physics-like spacing

## What is worth keeping
1. Hierarchical graph model.
2. Root -> product -> capability progressive disclosure.
3. Curved relationship paths.
4. Moving signal along selected/visible connections.
5. Hover/focus emphasis.
6. Click/tap expansion.
7. Optional controlled desktop drag.
8. Camera focus and bounded zoom.
9. Sparse spatial composition with large negative space.

## What must be removed or rewritten
- all demo maps: Creative / Startup / Wellness / Music
- all demo palette names and rainbow colors
- all settings panel UI
- external Google Fonts
- jsDelivr Three/WebGPU imports
- PolyHaven remote HDR loading
- Math.random() layout, particles and expansion offsets
- full-screen page ownership
- unrestricted OrbitControls on mobile
- permanent extra renderer if existing KNOuX R3F scene can be reused

## KNOuX translation
Use:
- black / graphite
- platinum / off-white
- silver
- restrained KNOuX violet
- subtle particle continuity with the Living Particle Mark
- precise technical typography
- cinematic negative space

The graph should start mysterious and restrained:
KNOuX core + primary verified products only.

Deeper capability nodes appear only after intentional interaction.

## Current project reality
The project already has Three.js, @react-three/fiber and @react-three/drei.
The current ProductUniverse is deterministic and registry-backed, but is a 2D percentage-position topology.

Therefore the correct implementation is an evolution of the existing ProductUniverse contract,
not a replacement of its data truth, search, routes, analytics, keyboard access, or dossier links.

## Preferred architecture
- keep registry/search/deep links from current ProductUniverse
- add a reusable spatial graph layer
- derive positions deterministically from IDs / metadata
- keep inspector/readout accessible outside the canvas
- keep labels and controls accessible in DOM where practical
- use R3F only for spatial depth that meaningfully improves the experience
- use one rendering context
- quality tiers for integrated GPUs
- pause offscreen/hidden animation
- reduced-motion path must remain fully usable

## Clean code reference
See:
D:\Knoux Store\references\universe\KNOuX-project-universe-mindmap-reference.ts

## Existing complementary reference
D:\Knoux Store\references\universe\KNOuX-system-constellation-reference.md

That older reference remains useful for:
- inspector drawer
- pointer tooltip
- micro-navigation
- contextual inspection

Do not mix its AGENT.OS branding/content into KNOuX.

## Authoritative color translation
The current KNOuX production tokens are the authority, not the Omma demo palette.

Use the existing visual family:
- #08090a background
- #101113 / #16171a surfaces
- #f1eee8 warm off-white
- #a18acb KNOuX violet
- #c2b5d8 soft violet signal
- #e6e2da platinum
- #b8b5b4 silver
- #292a2d structural lines
- #51455b violet-gray connector tone

The graph should feel monochromatic-plus-violet rather than multi-color.
Do not assign orange/cyan/green/yellow/pink category colors from the supplied demo.
Use geometry, scale, opacity, ring treatment and hierarchy to distinguish nodes.
Ambient stars/dust should visually continue the accepted Hero starfield.
