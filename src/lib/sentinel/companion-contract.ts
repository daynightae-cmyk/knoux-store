import { companionTopics } from './public-build-guide';
import type { GuideEntry, GuideLanguage } from './guide';
import { isGuideLanguage, normalizeGuideLanguage } from './languages';

export type CompanionContext = { route: string; target: string; section?: string; topic?: string; field?: string; role?: 'page'|'section'|'link'|'button'|'field' };
export type CompanionRequest = { id: string; language: GuideLanguage; context: CompanionContext; question: string };
export const COMPANION_MAX_QUESTION = 600;
export const COMPANION_MAX_RESPONSE = 2400;
export const companionSections: Record<string,string[]> = { '/products':['register','ledger'], '/solutions':['solution-handoff','solution-layer-detail'], '/engineering':['engineering-dossiers'], '/contact':['contact-form'] };
export const companionSectionFacts: Record<string,string> = {
  register:'KNOuX Systems Register: the published software records and their documented status.',
  ledger:'Repository ledger: audited KNOuX-branded repositories; non-KNOuX repositories are excluded.',
  'solution-handoff':'Business mission handoff: a chosen need, documented core layers, optional paths and an agreed next step.',
  'solution-layer-detail':'The selected core layer and links to its documented systems or services.',
  'engineering-dossiers':'Published engineering case evidence and its stated implementation constraints.',
  'contact-form':'Project or service enquiry; no claim of delivery without a configured service.',
};
export const companionFields: Record<string, Record<GuideLanguage, string>> = {
  name: {
    en: 'Contact name: enter the name you want KNOuX to use when replying.',
    ar: 'الاسم: اكتب الاسم الذي تريد أن يستخدمه فريق KNOuX عند الرد.',
    ur: 'رابطہ کا نام: وہ نام لکھیں جو KNOuX کو جواب دیتے وقت استعمال کرنا چاہیے۔',
  },
  email: {
    en: 'Contact email: enter an email address where the team can reply.',
    ar: 'البريد الإلكتروني: اكتب عنواناً يستطيع الفريق الرد عليه.',
    ur: 'رابطہ ای میل: وہ ای میل پتہ لکھیں جس پر ٹیم جواب دے سکے۔',
  },
  message: {
    en: 'Project message: describe your project and what you need. Do not include passwords or credentials.',
    ar: 'رسالة المشروع: صف مشروعك واحتياجك دون كلمات مرور أو بيانات اعتماد.',
    ur: 'پروجیکٹ کا پیغام: اپنے پروجیکٹ اور ضرورت بیان کریں۔ پاس ورڈ یا اسناد شامل نہ کریں۔',
  },
};
/** Field guidance in the visitor's language, always falling back to English. */
export function companionFieldLabel(field: string, language: GuideLanguage): string | null {
  return companionFields[field]?.[language] ?? companionFields[field]?.en ?? null;
}
export function parseCompanionRequest(value: unknown, catalog: GuideEntry[]): CompanionRequest | null {
  if(!value || typeof value!=='object' || Array.isArray(value)) return null;
  const record=value as Record<string,unknown>;
  // The language allowlist is derived from the single language authority rather
  // than repeated here, so adding a locale cannot silently leave the request
  // parser rejecting it.
  if(Object.keys(record).some(key=>!['id','language','context','question'].includes(key)) || typeof record.id!=='string' || !/^[a-f0-9-]{36}$/i.test(record.id) || !isGuideLanguage(record.language) || typeof record.question!=='string' || record.question.length>COMPANION_MAX_QUESTION || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(record.question)) return null;
  const context=record.context as Record<string,unknown> | undefined;
  if(!context || typeof context!=='object' || Array.isArray(context) || Object.keys(context).some(key=>!['route','target','section','topic','field','role'].includes(key)) || typeof context.route!=='string' || typeof context.target!=='string') return null;
  if(context.role!==undefined && !['page','section','link','button','field'].includes(String(context.role)))return null;
  if(!catalog.some(entry=>entry.route===context.route) || !catalog.some(entry=>entry.id===context.target)) return null;
  if(context.section!==undefined && (typeof context.section!=='string' || !companionSections[context.route]?.includes(context.section))) return null;
  if(context.topic!==undefined && (typeof context.topic!=='string' || !Object.hasOwn(companionTopics,context.topic) || !['/build/providers','/build/ai/providers'].includes(context.route)))return null;
  if(context.field!==undefined && (context.route!=='/contact' || typeof context.field!=='string' || !companionFields[context.field])) return null;
  return {id:record.id,language:normalizeGuideLanguage(record.language),question:record.question.trim(),context:context as CompanionContext};
}

export type CompanionEvent =
  | {type:'delta';text:string}
  | {type:'done';requestId:string;model:string;sourceIds:string[];usage:{inputTokens:number|null;outputTokens:number|null};latencyMs:number;estimatedUSD:number|null}
  | {type:'error';code:'UNAVAILABLE'|'CANCELLED'|'RESPONSE_LIMIT';retryable:boolean};

export function safeCompanionText(text: string): string {
  // Plain text only. Source links are rendered separately from a server allowlist.
  return text.replace(/https?:\/\/\S+|javascript:\S+|data:\S+/gi,'[link omitted]').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
}
