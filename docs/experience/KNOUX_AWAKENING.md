# KNOuX: The Awakening

**Branch:** `feat/knoux-awakening-20261114`
**Baseline:** `dbda9ea952669ed7ab8f74f754727e3881e4ff5c` (`main`)
**Status of this document:** describes the implementation on the branch above; it is not a deployment record.
**Verification record:** [`AWAKENING_VERIFICATION.md`](./AWAKENING_VERIFICATION.md)

---

## 1. What it is

A full-screen cinematic overlay built on the existing KNOuX homepage. The
Sentinel opens a sequence of seven authored phases, emits five systems that
already exist in the canonical software registry, then resolves into real
product cards.

It is an extension of the current site, not a rebuild:

- the existing Hero, canonical logo, interactive Sentinel, navigation, routes,
  commerce and auth boundaries are untouched;
- the stage is one client component mounted beside `<main>` in
  `HomeExperience.tsx`, plus a launcher and supporting styles;
- there is no second pointer system and no second interactive Sentinel. The
  scene draws a presentation-only `ForgeSentinel` from the same canonical
  geometry; `SentinelGuideLauncher` still owns the one interactive instance.

The effect was designed as a **rendering-layer event**. No phase can remove a
DOM node from the page, change a route, submit a form, alter a cart or move the
scroll position.

---

## 2. Activation

| Entry point | Selector | Behaviour |
| --- | --- | --- |
| Hero dock | `.awakening-key` | Dispatches `knoux:awakening` |
| Header keycap | `.awakening-header` | Dispatches the same event on `/`; on other routes navigates to `/?awaken=1` |
| Mobile menu | `.awakening-menu` | Closes the menu, then activates |
| Keyboard | `K` | Homepage only; ignored in inputs, editable regions, open dialogs and while the stage is open |

- `AwakeningLauncher` owns all three controls.
- `AwakeningStage` owns the single `knoux:awakening` listener, so duplicate
  clicks cannot open two stages.
- The non-home hand-off is consumed once on arrival. `history.replaceState`
  removes `?awaken=1` without adding a navigation entry.
- The `K` shortcut requires no modifier and is suppressed with
  `defaultPrevented`, `Meta`, `Ctrl` or `Alt`.
- `Escape` closes the stage.
- Closing, skipping and unmounting all restore `body` overflow/padding, remove
  `html[data-awakening]`, dispose audio and restore focus to the element that
  opened the stage when it is still connected.
- Focus is trapped inside the dialog while it is open; the close control
  receives initial focus.
- The mobile menu is closed before the event is dispatched, so no menu panel
  remains behind the stage.

Trigger copy is localized; the scene never translates product names, codes,
status tokens or routes.

---

## 3. Timeline and state authority

`src/lib/awakening/machine.ts` is the only authority for phases, durations,
emissions and transitions. It contains no DOM, timer or entropy, so the timeline
is testable as data.

| Phase | Duration | Systems emitted |
| --- | ---: | ---: |
| `ignition` | 1,200 ms | 0 |
| `awakening` | 1,700 ms | 0 |
| `first-emission` | 1,900 ms | 1 |
| `cascade` | 3,200 ms | 3 |
| `overcharge` | 2,400 ms | 5 |
| `fracture` | 2,200 ms | 5 |
| `revelation` | 3,000 ms | 5 |
| `explore` | resting state | 5 |

Total cinematic time: **15,600 ms**.

Holding and terminal states:

| Phase | Meaning |
| --- | --- |
| `idle` | Closed; the stage renders nothing |
| `paused` | A playable phase is held; `resumePhase` keeps the exact return point |
| `skipped` | The reveal is shown directly; emissions are shown as five |
| `error` | The registry projection is incomplete; no product is invented |

Pause keeps the unspent duration (`deadline - performance.now()`) and resumes
into the same phase instead of restarting it. A hidden tab pauses the sequence;
returning to the tab resumes only a pause the browser caused, never a manual
one. A manual pause survives visibility changes.

An unknown or invalid event is ignored rather than throwing, so a stale
visibility event or a double click cannot break the page.

---

## 4. Product registry contract

The scene owns no catalogue. `src/lib/awakening/products.ts` projects five
entries out of `src/data/software.ts`, the registry that also generates
`/products/[slug]`.

| Registry id | Route | Canonical name |
| --- | --- | --- |
| `sw-one` | `/products/knoux-one` | KNOUX ONE |
| `sw-forge` | `/products/kforge` | KNOuX Forge |
| `sw-repair` | `/products/knoux-repair` | KNOuX Repair |
| `sw-rec` | `/products/knoux-rec` | KNOuX Rec |
| `sw-player-x` | `/products/knoux-x` | KNOuX Player X |

