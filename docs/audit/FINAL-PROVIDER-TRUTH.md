# Provider runtime truth — 2026-10-07

Current calls use the recovered canonical src/lib/ai/contract.ts adapters. Declared capabilities never imply successful tool, vision, or structured-output execution. Models discovered in this run are in the companion JSON; pricing and context unknowns remain unknown. Historical source base44/setup-3259c13c at 2d5214b was merged via b783d52, followed by security reconciliation. DeepSeek uses its direct OpenAI-compatible endpoint, not Nebius. No credentials or generated content are recorded.

| Provider | Transport | Secret | Auth | Discovery | Generation | Streaming | Tools | Current status |
|---|---|---|---|---|---|---|---|---|
| openai | OpenAI | PRESENT | RUNTIME_VERIFIED | RUNTIME_VERIFIED | BLOCKED | BLOCKED | UNTESTED | BLOCKED |
| anthropic | Anthropic | PRESENT | UNAVAILABLE | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNAVAILABLE |
| gemini | Google Gemini | PRESENT | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | UNTESTED | RUNTIME_VERIFIED |
| openrouter | OpenRouter | PRESENT | UNAVAILABLE | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNAVAILABLE |
| groq | Groq | PRESENT | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | UNTESTED | RUNTIME_VERIFIED |
| mistral | Mistral | PRESENT | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | UNTESTED | RUNTIME_VERIFIED |
| deepseek | DeepSeek | PRESENT | RUNTIME_VERIFIED | RUNTIME_VERIFIED | BLOCKED | BLOCKED | UNTESTED | BLOCKED |
| qwen | Alibaba Model Studio | PRESENT | AUTH_REQUIRED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | AUTH_REQUIRED |
| grok | OpenRouter | PRESENT | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | RUNTIME_VERIFIED | UNTESTED | RUNTIME_VERIFIED |
| opencode-go | OpenCode Go | PRESENT | UNAVAILABLE | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNAVAILABLE |
| ollama | Ollama | NOT_REQUIRED | UNAVAILABLE | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNAVAILABLE |
| lm-studio | LM Studio | NOT_REQUIRED | UNAVAILABLE | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNAVAILABLE |
| custom-openai | OpenAI-compatible | MISSING | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | CONFIG_REQUIRED |
