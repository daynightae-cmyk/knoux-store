import 'server-only';
import type { SecretStoreStatus } from './integration-types';

/** A writable implementation must supply encrypted storage, authorization and audit. */
export interface SecretStoreAdapter {
  status(): SecretStoreStatus;
  read(name: string): Promise<string | null>;
  write?: (ownerId: string, name: string, value: string) => Promise<void>;
}

export class EnvironmentSecretStore implements SecretStoreAdapter {
  private readonly env: Record<string, string | undefined>;
  constructor(env: Record<string, string | undefined> = process.env) { this.env = env; }
  status(): SecretStoreStatus {
    return { mode: 'environment-only', writable: false, reason: 'SECRET STORAGE NOT CONFIGURED. Configure a server-side encrypted vault with owner authorization and audit before saving credentials. Existing environment credentials are read only.' };
  }
  async read(name: string): Promise<string | null> { return this.env[name]?.trim() || null; }
}