`project()` copies `code`, `index`, `name`, `shortName`, `family`,
`discipline`, `status`, `tagline` and `slug` from the registry record; the route
is derived as `/products/${slug}`. Nothing is authored by the scene.

`awakeningProductsAreComplete()` re-reads the registry and verifies that every
projected record still matches its source. `AwakeningStage.begin()` consults it
before starting. If the projection is short or drifts, the stage enters the
explicit `error` phase and shows a truthful message; it does not fill the scene
with placeholder products.

The cards show only what the registry publishes:

- no price, rating, download count or benchmark;
- no invented capability;
- no fabricated "available now" claim beyond the registry status token;
- each card is a same-origin `next/link` to a real dossier.

Thumbnails under `public/knoux-universe/forge/` are 256×256 WebP derivatives of
the canonical product visuals. The originals remain the authority. The five
derivatives total **59,710 bytes**; the reveal loads 2 eagerly and 3 lazily.

---

## 5. Fracture safety

`src/lib/awakening/fracture.ts` builds the fracture deterministically from the
seed `0x4b4e4f58`: **17 lines and 9 shards**, all inside the 0..100 scene space.
The same break is drawn for every visitor; no `Math.random`, no runtime
geometry generation, no `requestAnimationFrame` in React.

`FractureSurface` is an SVG sibling above the scene with:

- `aria-hidden="true"`;
- `pointer-events: none` permanently;
- no DOM removal or HTML injection (`removeChild`, `innerHTML`, `outerHTML`,
  `replaceChildren` are absent);
- only opacity/transform animations, budgeted to end inside the 1,500 ms phase;
- no pointer interception after the phase, because the layer unmounts when
  `fracture` ends.

The stage is `z-index: 90`, above the header (`80`). The interactive Sentinel
(`140`) is hidden by `html[data-awakening='open']` while the hall is open, so the
scene cannot be clicked through to a second pointer owner.

Under `prefers-reduced-motion: reduce`, activation starts directly in `explore`
(`START` with `reducedMotion`). If the preference changes while the hall is
open, a `SKIP` shows the reveal immediately. The fracture is never played.

---

## 6. Audio policy

- **No audio file, no third-party composition.** `AwakeningAudio` synthesizes
  short cues with Web Audio oscillators and deterministic noise.
- The context is created/unlocked synchronously from a real user gesture
  (activation click, replay, mute, pointer/key inside the stage). There is no
  autoplay before a gesture.
- Cues are phase-driven, not frame-driven. A resumed phase is not re-cued.
- One master gain; cue spans are at most 1.7 s; all nodes are tracked and
  stopped on `dispose()`.
- Mute is persistent for the open session, uses `aria-pressed`, and the visible
  label changes between "Mute sound" and "Unmute sound" to match the accessible
  name.
- A browser without Web Audio, a blocked context or a suspended policy degrades
  to silence without blocking the visuals.
- Captions are always present in the DOM and announced through an
  `aria-live="polite"` node; there is no audio-only information.
- The footer states "Synthesized score / captions always on".

---

## 7. Accessibility and motion

- `role="dialog"`, `aria-modal="true"`, labelled by `#awakening-title` and
  described by the live caption.
- Focus trap across links and buttons; `Escape` closes; focus returns to the
  opener.
- Every control has a real accessible name. Decorative glyphs are CSS
  `::before` content / `aria-hidden`, so they do not join the accessible name
  (the axe WCAG 2.5.3 fix).
- The reveal is a real `<ul>` of links, not canvas content; all five products
  are reachable by keyboard and readable without animation.
- `prefers-reduced-motion: reduce`:
  - skips the cinematic and shows the reveal directly;
  - removes every stage animation and transition;
  - explicitly silences the `.forge-sentinel` root as well as its descendants;
  - removes hover transforms;
  - shows a localized note that the reveal was shown directly.
- No flashing or strobing: transitions are opacity/transform at ordinary
  durations, with no repeated full-field flashes.
- Automated axe check of the open reveal reports no critical or serious
  violations. This is not a substitute for manual screen-reader testing.

---

## 8. Localization and RTL

- UI copy goes through the existing `translatedSiteCopy` authority with EN, AR
  and UR entries in `src/lib/i18n/site-copy.ts`.
- The stage receives `dir`/`lang` from `siteDirection()` and
  `siteLanguageTag()`.
