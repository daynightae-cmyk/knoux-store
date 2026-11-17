'use client';
import { useId } from 'react';
import type { NormalizedModel, GenerationControls } from '@/lib/ai/types';
import { profileToControls, type GenerationProfile } from '@/lib/build/profile';
import styles from './generator.module.css';

/** ModelControlsPanel — inline controls for the selected model.
 *  Shows temperature, max tokens, top-p, reasoning effort when supported.
 *  Values derive from the generation profile but can be overridden per-request.
 */
type Props = {
  model: NormalizedModel | null;
  profile: GenerationProfile;
  disabled?: boolean;
  onOverride?: (controls: Partial<GenerationControls>) => void;
};

export function ModelControlsPanel({ model, profile, disabled = false, onOverride }: Props) {
  const id = useId();
  const profileControls = profileToControls(profile, model).controls;
  const supportsReasoning = model?.capabilities.reasoning === 'SUPPORTED' || model?.capabilities.reasoning === 'VERIFIED';

  if (!model) return null;

  const renderControl = (key: keyof GenerationControls, label: string, value: GenerationControls[keyof GenerationControls], min?: number, max?: number, step?: number) => {
    if (value === undefined || value === null) return null;
    const controlId = `${id}-${key}`;
    return (
      <label key={key} className={styles.modelControl} htmlFor={controlId}>
        <span className={styles.modelControlLabel}>{label}</span>
        {typeof value === 'boolean' ? (
          <input id={controlId} type="checkbox" disabled={disabled} defaultChecked={value} onChange={(e) => onOverride?.({ [key]: e.target.checked })} />
        ) : typeof value === 'number' ? (
          <input id={controlId} type="range" disabled={disabled} min={min ?? 0} max={max ?? 1} step={step ?? 0.01} defaultValue={value} onChange={(e) => onOverride?.({ [key]: Number(e.target.value) })} />
        ) : (
          <input id={controlId} type="text" disabled={disabled} defaultValue={String(value)} onChange={(e) => onOverride?.({ [key]: e.target.value })} />
        )}
      </label>
    );
  };

  return (
    <div className={styles.modelControlsPanel}>
      <h4 className={styles.modelControlsTitle}>Model Controls</h4>
      <div className={styles.modelControlsGrid}>
        {renderControl('temperature', 'Temperature', profileControls.temperature, 0, 2, 0.1)}
        {renderControl('topP', 'Top-p', profileControls.topP, 0, 1, 0.05)}
        {renderControl('maxOutputTokens', 'Max Output Tokens', profileControls.maxOutputTokens, 1, model.maxOutputTokens ?? 8192, 1)}
        {supportsReasoning && renderControl('reasoningEffort', 'Reasoning Effort', profileControls.reasoningEffort)}
      </div>
      <p className={styles.note}>
        Profile: {profile} · {model.providerId} / {model.modelId} · {model.capabilities.streaming === 'VERIFIED' ? 'Streaming verified' : 'Streaming ' + model.capabilities.streaming}
      </p>
    </div>
  );
}