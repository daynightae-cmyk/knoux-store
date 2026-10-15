'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { isSentinelQuiet, readSentinelLanguage, saveSentinelLanguage, subscribeSentinelQuiet } from './sentinel-preferences';
import { describeEntry, entryForPage, findGuideEntries, MAX_GUIDE_QUERY, type GuideEntry, type GuideLanguage } from '@/lib/sentinel/guide';
import { visibleSectionText } from '@/lib/sentinel/visible-section';
import styles from './SentinelGuide.module.css';

const text = {
  en: { title: 'Your guide to KNOuX', mode: 'Published-site guide · Not conversational AI', close: 'Close guide', page: 'Explain this page', read: 'Read this section', query: 'What do you need?', placeholder: 'A store, website, academy…', search: 'Find a service', source: 'Published source', empty: 'No published match. Try a simpler need, or use the Composer.', loading: 'Loading published sources…', error: 'Sources are unavailable. Close and reopen to retry.', privacy: 'Search stays in this panel. No forms, typing or pointer movements are sent to an agent.', speech: 'Browser speech is optional and may use your device’s speech service. No microphone is used.', play: 'Read aloud', replay: 'Replay', stop: 'Stop', mute: 'Mute', unavailable: 'Speech is unavailable in this browser.', original: 'Original section language; no automatic translation.', noSection: 'No readable section in the current viewport. Close the guide, scroll to a section and reopen.', ready: 'Ready', speaking: 'Reading aloud', status: 'Published status' },
  ar: { title: 'دليلك إلى KNOuX', mode: 'دليل السجلات المنشورة · ليس ذكاءً اصطناعياً حوارياً', close: 'إغلاق الدليل', page: 'اشرح هذه الصفحة', read: 'قراءة هذا القسم', query: 'ما الذي تحتاجه؟', placeholder: 'متجر، موقع، أكاديمية…', search: 'ابحث عن خدمة', source: 'المصدر المنشور', empty: 'لا توجد نتيجة منشورة مطابقة. جرّب وصفاً أبسط أو استخدم Composer.', loading: 'تحميل المصادر المنشورة…', error: 'المصادر غير متاحة. أغلق الدليل وافتحه للمحاولة مجدداً.', privacy: 'يبقى البحث داخل هذه اللوحة. لا تُرسل النماذج أو الكتابة أو حركة المؤشر إلى وكيل.', speech: 'النطق اختياري عبر المتصفح وقد يستخدم خدمة النطق في جهازك. لا يُستخدم الميكروفون.', play: 'قراءة بصوت', replay: 'إعادة القراءة', stop: 'إيقاف', mute: 'كتم', unavailable: 'النطق غير متاح في هذا المتصفح.', original: 'لغة القسم الأصلية؛ لا توجد ترجمة آلية.', noSection: 'لا يوجد قسم قابل للقراءة في الجزء الظاهر. أغلق الدليل وانتقل إلى قسم ثم افتحه.', ready: 'جاهز', speaking: 'تجري القراءة', status: 'الحالة المنشورة' },
};

