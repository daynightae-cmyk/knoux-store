'use client';
import Link from 'next/link';
import { useEffect,useRef } from 'react';
import type { GuideEntry,GuideLanguage } from '@/lib/sentinel/guide';
import { guideEntryLabel } from '@/lib/sentinel/guide';
import { COMPANION_MAX_QUESTION } from '@/lib/sentinel/companion-contract';
import { GUIDE_LANGUAGES,guideLanguageTag,isRtlLanguage } from '@/lib/sentinel/languages';
import styles from './SentinelGuide.module.css';

export type CompanionReply={text:string;state:'idle'|'thinking'|'streaming'|'done'|'error';sources:string[];error?:string;model?:string};
export function KnouxThoughtBubble({language,reply,question,setQuestion,onAsk,onStop,onDismiss,onSources,onClear,catalog,composing}: {language:GuideLanguage;reply:CompanionReply;question:string;setQuestion:(value:string)=>void;onAsk:()=>void;onStop:()=>void;onDismiss:()=>void;onSources:()=>void;onClear:()=>void;catalog:GuideEntry[];composing:boolean}) {
  const rtl=isRtlLanguage(language),input=useRef<HTMLTextAreaElement>(null),active=reply.state==='thinking'||reply.state==='streaming';
  useEffect(()=>{if(composing)input.current?.focus();},[composing]);
/**
 * Thought-bubble copy.
 *
 * Previously every string was a binary `ar ? arabic : english` choice. That is
 * not merely incomplete once a third language exists — it actively misleads: an
 * Urdu visitor selecting "اردو" would still receive English sentences. Each
 * language now carries its own set, and the lookup falls back to English only for
 * a locale that genuinely has no strings yet.
 */
const copy = {
  en: { label: 'KNOuX AI companion', dismiss: 'Dismiss hint', your: 'Your AI companion', disclosure: 'Gemini · May be wrong; check published sources.', preparing: 'Preparing a reply…', prompt: 'What would you like to know?', rateLimited: 'Request limit reached. Wait a minute before retrying.', unavailable: 'AI is unavailable right now. Retry or browse published sources.', incomplete: 'The reply could not be completed', sources: 'Published sources', askLabel: 'Ask your companion', placeholder: 'A KNOuX question… no sensitive details', ask: 'Ask', stop: 'Stop', retry: 'Retry', sourcesSettings: 'Sources & settings', clear: 'Clear session', privacy: 'Session-only context. Questions and public context go to Google; form values are never read.' },
  ar: { label: 'رفيق KNOuX الذكي', dismiss: 'إخفاء التلميح', your: 'رفيقك الذكي', disclosure: 'Gemini · قد يخطئ؛ راجع المصادر المنشورة.', preparing: 'أحضّر الإجابة…', prompt: 'ما الذي تريد معرفته؟', rateLimited: 'بلغت حد الطلبات. انتظر دقيقة قبل إعادة المحاولة.', unavailable: 'الذكاء الاصطناعي غير متاح الآن. يمكنك إعادة المحاولة أو تصفح المصادر.', incomplete: 'تعذر إكمال الإجابة', sources: 'المصادر المنشورة', askLabel: 'اسأل رفيقك', placeholder: 'سؤال عن KNOuX… دون بيانات حساسة', ask: 'اسأل', stop: 'إيقاف', retry: 'إعادة المحاولة', sourcesSettings: 'المصادر والإعدادات', clear: 'مسح الجلسة', privacy: 'يبقى السياق في الجلسة. يُرسل السؤال والسياق العام إلى Google؛ لا تُقرأ قيم النماذج.' },
  ur: { label: 'KNOuX کا AI رفیق', dismiss: 'اشارہ ہٹا دیں', your: 'آپ کا AI رفیق', disclosure: 'Gemini · غلط ہو سکتا ہے؛ شائع شدہ ماخذ دیکھیں۔', preparing: 'جواب تیار ہو رہا ہے…', prompt: 'آپ کیا جاننا چاہتے ہیں؟', rateLimited: 'درخواستوں کی حد پوری ہو گئی۔ دوبارہ کوشش سے پہلے ایک منٹ انتظار کریں۔', unavailable: 'AI اس وقت دستیاب نہیں۔ دوبارہ کوشش کریں یا شائع شدہ ماخذ دیکھیں۔', incomplete: 'جواب مکمل نہیں ہو سکا', sources: 'شائع شدہ ماخذ', askLabel: 'اپنے رفیق سے پوچھیں', placeholder: 'KNOuX پر سوال… کوئی حساس تفصیل نہیں', ask: 'پوچھیں', stop: 'روکیں', retry: 'دوبارہ کوشش کریں', sourcesSettings: 'ماخذ اور ترتیبات', clear: 'سیشن صاف کریں', privacy: 'سیاق صرف اسی سیشن میں رہتا ہے۔ سوال اور عوامی سیاق Google کو جاتے ہیں؛ فارم کی قدروں کو کبھی نہیں پڑھا جاتا۔' },
} as const;
const strings = copy[language] ?? copy.en;
// Direction comes from the language authority, not from an `ar` literal, so
// Urdu mirrors correctly alongside Arabic and English stays LTR. `lang` carries
// the real tag so text-to-speech and font selection resolve per script.
return <aside className={`${styles.bubble} ${styles.aiBubble}`} data-sentinel-bubble data-companion-bubble data-ai-state={reply.state} data-ai-model={reply.model} data-proactive={!composing} dir={rtl?'rtl':'ltr'} lang={guideLanguageTag(language)} aria-label={strings.label} data-sentinel-script={GUIDE_LANGUAGES[language]?.script??'latin'}>
    <button className={styles.dismiss} type="button" aria-label={strings.dismiss} onClick={onDismiss}>×</button>
    <small>KNOuX · {strings.your}</small>
    <p className={styles.aiDisclosure}>{strings.disclosure}</p>
    <div className={styles.streamText} aria-busy={active} data-companion-answer>
      {reply.state==='thinking'?<p className={styles.thought}>{strings.preparing}</p>:<p>{reply.text || (reply.state==='error'?(reply.error==='RATE_LIMITED'?strings.rateLimited:strings.unavailable):strings.prompt)}</p>}
    </div>
    <span className={styles.srOnly} role="status" aria-live="polite">{reply.state==='done'?reply.text:reply.state==='error'?strings.incomplete:''}</span>
    {composing && !!reply.sources.length && <nav aria-label={strings.sources}>{catalog.filter(entry=>reply.sources.includes(entry.id)).slice(0,3).map(entry=><Link key={entry.id} href={entry.route!} prefetch={false}>{guideEntryLabel(entry,language)} ↗</Link>)}</nav>}
    {(composing||reply.state==='error') && <form onSubmit={event=>{event.preventDefault();onAsk();}}>
      <label htmlFor="companion-question">{strings.askLabel}</label>
      <textarea ref={input} id="companion-question" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={COMPANION_MAX_QUESTION} rows={2} autoComplete="off" placeholder={strings.placeholder} />
      <button type="submit" disabled={active||!question.trim()}>{strings.ask}</button>
    </form>}
    <div className={styles.aiActions}>{active?<button type="button" onClick={onStop}>{strings.stop}</button>:reply.state==='error'?<button type="button" onClick={onAsk}>{strings.retry}</button>:null}<button type="button" onClick={onSources}>{strings.sourcesSettings}</button><button type="button" onClick={onClear}>{strings.clear}</button></div>
    <p className={styles.aiDisclosure}>{strings.privacy}</p>
  </aside>;
}
