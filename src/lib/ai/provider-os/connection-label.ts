import type { ProviderProfile } from './types';

/** Connection evidence only. VERIFIED does not establish generation or streaming. */
export function providerConnectionLabel(profile?: ProviderProfile): string {
  if (!profile) return 'NOT_CONFIGURED';
  const connection = profile.connection;
  if (!profile.enabled) return 'DISABLED';
  for (const category of ['RATE_LIMIT', 'QUOTA_EXCEEDED', 'BILLING_REQUIRED', 'PERMISSION_DENIED']) {
    if (connection.lastErrorCategory === category) return category === 'RATE_LIMIT' ? 'RATE_LIMITED' : category;
  }
  if (connection.auth === 'FAILED' || connection.discovery === 'FAILED') return 'FAILED';
  // Blocked facts must override retained successful authentication/discovery.
  if (connection.health === 'BLOCKED' || connection.health === 'LOCAL_RUNTIME_UNAVAILABLE') return 'UNAVAILABLE';
  if (connection.configuration !== 'CONFIGURED') return 'NOT_CONFIGURED';
  if (connection.auth === 'AUTHENTICATED' && connection.discovery === 'DISCOVERY_VERIFIED') return 'VERIFIED';
  if (connection.auth === 'AUTHENTICATED' || connection.configuration === 'CONFIGURED') return 'SAVED_UNTESTED';
  return 'NOT_CONFIGURED';
}
