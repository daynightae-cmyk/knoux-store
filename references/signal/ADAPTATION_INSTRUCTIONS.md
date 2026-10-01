# KNOuX SIGNAL — reference lock

`ORIGINAL_GLOBE_REFERENCE.js` is an immutable implementation reference supplied by the project owner.

## Rule

Do not redesign, summarize, simplify, or replace its composition. When the Signal experience is ported into React/Three.js, preserve its camera relationship, black environment, icon-sphere composition, center search field, motion rhythm, and interaction geometry as closely as the application architecture permits.

## Authorized changes only

- Replace the example prompt with phone/public-identity lookup input.
- Replace random post-search reshuffling with real Signal evidence / label nodes.
- Use project-local Three.js / React Three Fiber instead of runtime globals or CDN assets.
- Remove the light-mode toggle for the KNOuX dark material system.
- Replace Google Fonts with the site's local/system typography.
- Make randomness deterministic where it affects identity or QA.
- Pause rendering when hidden/offscreen and honor reduced motion.
- Dispose geometries, materials, textures, listeners, and controls on unmount.
- Never fabricate labels, viewer identities, reputation, carrier data, or search history.

## Backend-first gate

The visual stage is not "done" until `POST /api/signal/lookup` returns structured, truthful data. Missing storage/provider integrations must render as unavailable — never as demo data.