export default function SentinelGuidePanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const language: GuideLanguage = useSyncExternalStore(subscribeSentinelQuiet, readSentinelLanguage, () => 'en');
  const quiet = useSyncExternalStore(subscribeSentinelQuiet, isSentinelQuiet, () => false);
  const [catalog, setCatalog] = useState<GuideEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<{ key: string; query?: string; section?: string; sectionLanguage?: string } | null>(null);
  const [muted, setMuted] = useState(false);
  const [speech, setSpeech] = useState({ key: '', active: false, used: false });
  const [voiceSupported, setVoiceSupported] = useState(false);
  const key = `${pathname}:${language}`;
  const t = text[language];
  const selected = answer?.key === key ? answer : null;
  const pageEntry = entryForPage(catalog ?? [], pathname);
  const results = useMemo(() => selected?.query ? findGuideEntries(catalog ?? [], selected.query) : [], [catalog, selected]);
  const response = selected?.section ?? (selected?.query ? (results.length ? results.map(entry => describeEntry(entry, language)).join('\n\n') : t.empty) : describeEntry(pageEntry, language, pathname));
  const speaking = speech.key === key && speech.active && !quiet;

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    fetch('/api/sentinel/catalog', { signal: controller.signal, credentials: 'omit' }).then(async result => {
      if (!result.ok) throw new Error('Catalog unavailable');
      const data = await result.json();
      if (!Array.isArray(data.entries)) throw new Error('Invalid catalog');
      setCatalog(data.entries);
    }).catch(() => { if (!controller.signal.aborted || node?.open) setFailed(true); }).finally(() => clearTimeout(timeout));
    // Feature detection after mounting; voices never start automatically.
    const detection = window.setTimeout(() => setVoiceSupported(typeof window.speechSynthesis?.speak === 'function' && typeof window.SpeechSynthesisUtterance === 'function'), 0);
    return () => { controller.abort(); clearTimeout(timeout); clearTimeout(detection); window.speechSynthesis?.cancel(); node?.close(); document.body.style.overflow = previous; };
  }, []);
  useEffect(() => { window.speechSynthesis?.cancel(); }, [key, quiet]);

  const stop = () => { window.speechSynthesis?.cancel(); setSpeech(previous => ({ ...previous, active: false })); };
  const speak = () => {
    if (!voiceSupported || muted || quiet || !catalog) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(response.slice(0, 3600));
    utterance.lang = selected?.sectionLanguage ?? (language === 'ar' ? 'ar-AE' : 'en-GB');
    utterance.voice = window.speechSynthesis.getVoices().find(voice => voice.lang.startsWith(utterance.lang.split('-')[0])) ?? null;
    utterance.onend = utterance.onerror = () => setSpeech(previous => previous.key === key ? { ...previous, active: false } : previous);
    setSpeech({ key, active: true, used: true });
    window.speechSynthesis.speak(utterance);
  };
  const readSection = () => {
    stop();
    const headings = [...document.querySelectorAll('main h1,main h2,main h3')];
    const visible = headings.find(heading => { const rect = heading.getBoundingClientRect(); return rect.height > 0 && rect.top < innerHeight && rect.bottom > 0; });
    const section = visible?.closest('section') ?? visible?.parentElement;
    const content = section ? visibleSectionText(section) : '';
    setAnswer({ key, section: content || t.noSection, sectionLanguage: visible?.closest('[lang]')?.getAttribute('lang') ?? document.documentElement.lang ?? 'en' });
  };

  return <dialog id="sentinel-guide-panel" ref={dialog} className={styles.panel} lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="sentinel-guide-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>KNOuX / SENTINEL</span><h2 id="sentinel-guide-title">{t.title}</h2><p>{t.mode}</p></div>
      <button type="button" onClick={onClose} aria-label={t.close}>×</button>
    </header>
    <div className={styles.content}>
      <div className={styles.languages} aria-label="Language / اللغة"><button type="button" aria-pressed={language === 'en'} onClick={() => { stop(); saveSentinelLanguage('en'); }} lang="en">English</button><button type="button" aria-pressed={language === 'ar'} onClick={() => { stop(); saveSentinelLanguage('ar'); }} lang="ar">العربية</button></div>
      <div className={styles.actions}><button type="button" onClick={() => { stop(); setAnswer(null); }}>{t.page}</button><button type="button" onClick={readSection}>{t.read}</button></div>
      <form onSubmit={event => { event.preventDefault(); stop(); setAnswer({ key, query: query.trim() }); }}>
        <label htmlFor="sentinel-need">{t.query}</label><div className={styles.search}><input id="sentinel-need" value={query} onChange={event => setQuery(event.target.value)} maxLength={MAX_GUIDE_QUERY} autoComplete="off" placeholder={t.placeholder} /><button type="submit" disabled={!catalog || !query.trim()}>{t.search}</button></div>
      </form>
      <section className={styles.answer} aria-label={t.page}>
        <p role="status" aria-live="polite" aria-atomic="true">{failed ? t.error : !catalog ? t.loading : response}</p>
        {selected?.section && <small>{t.original}</small>}
        <nav aria-label={t.source}>{(selected?.query ? results : pageEntry ? [pageEntry] : []).map(entry => <Link key={entry.id} href={entry.route!} prefetch={false} onClick={onClose}><strong>{entry.name} <span aria-hidden="true">↗</span></strong><small>{t.status}: <bdi>{entry.status}</bdi></small></Link>)}</nav>
      </section>
      <div className={styles.voice}>
        <div><button type="button" disabled={!voiceSupported || muted || quiet || !catalog} onClick={speak}>{speech.used ? t.replay : t.play}</button><button type="button" onClick={stop} disabled={!speaking}>{t.stop}</button><button type="button" aria-pressed={muted} onClick={() => { stop(); setMuted(!muted); }}>{t.mute}</button></div>
        <span role="status">{!voiceSupported ? t.unavailable : speaking ? t.speaking : t.ready}</span><p>{t.speech}</p>
      </div>
      <p className={styles.privacy}>{t.privacy}</p>
      <nav className={styles.actions} aria-label={language === 'ar' ? 'الخطوة التالية' : 'Next step'}><Link href="/solutions" prefetch={false} onClick={onClose}>{language === 'ar' ? 'استكشف الحلول' : 'Explore Solutions'} ↗</Link><Link href="/build" prefetch={false} onClick={onClose}>Composer ↗</Link></nav>
    </div>
  </dialog>;
}
