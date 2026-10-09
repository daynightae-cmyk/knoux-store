# KNOuX Visual System V4 — application experience composition

This is the working contract for V4. It exists because the failure mode in this
codebase is not "the wrong colour" — it is that surfaces with genuinely
different jobs have drifted toward the same geometry, so a marketing surface, an
operator surface and a document surface all read as the same rectangle grid.

**The law this branch enforces:**

> No unnecessary boxes. No meaningless empty space. No decorative motion
> without purpose. Every application has a visual soul, and every application
> still unmistakably belongs to KNOuX.

## The distinction being applied

Not every border is decorative. A boundary is *allowed* when it carries
interaction, selection, editing, approval, status, data grouping, a security
boundary, code, form input, a table, or an operational control. Everything else
is a container that exists because content exists, and that is what V4 removes.

The two failure modes being avoided in both directions:

- **Over-framed** — a rectangle added because content needed somewhere to sit.
- **Under-structured** — containers stripped until a dense operator screen has
  no scannable structure and form fields have no visible boundary.

So V4 removes *plates and enclosing boxes*, and it removes them by deleting the
properties, not by fading the borders.

## Visual differentiation matrix

| App family | Visual metaphor | Focal element | Motion type | Primary data shape | Surface strategy |
|---|---|---|---|---|---|
| Home | Institution / hall | The wordmark, set as a typographic object with the violet mark as its period | Slow field drift; independent star twinkle | Sequence of divisions | Open. No hero plate; the field is the surface |
| Command | Mission control | The operational signal — what needs a decision | Status response; pulse only on real state change | Metrics + actions | **Structured functional.** Panels removed to bands; frames opt-in via `data-framed` for tables and forms |
| Growth | Signal pipeline | The path a signal travels | Energy progression along the flow | Sequence | Open. Already `index-rows`; row rhythm, no cards |
| WordPress | Deployment stack | The infrastructure path | Stage activation on real state change | Pipeline stages | Open. Already `eco-section`; a rule per stage |
| Build | Generative engine | The living Orb | State-reactive, driven by real generation state | Plan topology | Functional surfaces only. **Note: the Build OS shell is not mounted — see below** |
| Providers | Intelligence control room | Provider identity and its blockers | Measured signal, never decorative | Dense model lists | Open composition; blockers stated in-line, never a red panel |
| Creative | Material studio | The artwork | Ambient depth | Gallery | Layered and asymmetric; dossier regions are continuous ledger bands |
| Web / Engineering | Structural | The architecture map | Diagram emphasis | Topology | Open; already `index-rows` |
| Products | Ecosystem | The selected product's own scene | Per-product, one focal object | Capability signature | Scene-led. Each product already mounts a distinct scene |
| Auth | Threshold | The form | Quiet field only | None | Open type composition; no card |

## What V4 actually changed

Two surfaces carried the box wall in live code. Both were fixed by deleting the
plate and the enclosing border, not by restyling them.

### 1. Command — `src/components/command/command.module.css`

`.ccPane` was `background: var(--panel)` inside `border: 1px solid var(--cc-line)`.
It is instantiated **36 times across all 14 Command routes**, so it was the
single largest source of the "collection of dashboards" reading.

Removed:

- **The plate.** An opaque panel is a box, and a box also paints over the global
  starfield — the one thing that makes a Command screen read as KNOuX rather
  than as an admin template.
- **The enclosing border.** Structure now comes from the section rule above
  (`.commandSection`) and from space, which is the language the rest of the file
  and the marketing surfaces already use.

Added: `.ccPane[data-framed='true']` restores a plate *and* a border for the
cases that genuinely need one — a dense table, a form, something the eye has to
hold still on. Functional boundaries remain available; none of them are the
default any more.

Also stepped `.ccPaneTitle` from `9.5px` to `11px`, off the sub-10px band the
dense surfaces were sitting in.

### 2. Creative — `src/app/globals.css`

`.dossier-card` was `background: #0e0f12` inside a border box — the only place
on the site hardcoding a surface hex instead of using the token scale. It is
used **24 times**. It is now a continuous ledger region separated by a rule
above it, matching `.discipline`, which was already open and editorial.

Its type moved off the `8.5px / 9px / 10.5px` band up to `11px / 11px / 12px`.

## What V4 deliberately did NOT change

Stated so the omissions read as decisions rather than oversights.

- **The global starfield.** `StoreStarfieldProvider` + `StoreStarfield` remain the
  single canvas in the root layout, with the 37 existing `prefers-reduced-motion`
  rules intact. No additional canvas engine was introduced. V4 makes the field
  *more* visible on Command by removing the plates that were covering it.
- **`visual-system-v2.css` is still in the cascade.** V3 merged with all three
  layers loading (`globals.css` → `visual-system-v2.css` → `visual-system-v3.css`).
  Removing a layer is a large, unattributable visual diff and needs its own change
  with its own evidence. It is recorded as outstanding debt, not silently taken on.
- **Functional containers.** Command tables keep their rules; the demo notice
  keeps its dashed amber boundary; status badges keep their colour coding; forms
  keep their visible input borders. These are the boundaries that carry meaning.
- **Any business logic.** No API route, provider adapter, OAuth path, RLS policy or
  credential handling was touched. This branch is CSS and capture tooling only.

## Known outstanding debt carried forward

- The Build OS shell (`KnouxBuildWorkspace`) is still never rendered. Its status
  rail, spatial workspace, mode switcher, canvas and command deck are unreachable,
  so `build-os.css` and the `bo-*` primitives style nothing a user can see. Until
  that is wired or deleted, Build visual work has no reachable surface. **This is
  a decision, not a styling task, and it blocks the Build portion of V4.**
- `borders` at `--line` measure about 1.39:1 against the background, below the
  3:1 that WCAG 1.4.11 asks of a meaningful boundary. Removing decorative borders
  helps this; the decorative ones that remain should not be relied on to convey
  state.
- No type scale is declared anywhere; roughly 190 raw font sizes exist across the
  CSS. V4 raises the two worst bands it touched but does not introduce a scale —
  that belongs with the `visual-system-v2.css` removal.
- 34 routes (`/command/*`, `/build/ai/*`, `/signal/*`) are absent from the E2E
  route allowlist, so none of them is covered by the overflow, axe or composition
  assertions the existing suite performs.

## Evidence

`references/visual-v4/` holds the before and after capture matrices and the
generated comparison gallery. Per `.gitignore`, screenshots themselves are not
committed: the repository's stated rule is that they are reproducible from the
production server. `scripts/visual-v4-capture.mjs` and
`scripts/visual-v4-gallery.mjs` regenerate the whole set.