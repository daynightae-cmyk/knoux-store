'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { GrowthChannelSlug, GrowthModule } from '@/data/growth';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import styles from './channel-workbench.module.css';

const text = {
  en: { title: 'Channel modules', setup: 'Setup', ongoing: 'Ongoing', activities: 'Included activities', action: 'Start a growth brief' },
  ar: { title: 'وحدات القناة', setup: 'إعداد', ongoing: 'تشغيل مستمر', activities: 'الأنشطة المتضمَّنة', action: 'ابدأ موجز النمو' },
  ur: { title: 'چینل ماڈیولز', setup: 'ابتدائی ترتیب', ongoing: 'مسلسل کام', activities: 'شامل سرگرمیاں', action: 'ترقی کا بریف شروع کریں' },
};

export function ChannelWorkbench({ channel, modules }: { channel: GrowthChannelSlug; modules: readonly GrowthModule[] }) {
  const copy = text[useSiteLanguage()];
  const [selectedId, select] = useState(modules[0]?.id);
  const current = modules.find((module) => module.id === selectedId) ?? modules[0];
  if (!current) return null;

  return (
    <section className={`shell ${styles.workbench}`} data-channel={channel} aria-labelledby="channel-workbench-title">
      <h2 id="channel-workbench-title">{copy.title}</h2>
      <div className={styles.layout}>
        <div className={styles.modules} role="group" aria-labelledby="channel-workbench-title">
          {modules.map((module) => (
            <button key={module.id} type="button" aria-pressed={module.id === current.id} aria-controls="channel-module-preview" onClick={() => select(module.id)}>
              <span>{module.code}</span>
              <strong>{module.name}</strong>
            </button>
          ))}
        </div>
        <div className={styles.preview} id="channel-module-preview">
          <div className={styles.halo} aria-hidden="true" />
          <div className={styles.record} aria-live="polite" aria-atomic="true">
            <span className={styles.kind}>{current.setup ? copy.setup : copy.ongoing}</span>
            <h3>{current.name}</h3>
            <p>{current.statement}</p>
            <h4>{copy.activities}</h4>
            <ul>{current.activities.map((activity) => <li key={activity}>{activity}</li>)}</ul>
          </div>
          <Link className="action" href="/contact?requestType=growth">{copy.action} <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
