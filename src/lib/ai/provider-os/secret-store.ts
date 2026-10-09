import 'server-only';
import { randomUUID } from 'node:crypto';
import { ProviderSecretCipher } from './secret-cipher';
import type { ProviderRepository } from './repository';
import type { SecretStoreAdapter } from '../../build/secret-store';
import { validName, validSecret, EMPTY_CONNECTION } from './policy';
/** Extends the existing SecretStore contract; plaintext remains in server process memory only. */
export class ScopedProviderSecretStore implements SecretStoreAdapter {
    private readonly repository: ProviderRepository;
    private readonly cipher: ProviderSecretCipher;
    constructor(repository: ProviderRepository, env: Record<string, string | undefined> = process.env) { this.repository = repository; this.cipher = new ProviderSecretCipher(env); }
    status() { return { mode: 'external-vault' as const, writable: this.cipher.writable(), reason: this.cipher.writable() ? 'Scoped authenticated encryption on the server; credentials are write-only in the browser.' : 'SECRET STORAGE NOT CONFIGURED. Set KNOUX_PROVIDER_VAULT_KEY server-side.' }; }
    async read(id: string): Promise<string | null> {
        const row = await this.repository.credentialRow(id);
        if (!row || row.revoked_at || !row.encrypted_value)
            return null;
        return this.cipher.decrypt(row.encrypted_value, { ownerId: this.repository.ownerId, workspaceId: this.repository.workspaceId, credentialId: id });
    }
    async create(providerId: string, name: string, value: string): Promise<string> {
        if (!validName(name) || !validSecret(value))
            throw new Error('Provide a credential name and a valid secret without line breaks.');
        const id = randomUUID();
        const encryptedValue = this.cipher.encrypt(value, { ownerId: this.repository.ownerId, workspaceId: this.repository.workspaceId, credentialId: id });
        await this.repository.command('CREDENTIAL_CREATE', { id, providerId, name: name.trim(), encryptedValue });
        return id;
    }
    async replace(id: string, version: number, value: string, rotate = false): Promise<void> {
        if (!validSecret(value))
            throw new Error('Provide a valid secret without line breaks.');
        const encryptedValue = this.cipher.encrypt(value, { ownerId: this.repository.ownerId, workspaceId: this.repository.workspaceId, credentialId: id });
        await this.repository.command(rotate ? 'CREDENTIAL_ROTATE' : 'CREDENTIAL_REPLACE', { id, version, encryptedValue, resetConnection: EMPTY_CONNECTION });
    }
    async revoke(id: string, version: number): Promise<void> { await this.repository.command('CREDENTIAL_REVOKE', { id, version, resetConnection: EMPTY_CONNECTION }); }
    async delete(id: string, version: number): Promise<void> { await this.repository.command('CREDENTIAL_DELETE', { id, version }); }
}
