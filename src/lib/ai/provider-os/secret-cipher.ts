import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export type SecretEnvelope = {
    algorithm: 'AES-256-GCM';
    keyId: string;
    iv: string;
    tag: string;
    ciphertext: string;
};
export type SecretOwner = {
    ownerId: string;
    workspaceId: string;
    credentialId: string;
};
/** Authenticated encryption binds every value to its immutable owner/workspace/credential. */
export class ProviderSecretCipher {
    private readonly keys: Map<string, Buffer>;
    private readonly current: string;
    constructor(env: Record<string, string | undefined> = process.env) {
        this.current = env.KNOUX_PROVIDER_VAULT_KEY_ID?.trim() || 'primary';
        this.keys = new Map();
        const current = env.KNOUX_PROVIDER_VAULT_KEY?.trim();
        if (current)
            this.addKey(this.current, current);
        if (env.KNOUX_PROVIDER_VAULT_PREVIOUS_KEYS) {
            let previous: unknown;
            try {
                previous = JSON.parse(env.KNOUX_PROVIDER_VAULT_PREVIOUS_KEYS);
            }
            catch {
                throw new Error('Vault key configuration is invalid.');
            }
            if (!previous || typeof previous !== 'object' || Array.isArray(previous))
                throw new Error('Vault key configuration is invalid.');
            for (const [id, key] of Object.entries(previous))
                if (typeof key === 'string' && id !== this.current)
                    this.addKey(id, key);
                else
                    throw new Error('Vault key configuration is invalid.');
        }
    }
    private addKey(id: string, encoded: string) {
        const key = Buffer.from(encoded, 'base64');
        if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || key.length !== 32 || key.toString('base64') !== encoded)
            throw new Error('Vault requires a canonical base64-encoded 32-byte key.');
        this.keys.set(id, key);
    }
    writable(): boolean { return this.keys.has(this.current); }
    private aad(owner: SecretOwner) { return Buffer.from(JSON.stringify(['knoux-provider-v1', owner.ownerId, owner.workspaceId, owner.credentialId])); }
    encrypt(value: string, owner: SecretOwner): SecretEnvelope {
        const key = this.keys.get(this.current);
        if (!key)
            throw new Error('SECRET STORAGE NOT CONFIGURED. Set the server-only provider vault key.');
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        cipher.setAAD(this.aad(owner));
        const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
        return { algorithm: 'AES-256-GCM', keyId: this.current, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
    }
    decrypt(envelope: SecretEnvelope, owner: SecretOwner): string {
        try {
            const key = this.keys.get(envelope.keyId);
            if (!key || envelope.algorithm !== 'AES-256-GCM')
                throw new Error();
            const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
            decipher.setAAD(this.aad(owner));
            decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
            return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8');
        }
        catch {
            throw new Error('Credential decryption refused. Verify owner binding and server vault key.');
        }
    }
}
