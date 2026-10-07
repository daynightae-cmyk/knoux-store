# Provider runtime truth — 2026-10-07

Current calls use the recovered canonical src/lib/ai/contract.ts adapters. Declared capabilities never imply successful tool, vision, or structured-output execution. Models discovered in this run are in the companion JSON; pricing and context unknowns remain unknown. Historical source base44/setup-3259c13c at 2d5214b was merged via b783d52, followed by security reconciliation. DeepSeek uses its direct OpenAI-compatible endpoint, not Nebius. No credentials or generated content are recorded.

| Provider | Transport | Secret | Auth | Discovery | Generation | Streaming | Tools | Current status |
|---|---|---|---|---|---|---|---|---|
| openai | OpenAI | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| anthropic | Anthropic | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| gemini | Google Gemini | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| openrouter | OpenRouter | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| groq | Groq | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| mistral | Mistral | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| deepseek | DeepSeek | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| qwen | Alibaba Model Studio | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| grok | OpenRouter | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| opencode-go | OpenCode Go | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
| ollama | Ollama | PRESENT | UNAVAILABLE | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNAVAILABLE |
| lm-studio | LM Studio | PRESENT | UNAVAILABLE | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNAVAILABLE |
| custom-openai | OpenAI-compatible | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED | BLOCKED |
