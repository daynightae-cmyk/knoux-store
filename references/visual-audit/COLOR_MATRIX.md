# Color matrix: measured production tokens

The single `:root` in `src/app/globals.css` owns the palette. `/build` aliases it through `--dev-*`; it does not define another brand palette. Ratios below use WCAG 2.1 relative luminance and the actual token values in this branch.

| Use | Foreground | On `--bg` #08090a | On `--surface-2` #16171a | Decision |
| --- | --- | ---: | ---: | --- |
| Primary text | `--text` #f1eee8 | 17.21:1 | 15.48:1 | Normal text |
| Secondary text | `--text-dim` #b8b5b4 | 9.78:1 | 8.80:1 | Normal text |
| Metadata | `--muted` #9a9899 | 6.95:1 | 6.25:1 | Normal text |
| Small labels and control borders | `--dim` #8a8c8f | 5.91:1 | 5.32:1 | Normal text and meaningful boundaries |
| Focus / signal | `--violet` #a18acb | 6.66:1 | 5.99:1 | Focus and labels |
| Decorative rule | `--line` #292a2d | 1.39:1 | 1.25:1 | Decoration only |
| Decorative raised rule | `--line-strong` #3d3e43 | 1.87:1 | 1.68:1 | Decoration only |

The faint line tokens are not sufficient for meaningful control boundaries. The `/build` intent field, text area, search and app filters now use `--dim` for their borders; keyboard focus uses `--violet`. The prior `--dim` value #6d6e70 was 3.90:1 on `--bg` and failed normal-text contrast.

## Screen occupancy sample

For each curated 1440×900 first-viewport PNG, a pixel was classed as dark when its highest RGB channel was below 65, light when all channels exceeded 130, and violet when red exceeded green by 8%, blue exceeded green by 12%, and blue exceeded 70. This coarse classification checks for a purple surface takeover; it is not a substitute for element-level contrast or a full-page audit.

| Capture | Dark | Violet | Light |
| --- | ---: | ---: | ---: |
| [`/build` gate](verified/desktop-build-gate.png) | 96.9% | <0.1% | 2.3% |
| [`/build` workspace](verified/desktop-build-workspace.png) | 93.6% | 0.1% | 5.1% |
| [`/growth`](verified/desktop-growth.png) | 96.4% | <0.1% | 2.8% |
| [`/wordpress`](verified/desktop-wordpress.png) | 95.7% | <0.1% | 3.4% |

The category percentages do not sum to 100% because midtone and other pixels remain unclassified. The samples cover only the visible first viewport.
