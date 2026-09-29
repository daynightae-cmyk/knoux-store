# KNOuX Color Matrix

Generated from the canonical runtime tokens in `src/app/globals.css`.

| Foreground | Background | Contrast | Usage | Result | Required fix |
|---|---|---:|---|---|---|
| `#f1eee8` (text) | `#08090a` (bg) | 17.21:1 | body copy | **PASS** | None |
| `#b8b5b4` (text-dim) | `#08090a` (bg) | 9.78:1 | secondary copy | **PASS** | None |
| `#9a9899` (muted) | `#08090a` (bg) | 6.95:1 | navigation | **PASS** | None |
| `#f1eee8` (text) | `#16171a` (surface-2) | 15.48:1 | selected tab | **PASS** | None |
| `#b8b5b4` (text-dim) | `#08090a` (bg) | 9.78:1 | form instructions | **PASS** | None |
| `#08090a` (bg) | `#f1eee8` (text) | 17.21:1 | primary button | **PASS** | None |
| `#f1eee8` (text) | `#101113` (surface) | 16.31:1 | input value | **PASS** | None |
| `#9a9899` (muted) | `#101113` (surface) | 6.59:1 | placeholder | **PASS** | None |
| `#f1eee8` (text) | `#16171a` (surface-2) | 15.48:1 | active nav | **PASS** | None |
| `#a18acb` (violet) | `#08090a` (bg) | 6.66:1 | focus indicator | **PASS** | None |
| `#a9d18e` (signal-green) | `#08090a` (bg) | 11.58:1 | measured success | **PASS** | None |
| `#b8b5b4` (text-dim) | `#0d0e10` (panel) | 9.48:1 | table heading | **PASS** | None |
| `#c2b5d8` (violet-soft) | `#08090a` (bg) | 10.34:1 | links | **PASS** | None |
| `#6d6e70` (dim) | `#08090a` (bg) | 3.90:1 | nonessential disabled metadata | **FAIL** | Use text-dim or text for essential copy; reserve dim for decorative metadata. |
| `#c98d7d` (signal-red) | `#08090a` (bg) | 7.20:1 | actual failure | **PASS** | None |

## Usage rules

- `--dim` is limited to decorative, secondary, or disabled-like metadata.
- Violet is a signal for selection, focus, and brand emphasis, not a surface fill.
- Status colors are only used when the data reports a semantic status.
