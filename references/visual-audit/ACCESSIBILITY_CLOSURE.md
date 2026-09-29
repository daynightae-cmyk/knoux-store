# Accessibility closure — evidence

What follows is what was measured, and how. Anything not measured is listed
as unknown rather than claimed.

axe cannot find most of what makes a page usable with a keyboard or a screen
reader, so an automated pass is a floor and not a conclusion. This document
does not claim WCAG conformance, and no part of the closure report should be
read as claiming it.

---

## 1. Automated — axe-core via `@axe-core/playwright`

`e2e/accessibility.spec.ts` runs axe over **every route in the public inventory
at three device profiles** — desktop (1440×900), tablet (820×1180) and mobile
(Pixel 7). The inventory is read from `src/app` on disk, not typed, so a route
added later is covered without anyone remembering to add it.

Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`.
Blocking impact: `critical` and `serious`.

| Run | Result |
| --- | --- |
| Final, 32 routes × 3 profiles | 96 axe assertions, 0 blocking violations |

Reproduce with `npm run test:e2e`.

### What the automated pass found, and what was done about it

Every item below was a real violation reported by axe and then fixed at the
cause. None was suppressed.

| Finding | Root cause | Fix |
| --- | --- | --- |
| `color-contrast` on `.signal-rail__label` and ~30 other surfaces, every route | `--dim` was `#6d6e70`, **3.90:1** on `--bg` | Raised to `#8a8c8f` (**4.77:1** worst case) |
| The contrast fix changed nothing | `globals.css` declared `:root` **twice**; the later block silently won | Merged into one `:root`; a test now asserts there is exactly one |
| `color-contrast` on 6 components and the canvas palette | `#6d6e70` written as inline styles, bypassing the token | Replaced with `var(--dim)` / the token value; a test asserts the mirror stays equal |
| `aria-allowed-attr` (critical), 6 nodes, all WordPress catalogue routes | `aria-pressed` on `<Link>` — a toggle attribute on a navigable link | Changed to `aria-current` |
| `color-contrast` on `.engineering-context-nav a span` | `#796c84`, **3.31:1** | Replaced with `var(--muted)` |
| `color-contrast` on a disabled pagination step | `#45464a`, **1.52:1** — not disabled so much as invisible | Replaced with `var(--dim)`; emphasis now comes from the border |
| `color-contrast` on a selected workspace row | `#848499` on `#262139`, **2.9:1** | Replaced with `var(--muted)`, **5.39:1** there |

---

## 2. Manual keyboard verification

Driven against a real production build in the installed Chromium, with real key
events, at 1440×900.

### Skip link

| Check | Measured |
| --- | --- |
| Is the first Tab stop the skip link? | Yes — `a.skip-link`, text "Skip to content" |
| Is it hidden when unfocused? | Yes — `top: -80px` |
| Does it become visible on focus? | Yes — `top: 20px` |
| Does Enter move the viewport? | Yes — `location.hash === '#main-content'` |
| **Does Enter move keyboard focus?** | **It did not** — focus stayed on `body` |

The last row was a genuine defect: a skip link that scrolls without moving
focus leaves a keyboard user's next Tab back at the top of the document, which
is the failure the link exists to prevent. Fixed by giving every
`id="main-content"` element `tabIndex={-1}`, which makes it programmatically
focusable without adding it to the tab order.

### Tab order and focus visibility

25 stops walked on each of 8 routes: `/`, `/build`, `/login`, `/contact`,
`/products`, `/wordpress/plugins`, `/growth`, `/creative`.

| Route | Stops | Invisible focus indicators |
| --- | --- | --- |
| `/` | 25 | 0 |
| `/build` | 25 | 0 |
| `/login` | 25 | 0 |
| `/contact` | 25 | 0 |
| `/products` | 25 | 0 |
| `/wordpress/plugins` | 25 | 0 |
| `/growth` | 25 | 0 |
| `/creative` | 25 | 0 |

Focus order on the public shell is the header navigation in visual order:
skip link → home → Software → WordPress → Web → Growth → Creative → Solutions.

**This was not true before this pass.** `/contact` had 5 stops and `/products`
had 1 where focus was invisible: `outline: 0` on `.field input/select/textarea`,
`.command-bar input`, `.palette__field input` and `.composer-input textarea`
had the same specificity as the global `:focus-visible` rule and were declared
later, so they removed the site-wide focus ring. Six form fields were
focusable and invisible. All four declarations were removed.

### Dialog

| Check | Measured |
| --- | --- |
| Search opens from its trigger | Yes |
| Focus moves into the dialog | Yes |
| Focus stays inside across 4 Tab presses | Yes — `[true, true, true, true]` |
| Escape closes it | Yes |
| Focus returns to the trigger | Yes |

### Reduced motion

With `prefers-reduced-motion: reduce` emulated: the media query matches, and
**0** of the first 400 elements in the document carry a transition or animation
longer than 50ms.

### Canvas

`/build` renders a WebGL canvas. The surrounding text states the workspace's
own state (`SIGN IN TO OPERATE` / `ADAPTER ONLINE` / `PROJECT WITHHELD` /
`PROJECT UNAVAILABLE`) rather than relying on the render, and
`e2e/accessibility.spec.ts` asserts that the state is present as text. The
canvas itself is `aria-hidden` and carries no information that is not also in
the document.

---

## 3. What was **not** verified

Stated plainly, because the absence is otherwise indistinguishable from a pass.

- **No screen reader was run.** No NVDA, JAWS, VoiceOver or Orca. Everything
  above is DOM-level evidence: names, roles, states, order and contrast. A
  screen reader is a consumer of that DOM, but "the DOM is correct" is not
  "the experience is correct", and this document does not claim it is.
- **No touch-target audit at device sizes.** Target sizes were not measured
  per control at 390px or 375px. The mobile shell was verified for horizontal
  overflow and for navigation reachability, which are different properties.
- **No zoom / reflow test** at 200% or 400%.
- **No high-contrast or forced-colours mode** verification.
- **Colour is not the sole carrier of state** was not exhaustively audited
  route by route. The status vocabulary uses colour plus a text label
  (`ACTIVE`, `UNCONFIGURED`, `NOT RUN`) by construction, and that construction
  was read, not measured.

---

## Status

**Automated: complete.** 96 axe assertions across 32 routes and 3 device
profiles, no critical or serious violation, run against a production build.

**Manual keyboard: complete for what it covers.** Skip link, tab order, focus
visibility, dialog focus management and reduced motion were each measured, and
two real defects found this way were fixed.

**Overall: not a WCAG conformance claim.** The gaps in section 3 are real and
are the honest limit of this evidence.
