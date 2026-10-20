# Real Gemini integration

The existing owner-controlled Gemini Developer API key was read into server memory from the migrated Base environment file, without editing or copying that file. The preview exposes no key to the client. No Vertex project ownership or billing tier is inferred from this key.

Authenticated model discovery and genuine streamed generation verified `gemini-3.1-flash-lite`. The older `gemini-2.5-flash` returned an actual availability error and was not retained. The implementation reuses the existing server-only GeminiAdapter. Responses are actual native SSE deltas, not canned text or a simulated typewriter. Provider failures produce a controlled unavailable state, never invented responses.

`e2e/companion-acceptance.mjs` records real Chrome journeys, request bodies containing only approved public metadata, DOM stream mutations, first-visible-token latency, completion latency, PNGs and WebM videos. `e2e/companion-live-security.mjs` additionally verified real injection refusal, duplicate rejection, cancellation and invalid Google credentials. Exact final paths and measured numbers are in `COMPANION_QA_RESULTS.md`; earlier failed runs are preserved.

The bounded generation uses 384 output tokens and an 8,000-byte input ceiling. A conservative reservation is 3,000 micro-USD per attempt. Reviewed SQL enforces 200 daily global reservations, 40 per session and a 600,000 micro-USD daily ceiling; rejected session allocations deliberately still consume their global reservation. Estimates are token-price arithmetic, not a verified invoice or latency guarantee. Published text pricing checked during this continuation was $0.25/M input and $1.50/M output for this model: [Google pricing](https://ai.google.dev/gemini-api/docs/pricing).

Production activation is blocked pending deployment-owner review and installation of the shared budget function, approved server configuration and deployment verification. The local preview has explicitly local, process-bound ceilings and must not be published as a substitute for shared enforcement.
