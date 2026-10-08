'use client';
import { useId } from 'react';
import type { NormalizedModel } from '@/lib/ai/types';
import { GENERATION_PROFILES, profileToControls, type GenerationProfile } from '@/lib/build/profile';
import styles from './generator.module.css';

const DESCRIPTIONS = { FAST: 'Compact output · measured latency and known cost preference', BALANCED: 'Normal routing · balanced output budget', DEEP: 'Extended output · known reasoning capability preference', MAX: 'Largest requested budget · known context and tool capability preference' };
export function GenerationProfileRail({ value, onChange, model, disabled }: { value: GenerationProfile; onChange: (value: GenerationProfile) => void; model: NormalizedModel | null; disabled?: boolean }) {
  const id = useId();
  const profile = profileToControls(value, model);
  return <div className={styles.profile}>
    <fieldset disabled={disabled}><legend>GENERATION PROFILE</legend><div className={styles.profileOptions}>{GENERATION_PROFILES.map((item) => <label key={item}><input type="radio" name={id} value={item} checked={value === item} onChange={() => onChange(item)} /><span>{item}</span></label>)}</div></fieldset>
    <p className={styles.note}>{DESCRIPTIONS[value]} · requested {profile.requested.maxOutputTokens.toLocaleString()} output tokens; effective {profile.controls.maxOutputTokens?.toLocaleString() ?? 'provider default'} · temperature {profile.controls.temperature ?? 'provider default'}.</p>
    <p className={styles.thinking}>Hidden reasoning: {profile.effort.replaceAll('_', ' ')}<span>Profiles adjust exposed generation controls. They do not tune hidden thinking.</span></p>
    {profile.constraints.length ? <p className={styles.note}>{profile.constraints.join(' ')}</p> : null}
  </div>;
}
