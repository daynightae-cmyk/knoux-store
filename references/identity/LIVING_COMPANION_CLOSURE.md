# KNOuX Sentinel

Canonical owner: `src/components/identity/KnouxSentinel.tsx`.
Helpers: `knoux-sentinel.ts`, `knoux-sentinel.css`, `sentinel-capability.ts`.
`src/app/layout.tsx` mounts `KnouxSentinel`.
`motion/PointerField.tsx` re-exports it as `KnouxLivingCompanion` so the historical import cannot become a second pointer system.

The Sentinel is an original KNOuX identity fragment: graphite face, platinum frame, two luminous almond eyes, deterministic shards, pointed crystal. SVG + DOM + CSS transforms. Native cursor remains. No WebGL, no particle buffer, no `Math.random`, no React state on `pointermove`.

## Capability layer

`sentinel-capability.ts` is a pure, deterministic module. It adds the parts of the Sentinel that cannot be drawn, only measured:

- **Mark constitution.** The interior is a particle reading of the canonical KNOuX mark. `sentinelMarkGlyph` walks the four real paths in `lib/knouxMark`, weights them by perimeter so density is even, and fits them to `GLYPH_BOX` inside the shell face. The body is the brand's own vector geometry, not decoration.
- **KNOuX Core.** `sentinelCore` takes the canonical `dot` path — the node KNOuX already calls Core — and returns its real centre and radius at the real scale of the mark. The halo is that radius; the nucleus is 0.3 of it, so the Core lights the face without competing with the eyes.
- **Registry telemetry.** `sentinelRegistry` counts `softwareProducts` and `labEntities` by `EntityStatus`. `data-records`, `data-shipped` and `data-shards` on the root are those real numbers. A registry of promised work genuinely dims the aura and darkens shards; nothing here is hard-coded to look busy.
- **Capability naming.** `capabilityFor` maps mood to a named subsystem — `core`, `traversing`, `guarding`, `shipping`, `dormant` — written to `data-capability` and rendered as a light change rather than a new silhouette.

The reading is seeded from the canonical geometry and uses no ambient entropy, so the same build always draws the same Sentinel. The module is memoised per budget and the pool is built once.

## Payload

The mark reading is not serialised. It renders only after hydration, via `useSyncExternalStore`, so the 96 particles are absent from both the HTML and the RSC flight payload while the shell, its semantics and its telemetry remain in the document before scripting runs. This is measured: the reading costs **+557 bytes** of HTML per page rather than the +10,313 bytes it cost when it was server-rendered. The shell is `position: fixed` and `pointer-events: none`, so the reading has no layout effect.

## Behaviour

- Desktop fine pointer: damped follow at 28–36px, edge-aware flip, eyes faster than the shell, shards slower.
- Gaze maps to look-left (platinum), look-right (graphite), look-up (curious violet).
- Links → curious. Primary CTA / submit → focused dark violet. Real busy/sent/ok → teal. Real invalid/error → crimson. Unconfigured / unavailable warning → amber.
- Live Composer surfaces (`build-composer-orb`, `composer-intelligence`, `composer-readout__stack`, `assembly__items`) → active / shipping. Search results and Composer disclosure surfaces → curious. A search that honestly returned nothing (`.palette__empty`) → alert.
- Forms: the companion backs away and calms on hover or focus; it does not cover fields and does not hide.
- Scroll: fast motion lowers opacity; it never blinks out. Settling restores.
- Blink: 140ms on the authored sequence 4.8 / 6.0 / 5.4 / 7.1s. Every fourth blink doubles. Sleep does not blink.
- Sleep after 60s true inactivity. Wake on pointer, key, scroll, touch, focus.
- Touch / coarse pointer: hidden. Reduced motion: static 32px dock, no orbit, no follow, and the mark, core, shards and halo all have their animation and transform disabled.

The same listener still writes `--local-x` / `--local-y` / `--depth-px-*` for `[data-spatial]` surfaces.
