'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '../workspace-context';
import styles from './studio.module.css';

export function BrandProfileEditor() {
  const { activeClient, isDemoWorkspace, uiLocale } = useWorkspace();
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const label = (en: string, ar: string) => uiLocale === 'ar' ? ar : en;
  if (isDemoWorkspace) return null;
  return <details className={styles.theatre} dir={uiLocale === 'ar' ? 'rtl' : 'ltr'}>
    <summary>{label('Edit brand profile', 'تعديل ملف العلامة')}</summary>
    <form className={styles.inspector} onSubmit={async event => {
      event.preventDefault(); setState('saving'); setMessage('');
      const form = new FormData(event.currentTarget);
      const value = (key: string) => String(form.get(key) ?? '');
      const lines = (key: string) => value(key).split('\n').map(item => item.trim()).filter(Boolean);
      try {
        const response = await fetch('/api/growth/clients', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
          clientId: activeClient.id, requestId: crypto.randomUUID(), expectedUpdatedAt: activeClient.updatedAt,
          name: value('name'), businessCategory: value('category'), city: value('city'), website: value('website'),
          brandTone: value('tone'), brandColors: lines('colors'), brandFonts: lines('fonts'), forbiddenClaims: lines('claims'),
          arabicStyle: value('arabic'), englishStyle: value('english'),
        }) });
        const payload = await response.json() as { reason?: string };
        if (!response.ok) throw new Error(payload.reason ?? 'Profile save failed.');
        setState('saved'); setMessage(label('Brand profile saved.', 'تم حفظ ملف العلامة.')); router.refresh();
      } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'Profile save failed.'); }
    }}>
      <fieldset disabled={state === 'saving' || state === 'saved'}>
        <legend>{label('Client and brand rules', 'العميل وقواعد العلامة')}</legend>
        <p>{label('Approved or live work must return through its review workflow before changing brand rules.', 'يجب مراجعة الأعمال المعتمدة أو المباشرة قبل تعديل قواعد العلامة.')}</p>
        <label>{label('Name', 'الاسم')}<input name="name" defaultValue={activeClient.name} required maxLength={200} /></label>
        <label>{label('Business category', 'نوع النشاط')}<input name="category" defaultValue={activeClient.businessCategory} maxLength={200} /></label>
        <label>{label('City', 'المدينة')}<input name="city" defaultValue={activeClient.city} maxLength={120} /></label>
        <label>{label('Website', 'الموقع')}<input name="website" type="url" defaultValue={activeClient.website} /></label>
        <label>{label('Tone', 'الأسلوب')}<textarea name="tone" defaultValue={activeClient.brand.tone} maxLength={2000} /></label>
        <label>{label('Colors, one #RRGGBB per line', 'الألوان: لون #RRGGBB في كل سطر')}<textarea name="colors" defaultValue={activeClient.brand.colors.join('\n')} dir="ltr" /></label>
        <label>{label('Fonts, one per line', 'الخطوط: خط في كل سطر')}<textarea name="fonts" defaultValue={activeClient.brand.fonts.join('\n')} /></label>
        <label>{label('Forbidden claims, one per line', 'الادعاءات الممنوعة: ادعاء في كل سطر')}<textarea name="claims" defaultValue={activeClient.brand.forbiddenClaims.join('\n')} /></label>
        <label>{label('Arabic style', 'أسلوب العربية')}<textarea name="arabic" defaultValue={activeClient.brand.arabicStyle} maxLength={2000} dir="rtl" /></label>
        <label>{label('English style', 'أسلوب الإنجليزية')}<textarea name="english" defaultValue={activeClient.brand.englishStyle} maxLength={2000} dir="ltr" /></label>
        <button type="submit">{state === 'saving' ? label('Saving…', 'جارٍ الحفظ…') : label('Save brand profile', 'حفظ ملف العلامة')}</button>
      </fieldset>
      {message && <p role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
    </form>
  </details>;
}
