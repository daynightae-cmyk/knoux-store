'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type KeyboardEvent } from 'react';
import { describeEntry, entryForPage, findGuideEntries, guideEntryLabel, guideStatus, MAX_GUIDE_QUERY, type GuideEntry, type GuideLanguage } from '@/lib/sentinel/guide';
import { contextPrompt } from '@/lib/sentinel/context';
import { GUIDE_LANGUAGES, GUIDE_LANGUAGE_IDS, guideDirection, guideLanguageTag, speechLocale } from '@/lib/sentinel/languages';
import { visibleSectionText } from '@/lib/sentinel/visible-section';
import styles from './SentinelGuide.module.css';
import { setSentinelQuiet, subscribeSentinelQuiet, saveSentinelLanguage, sentinelPreferenceSnapshot, sentinelServerSnapshot, setSentinelOptions, resetSentinelPreferences } from './sentinel-preferences';

const text = {
  en: { title: 'Your guide to KNOuX', mode: 'Published-site guide · Not conversational AI', close: 'Close guide', page: 'Explain this page', read: 'Read this section', query: 'What do you need?', placeholder: 'A store, website, academy…', search: 'Find a service', source: 'Published source', empty: 'No published match. Try a simpler need, or use the Composer.', loading: 'Loading published sources…', error: 'Sources are unavailable. Close and reopen to retry.', privacy: 'Search stays in this panel. No forms, typing or pointer movements are sent to an agent.', speech: 'Browser speech is optional and may use your device’s speech service. No microphone is used.', play: 'Read aloud', replay: 'Replay', stop: 'Stop', mute: 'Mute', unavailable: 'Speech is unavailable in this browser.', original: 'Original section language; no automatic translation.', noSection: 'No readable section in the current viewport. Close the guide, scroll to a section and reopen.', ready: 'Ready', speaking: 'Reading aloud', status: 'Published status' },
  ar: { title: 'دليلك إلى KNOuX', mode: 'دليل السجلات المنشورة · ليس ذكاءً اصطناعياً حوارياً', close: 'إغلاق الدليل', page: 'اشرح هذه الصفحة', read: 'قراءة هذا القسم', query: 'ما الذي تحتاجه؟', placeholder: 'متجر، موقع، أكاديمية…', search: 'ابحث عن خدمة', source: 'المصدر المنشور', empty: 'لا توجد نتيجة منشورة مطابقة. جرّب وصفاً أبسط أو استخدم Composer.', loading: 'تحميل المصادر المنشورة…', error: 'المصادر غير متاحة. أغلق الدليل وافتحه للمحاولة مجدداً.', privacy: 'يبقى البحث داخل هذه اللوحة. لا تُرسل النماذج أو الكتابة أو حركة المؤشر إلى وكيل.', speech: 'النطق اختياري عبر المتصفح وقد يستخدم خدمة النطق في جهازك. لا يُستخدم الميكروفون.', play: 'قراءة بصوت', replay: 'إعادة القراءة', stop: 'إيقاف', mute: 'كتم', unavailable: 'النطق غير متاح في هذا المتصفح.', original: 'لغة القسم الأصلية؛ لا توجد ترجمة آلية.', noSection: 'لا يوجد قسم قابل للقراءة في الجزء الظاهر. أغلق الدليل وانتقل إلى قسم ثم افتحه.', ready: 'جاهز', speaking: 'تجري القراءة', status: 'الحالة المنشورة' },
  ur: { title: 'KNOuX کی رہنمائی', mode: 'شائع شدہ ریکارڈوں کا رہنما · گفتگو کرنے والے AI نہیں', close: 'رہنما بند کریں', page: 'یہ صفحہ سمجھائیں', read: 'یہ حصہ پڑھیں', query: 'آپ کو کیا چاہیے؟', placeholder: 'اسٹور، ویب سائٹ، اکادمی…', search: 'خدمت تلاش کریں', source: 'شائع شدہ ماخذ', empty: 'کوئی شائع شدہ نتیجہ نہیں ملا۔ آسان عبارت آزمائیں یا Composer استعمال کریں۔', loading: 'شائع شدہ ماخذ لوڈ ہو رہے ہیں…', error: 'ماخذ دستیاب نہیں۔ بند کر کے دوبارہ کھولیں۔', privacy: 'تلاش اسی پینل میں رہتی ہے۔ کوئی فارم، ٹائپنگ یا پوائنٹر حرکت کسی ایجنٹ کو نہیں بھیجی جاتی۔', speech: 'براؤزر کا تلفظ اختیاری ہے اور آپ کے آلے کی خدمت استعمال کر سکتا ہے۔ مائیکروفون استعمال نہیں ہوتا۔', play: 'بلند آواز میں پڑھیں', replay: 'دوبارہ پڑھیں', stop: 'روکیں', mute: 'خاموش', unavailable: 'اس براؤزر میں تلفظ دستیاب نہیں۔', original: 'حصے کی اصل زبان؛ کوئی خودکار ترجمہ نہیں۔', noSection: 'موجودہ منظر میں پڑھنے کے لیے کوئی حصہ نہیں۔ رہنما بند کریں، کسی حصے پر جائیں اور دوبارہ کھولیں۔', ready: 'تیار', speaking: 'پڑھ رہا ہے', status: 'شائع شدہ صورتحال' },
};

