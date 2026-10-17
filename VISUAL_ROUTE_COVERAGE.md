# VISUAL_ROUTE_COVERAGE — KNOuX Store

Enumerated from current source (`src/app/**/page.tsx`, 72 page files). Grouped by family.

| Pattern | Source file | Family | Shared template | Dynamic params | Status | Required tests | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | src/app/page.tsx | 01 Home | HomeExperience | — | DONE | routes, a11y, visual | visual-audit/home/ |
| `/products` | src/app/products/page.tsx | 02 Software | ProductUniverse | — | DONE | routes, a11y, visual | visual-audit/products/ |
| `/products/[slug]` | src/app/products/[slug]/page.tsx | 02 Software | ProductDossier | slug | DONE | routes, a11y, visual | visual-audit/products/ (knoux-one desktop/mobile) |
| `/engineering` | src/app/engineering/page.tsx | 03 Engineering | — | — | PENDING | routes, a11y, visual | — |
| `/wordpress` | src/app/wordpress/page.tsx | 04 WordPress | — | — | PENDING | routes, a11y, visual | — |
| `/wordpress/solutions` | src/app/wordpress/solutions/page.tsx | 04 WordPress | — | — | PENDING | routes, visual | — |
| `/wordpress/themes` | src/app/wordpress/themes/page.tsx | 04 WordPress | catalog | — | PENDING | routes, visual | — |
| `/wordpress/plugins` | src/app/wordpress/plugins/page.tsx | 04 WordPress | catalog | — | PENDING | routes, visual | — |
| `/wordpress/blocks` | src/app/wordpress/blocks/page.tsx | 04 WordPress | catalog | — | PENDING | routes, visual | — |
| `/wordpress/patterns` | src/app/wordpress/patterns/page.tsx | 04 WordPress | catalog | — | PENDING | routes, visual | — |
| `/wordpress/starter-sites` | src/app/wordpress/starter-sites/page.tsx | 04 WordPress | catalog | — | PENDING | routes, visual | — |
| `/web` | src/app/web/page.tsx | 05 Web | SystemsStudio | — | PENDING | routes, a11y, visual | — |
| `/web/[slug]` | src/app/web/[slug]/page.tsx | 05 Web | — | slug | PENDING | routes, visual | — |
| `/growth` | src/app/growth/page.tsx | 06 Growth | GrowthExperience | — | PENDING | routes, a11y, visual | — |
| `/growth/[slug]` | src/app/growth/[slug]/page.tsx | 06 Growth | channel detail | slug | PENDING | routes, visual | — |
| `/creative` | src/app/creative/page.tsx | 07 Creative | MaterialLab | — | PENDING | routes, a11y, visual | — |
| `/creative/[slug]` | src/app/creative/[slug]/page.tsx | 07 Creative | discipline detail | slug | PENDING | routes, visual | — |
| `/solutions` | src/app/solutions/page.tsx | 08 Solutions | mission explorer | — | PENDING | routes, a11y, visual | — |
| `/solutions/[slug]` | src/app/solutions/[slug]/page.tsx | 08 Solutions | mission detail | slug | PENDING | routes, visual | — |
| `/build` | src/app/build/page.tsx | 09 Composer | Composer | — | PENDING | composer, a11y, visual | — |
| `/build/terminal` | src/app/build/terminal/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/settings` | src/app/build/settings/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/services` | src/app/build/services/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/providers` | src/app/build/providers/page.tsx | 10 Command | provider registry | — | PENDING | routes, visual | — |
| `/build/apps` | src/app/build/apps/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/powershell` | src/app/build/powershell/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/engineering` | src/app/build/engineering/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/pipeline` | src/app/build/pipeline/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/docs` | src/app/build/docs/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/deployments` | src/app/build/deployments/page.tsx | 09 Composer | — | — | PENDING | routes | — |
| `/build/ai` (+usage, models, senshial, control, providers, arena, router) | src/app/build/ai/** | 09 Composer | — | — | PENDING | routes | — |
| `/command` | src/app/command/page.tsx | 10 Command | command shell | — | PENDING | command a11y, visual | — |
| `/command/connections` | src/app/command/connections/page.tsx | 10 Command | — | — | PENDING | visual | — |
| `/command/clients, campaigns, leads, intelligence, analytics, reports, google, social, communities, creative, automations, settings` | src/app/command/** | 10 Command | — | — | PENDING | visual | — |
| `/work` | src/app/work/page.tsx | 11 Work | casefiles | — | PENDING | routes, visual | — |
| `/labs` | src/app/labs/page.tsx | 12 Labs | experiments | — | PENDING | routes, visual | — |
| `/about` | src/app/about/page.tsx | 13 Institution | OriginRoom | — | PENDING | routes, visual | — |
| `/contact` | src/app/contact/page.tsx | 14 Contact | RequestForm | — | PENDING | contact, visual | — |
| `/login`, `/register`, `/forgot-password`, `/update-password` | src/app/auth pages | 15 Auth | auth shell | — | PENDING | routes | — |
| `/account` | src/app/account/page.tsx | 15 Auth | account | — | PENDING | routes | — |
| `/signal` (+watchlist, settings, claim, business, lookup, my-number/**) | src/app/signal/** | 16 Signal | signal shell | — | PENDING | routes | — |

Notes:
- Catalog templates (themes/plugins/blocks/patterns/starter-sites) share `WordPressCatalog`; representative values only, no per-record duplicates.
- Command subpages share `command-shell.css`; pass the shell + representative pages.
