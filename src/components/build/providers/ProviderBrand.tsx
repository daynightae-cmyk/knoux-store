const assets: Record<string, string> = {
  openai: 'openai.svg',
  anthropic: 'anthropic.svg',
  gemini: 'gemini.svg',
  google: 'google.svg',
  openrouter: 'openrouter.svg',
  deepseek: 'deepseek.svg',
  mistral: 'mistral.svg',
  ollama: 'ollama.svg',
  qwen: 'qwen.svg',
  'agent:opencode': 'opencode.svg',
  'agent:copilot': 'copilot.svg',
};
/**
 * Vendors that legitimately share a parent brand mark already declared in
 * sources.json. `opencode-go` is published by the same OpenCode project, so its
 * own mark is the correct identity.
 *
 * `opencode-console-v2` is a distinct workspace-bound service surface and uses
 * the same mark with a visual "V2" indicator in the gallery to distinguish it
 * from the coding agent and legacy surfaces.
 *
 * `grok` is deliberately NOT mapped onto the OpenRouter mark. Grok is reached
 * through OpenRouter as a transport, which is a routing fact, not a brand
 * identity; rendering OpenRouter's mark for a separate registry entry would make
 * two distinct providers look identical in the gallery. It falls back to its
 * name instead, which stays truthful.
 */
const aliases: Record<string, string> = {
  'opencode-go': 'opencode.svg',
  'opencode-console-v2': 'opencode.svg',
  'opencode-zen': 'opencode.svg',
};
export function providerBrandAsset(id: string): string | null {
  return assets[id] ?? aliases[id] ?? null;
}
export function isConsoleV2(id: string): boolean {
  return id === 'opencode-console-v2';
}
export function ProviderBrand({ id }: Readonly<{ id: string }>) {
  const asset = providerBrandAsset(id);
  const consoleV2 = isConsoleV2(id);
  return asset
    ? <span className="brand-orbit" data-provider-brand={id}>
        <img src={`/providers/${asset}`} width={34} height={34} alt="" aria-hidden="true" style={{ objectFit: 'contain', filter: ['openai', 'qwen', 'ollama'].includes(id) ? 'invert(1)' : undefined }} />
        {consoleV2 && <span className="v2-badge">V2</span>}
      </span>
    : null;
}
