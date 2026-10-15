'use client';
import {useId,useState,type FormEvent} from 'react';
import { useSiteCopy } from '@/components/i18n/SiteLanguage';
import styles from './providers.module.css';

export const credentialDocs:Record<string,string>={'opencode-console-v2':'https://opencode.ai/console',gemini:'https://ai.google.dev/gemini-api/docs/api-key',openai:'https://platform.openai.com/api-keys',anthropic:'https://console.anthropic.com/settings/keys',openrouter:'https://openrouter.ai/settings/keys',groq:'https://console.groq.com/keys',deepseek:'https://platform.deepseek.com/api_keys',mistral:'https://console.mistral.ai/'};
export function CredentialEntry({providerId,providerName,name,setName,secret,setSecret,replacing,busy,writable,onSubmit,onCancel}:{providerId:string;providerName:string;name:string;setName:(value:string)=>void;secret:string;setSecret:(value:string)=>void;replacing:boolean;busy:boolean;writable:boolean;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;onCancel:()=>void}){
 const t = useSiteCopy();
 const [visible,setVisible]=useState(false),id=useId();
 return <form className={styles.form} data-private onSubmit={event=>{setVisible(false);onSubmit(event);}}>
  <h3>{t(replacing?'Replace your credential':'Connect your AI provider')}</h3>
  <p>{t('Enter a {provider} API key. It is encrypted on the server and cannot be retrieved from this browser after saving.').replace('{provider}', providerName)}</p>
  {credentialDocs[providerId]&&<a href={credentialDocs[providerId]} target="_blank" rel="noopener noreferrer">{t('Get a key from {provider}').replace('{provider}', providerName)} ↗</a>}
  {!replacing&&<label htmlFor={`${id}-name`}>{t("Credential name")}<input id={`${id}-name`} required maxLength={80} autoComplete="off" value={name} onChange={e=>setName(e.target.value)}/></label>}
  <label htmlFor={`${id}-key`}>{t("API key")}</label>
  <div className={styles.keyEntry}><input id={`${id}-key`} type={visible&&secret?'text':'password'} autoComplete="new-password" autoCapitalize="none" spellCheck={false} required minLength={8} maxLength={8192} disabled={!writable||busy} value={secret} onChange={e=>setSecret(e.target.value)} aria-describedby={`${id}-privacy`}/><button type="button" aria-controls={`${id}-key`} aria-pressed={visible} disabled={!secret||busy} onClick={()=>setVisible(v=>!v)}>{t(visible?'Hide':'Show')}</button></div>
  <p id={`${id}-privacy`}>{t("Show reveals only the value you are entering. Saving clears it from this form. If saving fails, your input remains so you can correct it. Replacing a key requires a new connection test.")}</p>
  <div className={styles.actions}><button type="submit" value="save" disabled={!writable||busy}>{t(busy?'Saving…':replacing?'Save replacement':'Save key')}</button><button type="submit" value="test" disabled={!writable||busy}>{t("Save & Test Connection")}</button><button type="button" disabled={busy} onClick={()=>{setVisible(false);onCancel();}}>{t("Cancel")}</button></div>
  {!writable&&<p role="status">{t("Sign in to your workspace and configure the server vault to save a credential. No key is stored in browser storage.")}</p>}
 </form>;
}
