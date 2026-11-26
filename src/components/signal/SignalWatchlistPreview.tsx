'use client';

import { useState } from 'react';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import styles from './watchlist-preview.module.css';

const exampleKinds = ['profile', 'business', 'community'] as const;
type Kind = (typeof exampleKinds)[number];

const copy = {
  en: { title: 'Watchlist Design Preview', notice: 'Simulated evidence events. Monitoring is unavailable.', choose: 'Evidence filter', sample: 'Example event', shown: 'Shown in this preview', hidden: 'Hidden by this preview filter', profile: 'Verified profile', business: 'Public business listing', community: 'Community alias' },
  ar: { title: 'معاينة تصميم قائمة المتابعة', notice: 'أحداث أدلة تجريبية. المراقبة غير متاحة.', choose: 'فلتر الأدلة', sample: 'حدث تجريبي', shown: 'ظاهر في المعاينة', hidden: 'مخفي بسبب فلتر المعاينة', profile: 'ملف موثّق', business: 'سجل نشاط تجاري علني', community: 'اسم من مساهمات المجتمع' },
  ur: { title: 'واچ لسٹ ڈیزائن کا پیش منظر', notice: 'فرضی شواہد کے واقعات۔ نگرانی دستیاب نہیں۔', choose: 'شواہد کا فلٹر', sample: 'مثالی واقعہ', shown: 'اس پیش منظر میں دکھائی دے رہا ہے', hidden: 'پیش منظر کے فلٹر سے چھپا ہوا ہے', profile: 'تصدیق شدہ پروفائل', business: 'عوامی کاروباری فہرست', community: 'کمیونٹی عرف' },
};

export function SignalWatchlistPreview() {
  const text = copy[useSiteLanguage()];
  const [enabled, setEnabled] = useState<Kind[]>(['profile']);
  const [example, setExample] = useState<Kind>('profile');
  const visible = enabled.includes(example);

  return (
    <section className={styles.preview} aria-labelledby="signal-watchlist-preview-title">
      <header>
        <h2 id="signal-watchlist-preview-title">{text.title}</h2>
        <p>{text.notice}</p>
      </header>
      <div className={styles.layout}>
        <fieldset className={styles.filters}>
          <legend>{text.choose}</legend>
          {exampleKinds.map((kind) => <label key={kind}>
            <input type="checkbox" checked={enabled.includes(kind)} onChange={(event) => {
              const checked = event.currentTarget.checked;
              setEnabled((current) => checked ? [...current, kind] : current.filter((item) => item !== kind));
            }} />
            {text[kind]}
          </label>)}
        </fieldset>
        <div className={styles.scene}>
          <label className={styles.sample}>{text.sample}<select value={example} onChange={(event) => setExample(event.currentTarget.value as Kind)}>
            {exampleKinds.map((kind) => <option value={kind} key={kind}>{text[kind]}</option>)}
          </select></label>
          <div className={styles.radar} data-visible={visible} aria-hidden="true"><span /></div>
          <p className={styles.status} role="status">{text[example]} · {visible ? text.shown : text.hidden}</p>
        </div>
      </div>
    </section>
  );
}
