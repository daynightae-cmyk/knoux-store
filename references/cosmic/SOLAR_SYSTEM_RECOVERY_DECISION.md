# Task 04 — Solar System Recovery Decision

Status: **SUPERSEDED / REJECTED AS A LITERAL PRODUCTION SCENE**

Base main at decision start: `57a3fe0ba83fccf5c65c10a0c37f88c4cf763737`

## Sources examined

- Recovery archive: `D:\Knoux Store Recovery\2026-10-02\restored\solar-system`
- Local untracked source: `D:\Knoux Store\vary-detailed-solar-system-vis`
- Visual reference 08: `references/visual-library/originals/08-detailed-solar-system`
- Current Home system topology: `src/components/HomeSoftwareField.tsx`
- Current product topology: `src/components/ProductUniverse.tsx`
- Current recovered product universe: `src/components/KnouxSoftwareUniverse.tsx`
- Dormant constellation: `src/components/UniverseConstellation.tsx` (handled separately by Task 05)

## Source integrity

The local untracked source and immutable recovery archive are byte-identical for all five files.

| File | Recovery / local SHA-256 | Reference 08 relation |
| --- | --- | --- |
| `.gitignore` | `877C8D36F5CD89E476C871A393F3A3D6E7E31DAD722A6AD719A90CB6DF001E9E` | identical |
| `index.html` | `E09296344B736AC2E25FA4F086FC5024B59A802C469194ECF6E0DF6DED8FF608` | identical |
| `package.json` | `E5692E90FFE2D413AD2C78499EEFB0A8C915BE3A2F037505B0DBBA96E1C4A7BB` | identical |
| `README.md` | `9B19BF8CFADF1FA1EE151FE3DF85767BE7607200152AD1178280719ACB0D3292` | identical |
| `scene.js` | `5E6EFF6A178952D4851D69A4EEF8D6C2123B9034E3A0C53BA52BBE8D8DAEA39F` | differs |

Reference 08 `scene.js` SHA-256:
`08899B369431F3C60ABE792BA00C8D4904D30B8363AF716A85600A58D7DDCA84`

The recovery/local `scene.js` differs from reference 08 only through lint-style edits, including three invalid CSS declarations where `z-index` became `z-_index`. It must not be copied wholesale.

## Intended KNOuX role

Git history identifies the accepted destination as the Home `02 / SOFTWARE UNIVERSE` system-topology experience:

- `1eb3548` — adds the System Field authority/source references.
- `6510e04` — adds the System Field execution prompt.
- `144956a` — builds the KNOuX System Field.
- `f1e35c8` — closes accessibility/status truth.
- `923071a` — merges Home System Field PR #14.

The authority requires real registry-driven systems, deterministic topology, restrained orbital/parallax behavior, focus/readout states and responsive non-WebGL navigation.

It explicitly rejects a **solar-system toy/gimmick** and permanent uncontrolled `OrbitControls`.

## Recovered mechanics disposition

| Solar source mechanic | Decision |
| --- | --- |
| Concentric orbit geometry | Already represented by `HomeSoftwareField` topology/orbit tiers and the Software Universe. |
| Orbital/cosmic visual depth | Already represented semantically by the accepted Home System Field and Task 03 Software Universe. |
| Slow ambient motion | Current system uses bounded core/node breathing; Task 03 provides orbital product motion with lifecycle controls. No separate literal planet motion is required. |
| Stable labels/readout | Superseded by the System Dossier, synchronized records and Software Universe info rail. |
| Literal Sun/planets/moons/Saturn ring | Rejected as semantically false for a software topology. |
| Asteroid belt and decorative starfield | Rejected as decorative duplication; source uses random placement and continuous per-frame updates. |
| Speed controls | Rejected; users should not manipulate an unrelated simulated solar clock. |
| Permanent `OrbitControls` | Rejected by the System Field authority and unnecessary for product navigation. |
| Full `window.devicePixelRatio` renderer | Rejected as an unbounded GPU cost relative to the current budgeted experiences. |
| Continuous render loop without visibility lifecycle/disposal | Rejected as a performance regression. |
| Procedural planet textures | No truthful product/system meaning; not integrated. |

## Why no production visual code is copied

The recovered scene is a technically competent standalone solar visualization, but its literal subject and interaction model do not map truthfully to the KNOuX product registry.

The accepted current architecture already preserves the valuable interaction intent:

1. `HomeSoftwareField` derives orbit placement from `softwareProducts[*].topology`.
2. `relatedIds` drives real system-to-system relationships.
3. Focus, hover, keyboard and scroll synchronize a stable System Dossier.
4. Responsive records remain usable without relying on a 3D scene.
5. Reduced-motion CSS disables active pulses/transitions where required.
6. Task 03 adds the real ten-product visual universe, with real recovered product assets, reduced-motion/static fallback, visibility-aware rendering and cleanup.

Shipping the solar source would therefore duplicate an accepted concept while weakening semantic truth, determinism, accessibility and performance.

## Preservation / cleanup classification

- Recovery archive remains immutable evidence.
- `vary-detailed-solar-system-vis` is proven to contain no unique bytes relative to the recovery archive.
- The untracked local folder is intentionally left untouched during Task 04 under the recovery preservation law; it can be classified SAFE TO REMOVE during Task 15 after the final repository sweep.
- Reference 08 remains useful forensic source evidence because its `scene.js` retains the valid `z-index` declarations.
- `UniverseConstellation` is not decided here; Task 05 owns its separate unique-value comparison.

## Decision

**Do not integrate the literal solar system scene into production.**

Task 04 recovers its intent by proving where the acceptable mechanics already live and by recording which literal mechanics are intentionally rejected.

No production route/component is replaced, no Home System Field behavior is removed, and no recovered source folder is modified.

Any future cosmic visualization must remain registry-driven and truth-preserving rather than reintroducing the standalone solar simulation.
