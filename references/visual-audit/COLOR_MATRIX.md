# KNOuX Visual Audit — Color Matrix

Calculated with the WCAG 2 relative-luminance formula against the canonical dark background `#08090a`.

| Foreground | Background | Contrast ratio | Usage | Result | Required fix |
|---|---|---:|---|---|---|
| `#f1eee8` | `#08090a` | 17.25:1 | body / primary text | PASS | none |
| `#b8b5b4` | `#08090a` | 9.86:1 | supporting copy / large metadata | PASS | none |
| `#9a9899` | `#08090a` | 7.06:1 | secondary copy | PASS | none |
| `#a18acb` | `#08090a` | 6.67:1 | violet signal / links | PASS | use as an accent only |
| `#6d6e70` | `#08090a` | 3.91:1 | decorative / nonessential metadata | FAIL for normal body text | do not use for body copy, navigation, labels, forms, or critical status |
| `#6d6e70` | `#101113` | 3.42:1 | decorative metadata on elevated surface | FAIL for normal text | use `--muted` or `--text-dim` instead |
| `#f1eee8` | `#101113` | 15.56:1 | panel text | PASS | none |
| `#b8b5b4` | `#101113` | 8.89:1 | panel support text | PASS | none |
| `#a18acb` | `#101113` | 6.01:1 | active edge / signal | PASS | keep area occupancy restrained |
| `#08090a` | `#f1eee8` | 17.25:1 | primary off-white action | PASS | prefer over violet slabs |
| `#c2b5d8` | `#08090a` | 10.87:1 | soft violet signal text | PASS | use sparingly |
| `#c98d7d` | `#08090a` | 7.14:1 | error state | PASS | pair with explicit label/rule |
| `#a9d18e` | `#08090a` | 12.20:1 | success state | PASS | pair with explicit label/rule |
| `#e3c27a` | `#08090a` | 13.41:1 | warning state | PASS | pair with explicit label/rule |

## Acceptance notes

- Operational screens target approximately **85–92% neutral dark surfaces**, **5–10% neutral text/rules**, and **1–4% violet signaling**.
- Active navigation uses a neutral fill plus a violet inset rule; it does not use a purple gradient.
- `--dim` is reserved for decorative coordinates, disabled-like metadata, and nonessential micro-annotations.
- Color is never the only state indicator: labels, borders, text, and structure remain present.
