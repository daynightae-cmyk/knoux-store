# KNOuX Store — Production Closure Dossier

Date: 2026-10-22
Repository: `daynightae-cmyk/knoux-store`
Main SHA at writing: `f8da632` (squash of PR #76) — verified green on CI
Protected local root: `K:\Knoux Projects\KNOuX Store\Base` (never deleted, reset or recreated)

## 1. Closed work

### 1.1 Accessibility P0 — axe-core 4.14 `label-content-name-mismatch`

Every labelled control whose accessible name must contain its visible label now does.
Eighteen composable controls were corrected across the header, workspace shell,
division rail, atelier and labs:

| Area | Files | Correction |
| --- | --- | --- |
| Site header brand / search / mobile toggle | `src/components/SiteHeader.tsx` | accessible name derived from content; toggle keeps a token-bearing `aria-label` (visible word first) |
| Build workspace identity, sidebar brand, menu toggle | `src/components/build/dev/DevWorkspaceShell.tsx` | content-based names; menu button keeps `MENU — Open workspace navigation` |
| Division rail section links | `src/components/DivisionShell.tsx` | visually-hidden `(section)` inside the link; link is its own containing block |
| Atelier selectors CR-01…CR-08 | `src/components/creative/AtelierLab.tsx` | code + title are the visible name |
| Experiment selectors LAB-02 / LAB-07 | `src/components/labs/ExperimentChamberV2.tsx` | code + title are the visible name |

Supporting rules learned from the upstream axe implementation (ACT 2ee8b8):
visible-label tokens must be a contiguous subsequence of name tokens; the
accessible name is tokenised the same way for both sides; parentheticals and
non-letter glyphs are dropped.

### 1.2 Contract regressions surfaced by the fix (fixed in the same branch)

- `e2e/routes.spec.ts:33` requires a visible navigation control to carry an
  `aria-label` attribute. Restored as token-bearing labels (visible token first,
  intent second), satisfying both the probe and the label-in-name rule.
- `e2e/routes.spec.ts:108` and the V4 visual matrix found `/web` overflowing by
  71–720 px at every width: the hidden `(section)` span was absolutely
  positioned inside an inline-flex link with no positioned ancestor, so it
  escaped the `overflow-x: auto` rail and widened the document. Each
  `.signal-rail a` is now its own containing block (`position: relative`), so
  the span is clipped inside the rail.
- Unit contracts extended in `tests/site.test.mjs` (both toggles, rail
  containment rule) and `tests/atelier-lab.test.mjs` (no `Select` aria-label).

### 1.3 Merged PRs

| PR | Head | Squash SHA on main |
| --- | --- | --- |
| #68 (dependencies + accessibility closure) | `7589e10` | `2d287e5` |
| #76 (certifi bump in /gateway) | `689d4eb` | `f8da632` |

Local commits inside #68: `16640d9` (label-in-name fixes) and `7589e10`
(navigation probe + rail containment + test contracts).

## 2. Verification evidence

CI runs, all jobs green (verify, CodeQL, SonarCloud, Browser ×3, V4 matrix,
Vercel preview):

| Run | Head | Outcome |
| --- | --- | --- |
| `39722750234` | `7589e10` (PR #68 head) | success |
| `39724183732` | `2d287e5` (main after #68) | success |
| `39729111640` | `f8da632` (main after #76) | success |

Local gates on `7589e10`:

- `npm run typecheck` — exit 0
- `npm run lint` — exit 0 (2 pre-existing warnings)
- `npm test` — 918 pass / 0 fail
- `npm run build` — exit 0
- `npx playwright test e2e/routes.spec.ts` — 174 passed / 33 CI-only skips
  (desktop, tablet and mobile projects; every route-rendering, responsive
  geometry and evidence capture test passes locally)
- `npm run audit:deps` — 5 HIGH advisories, all in the dev-tooling chain
  (`eslint-config-next → @next/eslint-plugin-next → fast-glob 3.3.1 →
  micromatch 4.0.8 → braces 3.0.3`); identical versions on `origin/main` at the
  time of the fix, so not a regression. CI's dependency gate passes.

Notes:

- The V4 audit cannot run on this Windows host (`Provenance inspector timeout`
  in the PowerShell owner-inspector worker); the V4 job runs on CI Linux, where
  it is green on every run above. Declared as CI-verified, not locally verified.
- Local Playwright runs mutate `references/build-connected/qa/*.json`; a backup
  was taken before restoring the tracked state in the previous session.

## 3. Worktree, branch, stash and backup state

Removed from the machine (safe, non-force; verified clean; zero unique work):

- Six clean secondary worktrees: `knoux-fix-20261020`, `knoux-growth-46`,
  `knoux-i18n-52`, `knoux-ts70`, `growth-os-20261016`, `recover-i18n-20261016`.
- Earlier in the closure, four cross-drive worktrees whose gitdir pointed at a
  deleted `D:/Knoux Store/.git` were removed; their uncommitted deltas are
  preserved verbatim in
  `K:\Knoux Projects\KNOuX Store\preservation\stale-worktree-deltas\`
  (1011 files, 33.8 MB — still intact).

Retained deliberately:

- `traycer-css-build-integrity-p0` and `traycer-visual-system-v4-app-experiences`
  — Git refuses safe validation (non-standard `.git` linkage); no data loss, no
  force removal performed.
- `knoux-baseline-main` — 178 tracked deletions + one untracked QA report;
  keep per preservation rule.
- `knoux-dep68`, `knoux-dev45` — one modified `SiteHeader.tsx` each (the brand
  label-in-name fix, now a strict subset of main's implementation).
- `fix-solutions-mission-selection` — three untracked local artefacts
  (`cpd-global.mjs`, `i18n.diff`, `i18n52.diff`).
- Stash `stash@{0}` (wordpress-v2 WIP, also preserved by
  `archive/stash-preserve-store-wordpress-v2`), `node_modules.prev`,
  `Knoux Store.rar` — backups are not deleted.
- Branches: no local or remote branch deleted. `preserve/knoux-ts70-5db868c`
  was added for a detached commit that had no ref.

## 4. Remaining gaps (explicit, not claimed as done)

1. Contact delivery — BLOCKED on transport configuration (owner action).
2. Production probes against `https://knoux.store/api/health` — NOT VERIFIED
   from this closure; Vercel preview deployments are green, production was not
   probed.
3. Deployment provenance beyond the Vercel preview — NOT VERIFIED.
4. Deep i18n coverage plan and Growth bootstrap — out of scope for this closure.

## 5. Safety attestations

- The protected local root was never deleted, reset, recreated or replaced.
- No force-push, no history rewrite, no remote branch deletion.
- No secrets read, printed or committed.
- No worktree containing uncommitted or unverified state was force-removed.
- Every unique-work candidate named in
  `KNOuX_STORE_WORKTREE_PRESERVATION_MATRIX.md` remains reachable either in
  `main`, in its original branch ref, or in the preservation archive.
