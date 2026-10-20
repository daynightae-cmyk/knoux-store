import type { GuideEntry } from './guide';
// Published UI facts only. No owner profiles, credentials, inventory or usage.
export const publicBuildGuide: GuideEntry[] = [
  { id: 'public-build-providers', name: 'Providers & Models', route: '/build/providers', summary: 'Browse provider identities and connection states. Managing saved keys requires an authenticated workspace and a configured server vault. Saving, authentication, discovery and generation are separate facts.', status: 'active', division: 'institution', kind: 'route', terms: ['providers', 'keys', 'models'] },
  { id: 'public-build-ai-providers', name: 'AI providers', route: '/build/ai/providers', summary: 'Provider configuration and measured connection states. The page does not establish that an account or model is connected.', status: 'active', division: 'institution', kind: 'route', terms: ['providers', 'configuration'] },
  { id: 'public-build-models', name: 'Model catalog', route: '/build/ai/models', summary: 'Browse model metadata and documented capabilities. Unknown prices and limits remain unknown. Catalog discovery does not verify generation.', status: 'active', division: 'institution', kind: 'route', terms: ['models', 'capabilities', 'catalog'] },
];
export const companionTopics: Record<string, string> = {
  'provider:gemini': 'The Google Gemini provider panel separates its stored key, authentication, model discovery and generation. It does not prove this visitor has an active Gemini connection.',
  'provider:openai': 'The OpenAI provider panel provides write-only credential storage and a separate connection test. Saving a key does not verify generation or grant unlimited usage.',
  'provider:openrouter': 'OpenRouter is a routing gateway in KNOuX. A model author namespace does not prove the actual upstream route. Authentication and model discovery are separate measured facts.',
  'provider:opencode-go': 'OpenCode Go has its own provider identity and credential binding. It is separate from Console V2 and the private OpenCode agent. No runtime verification is implied by this card.',
  'provider:opencode-console-v2': 'OpenCode Console V2 uses a workspace-bound service-account credential. Connection testing reads configuration without inference. Only explicitly supported protocols can generate; unsupported protocols fail closed. Go credentials cannot verify Console V2.',
};