/**
 * Chrome for the settings block and the quiet toggle.
 *
 * Urdu is a distinct language, not a dialect of Arabic, so it carries its own
 * wording rather than inheriting Arabic copy. The lookup below falls back to
 * English for any language added to the authority without its own strings, so a
 * new locale degrades to readable English instead of an empty panel.
 */
const ui = {
  en: { quiet: 'Quiet mode', settings: 'Sentinel settings', legend: 'Companion preferences', sound: 'Allow read aloud on demand', tips: 'Contextual tips', reduced: 'Reduced animation', visible: 'Show mascot', note: 'Speech starts only when you press Read aloud. Quiet mode suppresses tips and speech, keeping your companion available.', reset: 'Reset preferences' },
  ar: { quiet: 'الوضع الهادئ', settings: 'إعدادات Sentinel', legend: 'تفضيلات رفيقك', sound: 'السماح بالقراءة الصوتية عند الطلب', tips: 'التلميحات السياقية', reduced: 'تقليل الحركة', visible: 'إظهار الشخصية', note: 'الصوت يبدأ فقط عند الضغط على القراءة. الوضع الهادئ يمنع التلميحات والصوت ويحافظ على الشخصية.', reset: 'إعادة ضبط التفضيلات' },
  ur: { quiet: 'خاموش موڈ', settings: 'Sentinel ترتیبات', legend: 'رفیق کی ترجیحات', sound: 'طلب پر بلند آواز میں پڑھنے کی اجازت', tips: 'سیاقی تجاویز', reduced: 'حرکت کم کریں', visible: 'کردار دکھائیں', note: 'آواز صرف اُس وقت شروع ہوتی ہے جب آپ پڑھیں دبائیں۔ خاموش موڈ تجاویز اور آواز روک دیتا ہے مگر رفیق دستیاب رہتا ہے۔', reset: 'ترجیحات دوبارہ ترتیب دیں' },
} as const;

