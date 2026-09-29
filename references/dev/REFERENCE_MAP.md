# KNOuX DEV reference freeze

The 14 supplied PNG files in `visual/` and the original Particleify export plus the three verbatim prompt appendices in `source/` are frozen implementation references. They are never served as production UI. Repeated Build and Settings screenshots are preserved as supplied.

| Reference | Controls | Borrow | Do not copy | Planned implementation |
| --- | --- | --- | --- | --- |
| DEV Workspace screenshot (`04_32_45 ص-1`) | Hero, sidebar, dense workspace panel proportions | Information hierarchy, calm graphite surfaces, violet selection | Example projects, providers, metrics, fake preview image | `KnouxDevParticleHero`, `DevWorkspaceShell`, `DevWorkspaceHome` |
| Build screenshots (`04_31_32`, `04_31_48`, `04_32_46 ص-2`) | Pipeline stage layout and details grid | Stage sequence, logs/tabs/target layout | Demo build IDs, log lines, deployment health | `BuildPipelinePage` using verification/capability state |
| Apps, Services (`04_32_46 ص-3`, `04_32_47 ص-4`) | List and selected inspector | Dense split panel, filters | Invented apps, telemetry, runtime status | `AppsPage`, `ServicesPage` using registries |
| Deployments (`04_32_48 ص-5`) | Environment and release layout | Tab/summary layout and empty state positions | Fake releases, counts, active rollout | `DeploymentsPage` using configured adapter facts |
| Docs (`04_32_48 ص-6`) | Reader and index layout | Three-column hierarchy | Fake article body/count/author | `DocsPage` using repository references |
| Terminal and PowerShell (`04_32_49 ص-7`, `04_32_50 ص-8`) | Tool panel composition | Tabs, console, inspector | Simulated shell output or unrestricted execution | `TerminalPage`, `PowerShellPage` using capability blockers |
| Providers (`04_32_50 ص-9`) | List, model/routing/usage hierarchy | Dense operational layout | Model health or usage statistics | `ProvidersPage` using server configuration status |
| Settings (`04_31_44`, `04_31_51`, `04_32_51 ص-10`) | Tabs and preference panels | Form grouping and hierarchy | Jordan Doe, team, connected services | `SettingsPage` using real session and local preferences |
| Appendix A / original Particleify | Particle text behavior | Seeded KNOuX→DEV repel/morph parameters | CDN, iframe, opaque full-page HTML | `KnouxDevParticleHero` |
| Appendix B / AGENT.OS | Product machine mechanics | One central object, connected selectable nodes | Brand, agents, telemetry, fake contracts | `ProductMachine` from `software.ts` |
| Appendix C / Pale Blue Dot | Entry mechanics | Full-screen gate, staged input, Enter transition | Earth, climate, audio, years | `BuildEntryGate` |

The local registry and Build OS contracts decide all labels, statuses, routes and enabled actions. Screenshots decide layout and visual rhythm only.
