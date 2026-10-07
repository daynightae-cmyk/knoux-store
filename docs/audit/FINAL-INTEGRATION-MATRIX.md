# Integration matrix — 2026-10-07

Status: IN PROGRESS. Source presence and offline tests are static evidence; configuration and live calls are separate. The canonical provider page now consumes the recovered runtime and the old runtime provider page redirects to it. Build Composer still uses its declared stack catalog; unifying every routing consumer remains pending. Growth screens still use labelled demo fixtures; the recovered persistence repository is not yet wired to every screen. OAuth callbacks and durable state consumption require deployment verification.

| Feature | Source | Canonical implementation | Runtime | Decision |
|---|---|---|---|---|
| Store | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/products | UNTESTED | MERGED; retain and verify |
| KNOuX Build | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/build | UNTESTED | MERGED; retain and verify |
| Build Providers | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/lib/ai/registry.ts | UNTESTED | MERGED; retain and verify |
| Historical DeepSeek runtime | base44/setup-3259c13c / 2d5214b09fb8c12f618fc0808a486d49ce3d182c; merged b783d52 | src/lib/ai/adapters/deepseek.ts | UNTESTED | PORTED; preserve canonical implementation |
| AI Runtime | base44/setup-3259c13c / 2d5214b09fb8c12f618fc0808a486d49ce3d182c; merged b783d52 | src/lib/ai | UNTESTED | PORTED; preserve canonical implementation |
| Model Router | base44/setup-3259c13c / 2d5214b09fb8c12f618fc0808a486d49ce3d182c; merged b783d52 | src/lib/ai/router-v2.ts | UNTESTED | MERGED; retain and verify |
| Provider Registry | base44/setup-3259c13c / 2d5214b09fb8c12f618fc0808a486d49ce3d182c; merged b783d52 | src/lib/ai/registry.ts | UNTESTED | MERGED; retain and verify |
| Model Registry | base44/setup-3259c13c / 2d5214b09fb8c12f618fc0808a486d49ce3d182c; merged b783d52 | src/lib/ai/registry.ts | UNTESTED | MERGED; retain and verify |
| Secret Store | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/lib/build/secret-store.ts | UNTESTED | MERGED; retain and verify |
| Local Bridge | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | bridge/src | UNTESTED | MERGED; retain and verify |
| Systems Register | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/components/SystemsRegister.tsx | UNTESTED | MERGED; retain and verify |
| Supabase foundation | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692; recovered e784824 via 4b876a7 | supabase/migrations | UNTESTED | MERGED; retain and verify |
| Auth | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692; recovered e784824 via 4b876a7 | src/lib/growth/auth | UNTESTED | MERGED; retain and verify |
| Growth | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692; recovered e784824 via 4b876a7 | src/app/command | UNTESTED | PORTED; preserve canonical implementation |
| Social Media | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692; recovered e784824 via 4b876a7 | src/app/command/social | UNTESTED | PORTED; preserve canonical implementation |
| Campaigns | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/campaigns | UNTESTED | MERGED; retain and verify |
| Clients | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/clients | UNTESTED | MERGED; retain and verify |
| Leads | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/leads | UNTESTED | MERGED; retain and verify |
| Communities | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/communities | UNTESTED | MERGED; retain and verify |
| Connections | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692; recovered e784824 via 4b876a7 | src/app/command/connections | UNTESTED | MERGED; retain and verify |
| Google Presence | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/google | UNTESTED | MERGED; retain and verify |
| Analytics | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/analytics | UNTESTED | MERGED; retain and verify |
| Reports | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/reports | UNTESTED | MERGED; retain and verify |
| Automations | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/command/automations | UNTESTED | MERGED; retain and verify |
| Intelligence | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/lib/growth/intelligence | UNTESTED | MERGED; retain and verify |
| MCP | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | supabase/functions/knoux-store-mcp-gateway | UNTESTED | MERGED; retain and verify |
| KNOuX Agent integration | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/lib/growth/intelligence/adapters/knoux-agent.ts | UNTESTED | MERGED; retain and verify |
| WordPress ecosystem | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/wordpress | UNTESTED | MERGED; retain and verify |
| Labs | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/labs | UNTESTED | MERGED; retain and verify |
| Product experience | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/products | UNTESTED | MERGED; retain and verify |
| Home | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/page.tsx | UNTESTED | MERGED; retain and verify |
| About | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/app/about | UNTESTED | MERGED; retain and verify |
| global shell | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/components | UNTESTED | MERGED; retain and verify |
| responsive/navigation/accessibility | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | e2e | UNTESTED | MERGED; retain and verify |
| security fixes | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | src/lib/security/redact.ts | UNTESTED | MERGED; retain and verify |
| CI fixes | converge/post33-growth-closure / db620b4430ac6b10af42628c1cd715724fda3692 | .github/workflows/ci.yml | UNTESTED | MERGED; retain and verify |

Per-file overlap, untracked source and historical dispositions: FINAL-RECOVERY-INVENTORY.json and docs/recovery/convergence-sources-20261004.json. No blanket merge is authorized by these labels.
