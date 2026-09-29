# CSS Architecture Audit

| Selector/file | Problem | Risk | Recommended action | Implemented action |
|---|---|---|---|---|
| `src/components/build/dev/dev-workspace.css` | Independent blue-purple palette, duplicate late overrides, gradients, fragile `nth-of-type` grid | DEV diverged from public KNOuX and layout depended on child order | Use shared tokens and semantic classes | Replaced with one token-driven stylesheet and explicit dashboard classes |
| `src/components/build/dev/DevWorkspaceHome.tsx` | Dashboard placement coupled to DOM order | Reordering a panel silently changed layout | Add semantic layout classes | Added explicit semantic classes for every landing block |
| `src/components/build/dev/DevWorkspaceShell.tsx` | Landing content forced into operational shell grid | Hero and machine became trapped beside sidebar | Separate landing and operational shell modes | Added explicit landing/operational modes |
| `src/components/build/dev/ProductMachine.tsx` | Radial orbit implied a fake planetary system | Registry evidence lacked an architectural machine language | Use an evidence-driven device/registry | Replaced orbit with real-product registry rows and selected inspector |
| `src/app/globals.css` | Global token vocabulary was incomplete | DEV required a second palette | Define canonical aliases, radii, spacing, and status tokens | Added the canonical token authority |
