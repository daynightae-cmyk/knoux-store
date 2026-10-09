'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { IntegrationSnapshot } from '@/lib/build/integration-types';
import styles from './providers.module.css';
/** Existing platform adapters remain reachable alongside the provider runtime. */
export function PlatformFacts() {
    const [data, setData] = useState<IntegrationSnapshot | null>(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    async function refresh() {
        setBusy(true);
        try {
            const response = await fetch('/api/build/integrations', { cache: 'no-store' });
            if (!response.ok)
                throw new Error('AUTH REQUIRED — sign in to inspect development-platform facts.');
            setData(await response.json());
            setMessage('');
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : 'Platform facts unavailable.');
        }
        finally {
            setBusy(false);
        }
    }
    return <details className={styles.profile}><summary>Development platforms & deployment facts</summary><p>GitHub, Supabase and Vercel configuration remains separate from model providers and coding agents.</p><button type="button" disabled={busy} onClick={() => void refresh()}>Read platform facts</button>{message ? <p role="status">{message}</p> : null}{data?.platforms.map(platform => <article className={styles.profile} key={platform.id}><h3>{platform.label}</h3><dl className={styles.facts}>{platform.facts.map(fact => <div key={fact.name}><dt>{fact.name}</dt><dd>{fact.state.toUpperCase()} · {fact.detail}</dd></div>)}</dl><p>{platform.requirements.join(' ')}</p></article>)}<p><Link href="/build/deployments">Deployment workspace ↗</Link></p></details>;
}