- Product names, codes, status tokens, family names and routes are never
  translated.
- RTL mirrors the layout, orbit seats and controls without horizontal overflow;
  the Arabic heading and first product name were verified in the browser at
  1440×900 and 390×844.
- `KNOuX` casing is preserved; only the stage title uses the authored uppercase
  display style.

---

## 9. Performance

- CSS/SVG only. No WebGL, no new canvas, no three.js in this feature.
- No per-frame React state. The machine advances on seven `setTimeout` steps;
  CSS owns the painting. The Sentinel is static geometry plus animated CSS
  classes.
- Idle cost is near zero: when `phase === 'idle'` the stage returns `null`; the
  hero dock is one small SVG.
- Bounded work: 5 products, 5 thumbnails (59.7 KB total), 17 fracture lines,
  9 shards, one timer, one audio graph.
- One timer at a time; `clearTimer` runs on phase change, skip, close and
  unmount.
- Listeners for `knoux:awakening`, `keydown`, `visibilitychange` and the motion
  media query are removed on cleanup.
- The tab is paused when hidden.
- Stage node count at the desktop reveal: **113**; stage canvases: **0**;
  horizontal overflow: none at 1440, 820 and 390 widths.
- Browser heap after the desktop reveal: ~28 MB in the production preview.
  No long tasks were observed in a 3 s idle window after the reveal.
- With reduced motion, the final build reports **zero running animations**,
  including the hero dock Sentinel.

---

## 10. Files

| Path | Role |
| --- | --- |
| `src/lib/awakening/machine.ts` | Phase/timing/emission authority and reducer |
| `src/lib/awakening/products.ts` | Five-record registry projection + completeness check |
| `src/lib/awakening/fracture.ts` | Deterministic bounded fracture geometry |
| `src/lib/awakening/audio.ts` | Gesture-only synthesized score, mute, cleanup |
| `src/components/awakening/AwakeningStage.tsx` | Overlay, timer, focus trap, audio lifecycle |
| `src/components/awakening/AwakeningLauncher.tsx` | Hero/header/menu triggers, `K`, hand-off |
| `src/components/awakening/ForgeSentinel.tsx` | Canonical Sentinel presentation + chest aperture |
| `src/components/awakening/FractureSurface.tsx` | Painting-only SVG fracture layer |
| `src/components/awakening/knoux-awakening-identity.css` | Sentinel staging and reduced-motion reset |
| `src/components/awakening/knoux-awakening-trigger.css` | Hero dock, header key, menu entry |
| `src/components/awakening/knoux-awakening-stage.css` | Hall, reveal, fracture, RTL, responsive |
| `src/components/HomeExperience.tsx` | Hero dock + stage mount |
| `src/components/SiteHeader.tsx` | Header key + mobile menu entry |
| `src/lib/i18n/site-copy.ts` | EN/AR/UR scene copy |
| `public/knoux-universe/forge/*.webp` | Five 256×256 thumbnails |
| `tests/awakening.test.mjs` | 26 unit/contract tests |
| `e2e/awakening.spec.ts` | 10 browser tests × 3 viewport projects |

No new runtime dependency was added. The thumbnails were generated once with a
local tool; the repository only contains the resulting WebP bytes.

---

## 11. Verification and release

The exact commands, exit codes, test counts and browser measurements are in
[`AWAKENING_VERIFICATION.md`](./AWAKENING_VERIFICATION.md).

Release is intentionally **not** performed:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run audit:css-integrity`
5. `npm test`
6. `KNOUX_E2E_BROWSER_CHANNEL=chrome npx playwright test e2e/awakening.spec.ts`
7. Review the screenshots listed in the verification record.
8. Commit the feature on `feat/knoux-awakening-20261114`.
9. Push / open a pull request / deploy only with explicit authorization.

Rollback is a normal branch revert: the feature is additive and does not modify
the registry, routes, auth, commerce or the canonical Sentinel.

## 12. Boundaries and unknown

- Nothing was pushed, merged or deployed.
- The axe pass is automated, not a manual assistive-technology audit.
- Safari/Firefox were not part of the automated browser matrix (Chromium via
  Chrome was used).
- The production preview is a local `next start` on
  `http://127.0.0.1:4178`, not a public environment.
- Audio was verified for lifecycle and gesture gating in code/unit tests; no
  acoustic measurement or subjective listening test is claimed.
- The five-product curation is a deliberate editorial choice within the
  canonical registry; it does not claim those are the only products KNOuX has.
