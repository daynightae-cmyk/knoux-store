'use client';
import { useState } from 'react';
import { validateCustomProvider } from '@/lib/build/custom-provider';
import styles from './providers.module.css';
/** Declaration validation is separate from server discovery and never grants capability. */
export function CustomMetadata() {
    const [message, setMessage] = useState('');
    return <details className={styles.profile}><summary>Validate a non-secret endpoint declaration</summary><form className={styles.form} onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); setMessage(validateCustomProvider({ displayName: String(fields.get('name')), baseUrl: String(fields.get('endpoint')), apiKeyRequired: true, modelIds: String(fields.get('models')).split(',').map(value => value.trim()).filter(Boolean), headerNames: String(fields.get('headers')).split(',').map(value => value.trim()).filter(Boolean), capabilities: [] }) ?? 'Declaration valid. This does not persist a provider, discover a model or verify a capability. Bind an endpoint through a server profile and test it.'); }}><label>Declaration name<input required name="name" maxLength={80}/></label><label>Declared endpoint<input required type="url" name="endpoint"/></label><label>Declared model identifiers, comma separated<input required name="models"/></label><label>Non-secret header names, comma separated<input name="headers"/></label><button>Validate metadata</button></form>{message ? <p role="status">{message}</p> : null}</details>;
}