export default function SentinelGuidePanel({ onClose, closing, character, contextEntry, onSpeaking }: { onClose: () => void; closing: boolean; character: ReactNode; contextEntry?: GuideEntry; onSpeaking: (active: boolean) => void }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const speechSerial = useRef(0);
  const preferences = JSON.parse(useSyncExternalStore(subscribeSentinelQuiet, sentinelPreferenceSnapshot, sentinelServerSnapshot));
  const language: GuideLanguage = preferences.language;
  const quiet: boolean = preferences.quiet;
  const [settings,setSettings] = useState(false);
  const [catalog, setCatalog] = useState<GuideEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<{ key: string; query?: string; section?: string; sectionLanguage?: string } | null>(null);
  const muted = !preferences.sound;
  const [speech, setSpeech] = useState({ key: '', active: false, used: false, error: false });
  const [voiceSupported, setVoiceSupported] = useState(false);
  const key = `${pathname}:${language}`;
  // Indexing the dictionary by the language authority. A language without its
  // own strings still resolves to English rather than rendering blanks.
  const t = text[language] ?? text.en;
  const strings = ui[language] ?? ui.en;
  const direction = guideDirection(language);
  const tag = guideLanguageTag(language);
  const selected = answer?.key === key ? answer : null;
  const pageEntry = contextEntry ?? entryForPage(catalog ?? [], pathname);
  const results = useMemo(() => selected?.query ? findGuideEntries(catalog ?? [], selected.query) : [], [catalog, selected]);
  const response = selected?.section ?? (selected?.query ? (results.length ? results.map(entry => describeEntry(entry, language)).join('\n\n') : t.empty) : describeEntry(pageEntry, language, pathname));
  const speaking = speech.key === key && speech.active && !quiet && !muted;

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    node?.querySelector<HTMLButtonElement>('[data-guide-close]')?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    fetch('/api/sentinel/catalog', { signal: controller.signal, credentials: 'omit' }).then(async result => {
      if (!result.ok) throw new Error('Catalog unavailable');
      const data = await result.json();
      setCatalog(data.entries);
    }).catch(() => { if (!controller.signal.aborted || node?.open) setFailed(true); }).finally(() => clearTimeout(timeout));
    // Feature detection after mounting; voices never start automatically.
    const detection = window.setTimeout(() => setVoiceSupported(typeof window.speechSynthesis?.speak === 'function' && typeof window.SpeechSynthesisUtterance === 'function'), 0);
    return () => { controller.abort(); clearTimeout(timeout); clearTimeout(detection); speechSerial.current++; window.speechSynthesis?.cancel(); node?.close(); document.body.style.overflow = previous; };
  }, []);
  useEffect(() => { speechSerial.current++; window.speechSynthesis?.cancel(); }, [key]);

  useEffect(() => { onSpeaking(speaking); }, [speaking,onSpeaking]);
  useEffect(() => { if(quiet || muted) { speechSerial.current++; window.speechSynthesis?.cancel(); } },[quiet,muted]);
  const stop = () => { speechSerial.current++; window.speechSynthesis?.cancel(); setSpeech(previous => ({ ...previous, active: false })); };
  const switchLanguage = (next: GuideLanguage) => { stop(); saveSentinelLanguage(next); };
  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),summary')].filter(control => control.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const speak = () => {
    if (!voiceSupported || muted || quiet || !catalog) return;
    const serial = ++speechSerial.current;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(response.slice(0, 3600));
    // Speech locale follows the selected language, so Urdu is spoken with an
    // Urdu voice rather than an Arabic one. Both scripts resolve to a real voice
    // only when the device has one; otherwise the existing unavailable notice
    // stands and nothing is silently mispronounced.
    utterance.lang = selected?.sectionLanguage ?? speechLocale(language);
    utterance.voice = window.speechSynthesis.getVoices().find(voice => voice.lang.startsWith(utterance.lang.split('-')[0])) ?? null;
    utterance.onend = () => setSpeech(previous => serial === speechSerial.current && previous.key === key ? { ...previous, active: false } : previous);
    utterance.onerror = () => setSpeech(previous => serial === speechSerial.current && previous.key === key ? { ...previous, active: false, error: true } : previous);
    setSpeech({ key, active: true, used: true, error: false });
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

  return <dialog id="sentinel-guide-panel" ref={dialog} className={styles.panel} data-closing={closing} data-reduced={preferences.reduced} lang={tag} dir={direction} data-sentinel-script={GUIDE_LANGUAGES[language]?.script ?? 'latin'} aria-labelledby="sentinel-guide-title" onKeyDown={trapFocus} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className={styles.header}>
      {character}
      <div><span className={styles.eyebrow}>KNOuX / SENTINEL</span><h2 id="sentinel-guide-title">{t.title}</h2><p>{t.mode}</p></div>
      <button data-guide-close type="button" onClick={onClose} aria-label={t.close}>×</button>
    </header>
    <div className={styles.content}>
      {pageEntry && <p className={styles.greeting}>{contextPrompt(pageEntry,language)}</p>}
      {/* The switcher is generated from the language authority, so adding a locale
          can never be forgotten — the option simply exists. Each button carries
          its own `lang` and `dir`, so the picker itself never renders in the
          wrong direction. */}
      <div className={styles.languages} aria-label="Language"><div role="group" aria-label="Language">{GUIDE_LANGUAGE_IDS.map(id => <button key={id} type="button" aria-pressed={language === id} onClick={() => switchLanguage(id)} lang={GUIDE_LANGUAGES[id].tag} dir={GUIDE_LANGUAGES[id].direction}>{GUIDE_LANGUAGES[id].label}</button>)}</div><button type="button" aria-pressed={quiet} onClick={() => { stop(); setSentinelQuiet(!quiet); }}>{strings.quiet}</button></div>
      <button className={styles.settingsToggle} type="button" aria-expanded={settings} aria-controls="sentinel-settings" onClick={() => setSettings(!settings)}>{strings.settings}</button>
      {settings && <fieldset id="sentinel-settings" className={styles.settings}><legend>{strings.legend}</legend>
        {([['sound',strings.sound],['tips',strings.tips],['reduced',strings.reduced],['visible',strings.visible]] as const).map(([option,label]) => <label key={option}><input type="checkbox" checked={preferences[option]} onChange={event => {stop();setSentinelOptions({[option]:event.target.checked});}} />{label}</label>)}
        <p>{strings.note}</p>
        <button type="button" onClick={() => {stop();resetSentinelPreferences();}}>{strings.reset}</button>
      </fieldset>}
      <div className={styles.actions}><button type="button" onClick={() => { stop(); setAnswer(null); }}>{t.page}</button><button type="button" onClick={readSection}>{t.read}</button></div>
      <form onSubmit={event => { event.preventDefault(); stop(); setAnswer({ key, query: query.trim() }); }}>
        <label htmlFor="sentinel-need">{t.query}</label><div className={styles.search}><input id="sentinel-need" value={query} onChange={event => setQuery(event.target.value)} maxLength={MAX_GUIDE_QUERY} autoComplete="off" placeholder={t.placeholder} /><button type="submit" disabled={!catalog || !query.trim()}>{t.search}</button></div>
      </form>
      <section className={styles.answer} aria-label={t.page}>
        <p role="status" aria-live="polite" aria-atomic="true">{failed ? t.error : !catalog ? t.loading : response}</p>
        {selected?.section && <small>{t.original}</small>}
        <nav aria-label={t.source}>{(selected?.query ? results : pageEntry ? [pageEntry] : []).map(entry => <Link key={entry.id} href={entry.route!} prefetch={false} onClick={stop}><strong>{guideEntryLabel(entry, language)} <span aria-hidden="true">↗</span></strong><small>{t.status}: <bdi>{guideStatus(entry.status, language)}</bdi></small></Link>)}</nav>
      </section>
      <div className={styles.voice}>
        <div><button type="button" disabled={!voiceSupported || muted || quiet || !catalog} onClick={speak}>{speech.used ? t.replay : t.play}</button><button type="button" onClick={stop} disabled={!speaking}>{t.stop}</button><button type="button" aria-pressed={muted} onClick={() => { stop(); setSentinelOptions({sound:muted}); }}>{t.mute}</button></div>
        <span role="status">{!voiceSupported || (speech.key === key && speech.error) ? t.unavailable : speaking ? t.speaking : t.ready}</span><p>{t.speech}</p>
      </div>
      <p className={styles.privacy}>{t.privacy}</p>
      <nav className={styles.actions} aria-label={language === 'ar' ? 'الخطوة التالية' : 'Next step'}><Link href="/solutions" prefetch={false} onClick={stop}>{language === 'ar' ? 'استكشف الحلول' : 'Explore Solutions'} ↗</Link><Link href="/build" prefetch={false} onClick={() => { stop(); onClose(); }}>Composer ↗</Link></nav>
    </div>
  </dialog>;
}
