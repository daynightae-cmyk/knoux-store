export type CustomProviderMetadata = { displayName: string; baseUrl: string; apiKeyRequired: boolean; modelIds: string[]; headerNames: string[]; capabilities: string[] };
export function validateCustomProviderEndpoint(baseUrl:string):string|null {
  try { const url = new URL(baseUrl); if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return 'Base URL must be HTTPS without credentials, query or fragment.'; } catch { return 'Provide a valid HTTPS base URL.'; }
  return null;
}
/** No key or header values exist in this metadata schema. */
export function validateCustomProvider(value: CustomProviderMetadata): string | null {
  if (!value.displayName.trim() || value.displayName.length > 80) return 'Choose a display name of at most 80 characters.';
  const endpointError=validateCustomProviderEndpoint(value.baseUrl);if(endpointError)return endpointError;
  if (!value.modelIds.length || value.modelIds.length > 30 || value.modelIds.some((id) => !/^[A-Za-z0-9][A-Za-z0-9/_.:-]{0,119}$/.test(id))) return 'Declare 1–30 valid model IDs.';
  if (value.headerNames.length > 16 || value.headerNames.some((name) => !/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(name) || /authorization|cookie|key|token|secret/i.test(name))) return 'Declare non-secret header names only.';
  if (value.capabilities.some((name) => !['text', 'vision', 'tools', 'streaming', 'structuredOutput'].includes(name))) return 'Unknown capability.';
  return null;
}
