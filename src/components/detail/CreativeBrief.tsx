'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import styles from './creative-brief.module.css';

const copy = {
  en: { select: 'Choose deliverables', preview: 'Brief preview', action: 'Open this brief in Build', empty: 'Choose at least one deliverable to prepare a brief.' },
  ar: { select: 'اختَر المخرجات', preview: 'معاينة الموجز', action: 'افتح الموجز في Build', empty: 'اختَر مخرج واحد على الأقل لتجهيز الموجز.' },
  ur: { select: 'ڈلیوری ایبلز منتخب کریں', preview: 'بریف کا پیش منظر', action: 'یہ بریف Build میں کھولیں', empty: 'بریف تیار کرنے کے لیے کم از کم ایک ڈلیوری ایبل منتخب کریں۔' },
};

export function CreativeBrief({ title, deliverables }: { title: string; deliverables: readonly string[] }) {
  const text = copy[useSiteLanguage()];
  const [selected, setSelected] = useState<string[]>([]);
  const items = deliverables.filter((item) => selected.includes(item));
  const preset = `I need ${title.toLowerCase()} for a build. Include: ${items.join('; ')}.`;

  return (
    <div className={styles.brief}>
      <fieldset className={styles.choices}>
        <legend>{text.select}</legend>
        {deliverables.map((item) => (
          <label key={item}>
            <input type="checkbox" checked={selected.includes(item)} onChange={(event) => {
              const checked = event.currentTarget.checked;
              setSelected((previous) => checked ? [...previous, item] : previous.filter((value) => value !== item));
            }} />
            <span>{item}</span>
          </label>
        ))}
      </fieldset>
      <div className={styles.preview}>
        <h3>{text.preview}</h3>
        <div aria-live="polite" aria-atomic="true">
          {items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{text.empty}</p>}
        </div>
        {items.length > 0 && <Link href={`/build?preset=${encodeURIComponent(preset)}`} className="action">{text.action} <span aria-hidden="true">↗</span></Link>}
      </div>
    </div>
  );
}
