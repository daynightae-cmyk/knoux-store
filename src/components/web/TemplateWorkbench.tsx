'use client';

import { useEffect, useRef, useState } from 'react';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { starterDocument, starterIdentity, type StarterIdentity, type StarterSystem } from '@/lib/web/starter';
import styles from './template-workbench.module.css';

const COPY = {
  en: ['Starter preview', 'First-party layout · editable local document', 'Desktop', 'Tablet', 'Mobile', 'Site name', 'Introduction', 'Accent color', 'Download HTML', 'Reset this starter', 'Saved in this browser', 'Storage unavailable; your edits remain in this preview', 'Use the system selector above to explore another starter.'],
  ar: ['معاينة القالب', 'تخطيط من KNOuX · مستند محلي قابل للتحرير', 'كمبيوتر', 'تابلت', 'موبايل', 'اسم الموقع', 'المقدمة', 'لون الهوية', 'تنزيل HTML', 'إعادة القالب للأصل', 'محفوظ في المتصفح', 'التخزين غير متاح؛ تعديلاتك موجودة في المعاينة', 'اختار نوع النظام فوق علشان تستكشف قالب تاني.'],
  ur: ['اسٹارٹر پیش منظر', 'اصل لے آؤٹ · قابل تدوین مقامی دستاویز', 'ڈیسک ٹاپ', 'ٹیبلٹ', 'موبائل', 'سائٹ کا نام', 'تعارف', 'شناخت کا رنگ', 'HTML ڈاؤن لوڈ', 'اسٹارٹر بحال کریں', 'اس براؤزر میں محفوظ', 'اسٹوریج دستیاب نہیں؛ تبدیلیاں پیش منظر میں موجود ہیں', 'دوسرا اسٹارٹر دیکھنے کے لیے اوپر سسٹم منتخب کریں۔'],
};
const DEVICES = [{ id: 'desktop', width: 1280 }, { id: 'tablet', width: 768 }, { id: 'mobile', width: 390 }] as const;

export function TemplateWorkbench({ system }: { system: StarterSystem }) {
  const language = useSiteLanguage();
  const copy = COPY[language];
  const [identity, setIdentity] = useState(() => starterIdentity(system));
  const [device, setDevice] = useState<typeof DEVICES[number]>(DEVICES[0]);
  const [available, setAvailable] = useState(true);
  const [saved, setSaved] = useState(false);
  const [width, setWidth] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const key = `knoux-web-starter:${system.slug}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) { setIdentity(starterIdentity(system, JSON.parse(raw))); setSaved(true); }
      } catch { setAvailable(false); }
    }, 0);
    return () => clearTimeout(timer);
  }, [key, system]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function update(next: StarterIdentity) {
    setIdentity(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setAvailable(true); setSaved(true); }
    catch { setAvailable(false); }
  }

  const document = starterDocument(system, identity, language === 'en' ? 'ltr' : 'rtl', language);
  function download() {
    const url = URL.createObjectURL(new Blob([document], { type: 'text/html;charset=utf-8' }));
    const link = window.document.createElement('a');
    link.href = url; link.download = `knoux-${system.slug}-starter.html`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const scale = width ? Math.min(1, width / device.width) : 1;
  return <section className={styles.workbench} aria-label={copy[0]}>
    <header className={styles.header}><div><span>KNOUX WEB</span><h3>{copy[0]}</h3><p>{copy[1]}</p></div>
      <div role="group" aria-label={copy[0]}>{DEVICES.map((entry, i) => <button key={entry.id} type="button" aria-pressed={device.id === entry.id} onClick={() => setDevice(entry)}>{copy[i + 2]}</button>)}</div>
    </header>
    <div className={styles.layout}>
      <div ref={stage} className={styles.stage} data-web-device={device.id}>
        <div className={styles.viewport} style={{ width: device.width * scale, height: 660 * scale }}>
          <iframe title={`${system.title} · ${copy[0]}`} sandbox="" srcDoc={document} style={{ width: device.width, height: 660, transform: `scale(${scale})` }} />
        </div>
      </div>
      <form className={styles.inspector} onSubmit={(event) => { event.preventDefault(); download(); }}>
        <label>{copy[5]}<input value={identity.name} maxLength={80} onChange={(event) => update({ ...identity, name: event.target.value })} /></label>
        <label>{copy[6]}<textarea value={identity.description} maxLength={500} rows={5} onChange={(event) => update({ ...identity, description: event.target.value })} /></label>
        <label>{copy[7]}<input type="color" value={identity.accent} onChange={(event) => update({ ...identity, accent: event.target.value })} /></label>
        <button type="submit">{copy[8]} ↓</button><button type="button" onClick={() => update(starterIdentity(system))}>{copy[9]}</button>
        <p role="status">{!available ? copy[11] : saved ? copy[10] : copy[12]}</p>
      </form>
    </div>
  </section>;
}
