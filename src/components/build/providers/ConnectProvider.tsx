'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { ProviderWorkspaceSnapshot } from '@/lib/ai/provider-os/types';
import styles from './providers.module.css';

type Props = {
    snapshot: ProviderWorkspaceSnapshot;
    command: (input: Record<string, unknown>) => Promise<ProviderWorkspaceSnapshot | null>;
};

/** Resumes partial onboarding using server-issued identities and revisions. */
export function ConnectProvider({ snapshot, command }: Readonly<Props>) {
    const [providerId, setProviderId] = useState('openai');
    const [name, setName] = useState('');
    const [secret, setSecret] = useState('');
    const [credentialId, setCredentialId] = useState<string | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const lock = useRef(false);
    const profile = snapshot.profiles.find(item => item.id === profileId);
    const ready = profile?.connection.auth === 'AUTHENTICATED' && profile.connection.discovery === 'DISCOVERY_VERIFIED';

    async function connect(event: FormEvent) {
        event.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        try {
            let current = snapshot;
            let credential = credentialId;
            if (!credential) {
                const saved = await command({ action: 'CREDENTIAL_CREATE', providerId, name: name.trim(), secret });
                if (!saved) return;
                setSecret('');
                credential = saved.credentials.find(item => !current.credentials.some(old => old.id === item.id) && item.providerId === providerId)?.id ?? null;
                if (!credential) { setNotice('Saved response needs a refresh. Inspect Credentials before retrying.'); return; }
                setCredentialId(credential);
                current = saved;
                setNotice('Key saved securely. Creating your workspace profile… / المفتاح اتحفظ.');
            }
            let selectedProfile = current.profiles.find(item => item.id === profileId);
            if (!selectedProfile) {
                const saved = await command({ action: 'PROFILE_CREATE', providerId, name: name.trim(), auth: { mode: 'API_KEY', credentialId: credential } });
                if (!saved) { setNotice('Key saved. Retry to finish linking this same credential.'); return; }
                selectedProfile = saved.profiles.find(item => !current.profiles.some(old => old.id === item.id) && item.providerId === providerId);
                if (!selectedProfile) { setNotice('Profile response needs a refresh. Inspect Profiles before retrying.'); return; }
                setProfileId(selectedProfile.id);
                current = saved;
            }
            if (!selectedProfile.active) {
                const switched = await command({ action: 'PROFILE_SWITCH', id: selectedProfile.id, version: selectedProfile.version });
                if (!switched) return;
                selectedProfile = switched.profiles.find(item => item.id === selectedProfile!.id);
            }
            if (!selectedProfile) return;
            const tested = await command({ action: 'TEST_CONNECTION', id: selectedProfile.id, version: selectedProfile.version });
            const measured = tested?.profiles.find(item => item.id === selectedProfile.id);
            setNotice(measured?.connection.auth === 'AUTHENTICATED' && measured.connection.discovery === 'DISCOVERY_VERIFIED'
                ? 'Connection verified. Choose a discovered model. / اختار الموديل.'
                : 'Profile saved; connection not verified. Retry tests on this profile without saving another key. / البروفايل اتحفظ، الاتصال محتاج إعادة اختبار.');
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    return <details className={styles.profile}>
        <summary>Connect provider / وصّل مزوّد</summary>
        <form className={styles.form} onSubmit={event => void connect(event)}>
            <label>Provider / المزوّد<select disabled={busy || !!credentialId} value={providerId} onChange={event => setProviderId(event.target.value)}>
                {snapshot.definitions.filter(item => item.authModes.includes('API_KEY')).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <label>Workspace profile name / اسم البروفايل<input required maxLength={80} disabled={busy || !!credentialId} value={name} onChange={event => setName(event.target.value)} /></label>
            {!credentialId ? <label>API key / مفتاح الاتصال<input type="password" autoComplete="new-password" required maxLength={8192} disabled={busy} value={secret} onChange={event => setSecret(event.target.value)} /></label> : null}
            <p>Save → link profile → select → test authentication and discover models. No generation charges during this test.</p>
            <button disabled={busy || !snapshot.secretStore.writable} type="submit">{busy ? 'Connecting…' : profileId ? 'Retry connection test' : credentialId ? 'Continue saved connection' : 'Save & connect'}</button>
            {notice ? <p role="status">{notice}</p> : null}
        </form>
        {ready ? <ul>{profile.models.filter(model => model.modalities.text && model.lifecycle !== 'deprecated' && model.catalog?.buildEligible !== false).map(model => <li key={model.modelId}>
            <code>{model.modelId}</code>{' '}
            <Link href={`/build/ai/control?${new URLSearchParams({ providerId, modelId: model.modelId, profileId: profile.id, workspaceId: snapshot.workspaceId ?? '' })}`}>Use in Build / استخدمه في Build ↗</Link>
        </li>)}</ul> : null}
    </details>;
}
