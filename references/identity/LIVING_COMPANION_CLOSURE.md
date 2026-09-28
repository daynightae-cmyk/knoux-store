# KNOuX Sentinel

Canonical owner: `src/components/identity/KnouxSentinel.tsx`.
Helpers: `knoux-sentinel.ts`, `knoux-sentinel.css`.
`src/app/layout.tsx` mounts `KnouxSentinel`.
`motion/PointerField.tsx` re-exports it as `KnouxLivingCompanion` so the historical import cannot become a second pointer system.

The Sentinel is an original KNOuX identity fragment: graphite face, platinum frame, two luminous almond eyes, deterministic shards, pointed crystal. SVG + DOM + CSS transforms. Native cursor remains. No WebGL, no particle buffer, no `Math.random`, no React state on `pointermove`.

## Behaviour

- Desktop fine pointer: damped follow at 28–36px, edge-aware flip, eyes faster than the shell, shards slower.
- Gaze maps to look-left (platinum), look-right (graphite), look-up (curious violet).
- Links → curious. Primary CTA / submit → focused dark violet. Real busy/sent/ok → teal. Real invalid/error → crimson. Unconfigured / unavailable warning → amber.
- Forms: the companion backs away and calms on hover or focus; it does not cover fields and does not hide.
- Scroll: fast motion lowers opacity; it never blinks out. Settling restores.
- Blink: 140ms on the authored sequence 4.8 / 6.0 / 5.4 / 7.1s. Every fourth blink doubles. Sleep does not blink.
- Sleep after 60s true inactivity. Wake on pointer, key, scroll, touch, focus.
- Touch / coarse pointer: hidden. Reduced motion: static 32px dock, no orbit, no follow.

The same listener still writes `--local-x` / `--local-y` / `--depth-px-*` for `[data-spatial]` surfaces.
