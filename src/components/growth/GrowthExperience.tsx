'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { DEMO_CLIENTS } from '@/data/growth/clients';
import { creativesFor } from '@/data/growth/workspace';
import { PLACEMENTS, beginEdit, type PlacementId } from '@/lib/growth/studio';
import { PlacementPreview } from '@/components/command/studio/AdPreviewTheatre';
import styles from './growth-experience.module.css';

export function GrowthExperience() {
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [placement, setPlacement] = useState<PlacementId>('instagram-feed');
  const client = DEMO_CLIENTS[0];
  const creative = creativesFor(client.id)[0];
  const t = (en: string, ar: string) => locale === 'ar' ? ar : en;
  return <section className={`shell ${styles.experience}`} dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label="Growth OS introduction"><div className={styles.hero}><div className={styles.editorial}><div className={styles.kicker}>04 / KNOuX GROWTH OS <button type="button" onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}>{locale === 'en' ? 'العربية' : 'English'}</button></div><h1>{t('Turn attention into', 'حوّل الاهتمام إلى')}<em>{t('a clear next move.', 'خطوة واضحة.')}</em></h1><p>{t('Strategy, creative and campaigns. One managed workflow, built around your business and reviewed with you before any advertising spend.', 'استراتيجية وإبداع وحملات ضمن مسار عمل مُدار، مصمم لعملك وتراجعه معنا قبل أي إنفاق إعلاني.')}</p><div className={styles.actions}><a href="#growth-brief">{t('Start a growth brief', 'ابدأ موجز النمو')} ↗</a><Link href="/command/creative">{t('Explore the studio', 'استكشف الاستوديو')}</Link></div><p className={styles.note}>{t('KNOuX service fees and client-paid media spend are scoped separately. No guaranteed returns.', 'تُحدد رسوم خدمات KNOuX وميزانية الإعلان المدفوعة من العميل بشكل منفصل. لا ضمان للعوائد.')}</p><div className={styles.operatingMap} aria-label={t('Service operating map', 'خريطة مسار الخدمة')}>{[t('01 / Brief', '01 / الموجز'), t('02 / Create', '02 / الإبداع'), t('03 / Review', '03 / المراجعة'), t('04 / Measure', '04 / القياس')].map((step, index) => <span key={step} data-active={index === (placement === 'google-search' ? 3 : 1)}>{step}<small>{index === 2 ? t('Human approval', 'موافقة بشرية') : index === 3 ? t('Verified sources', 'مصادر موثوقة') : t('Managed service', 'خدمة مُدارة')}</small></span>)}</div></div><div className={styles.glimpse}><span className={styles.kicker}>{t('INTERACTIVE DEMO / READ-ONLY PRODUCT GLIMPSE', 'عرض توضيحي تفاعلي / معاينة للقراءة فقط')}</span><div className={styles.placements} role="group" aria-label="Public preview placement">{PLACEMENTS.map((item) => <button type="button" key={item.id} aria-pressed={placement === item.id} onClick={() => setPlacement(item.id)}>{item.label}</button>)}</div><div className={styles.preview}><PlacementPreview edit={{ ...beginEdit(creative, client.website), locale }} clientName={client.name} placement={placement} /></div><p className={styles.note}>{t('Demonstration client data. Local layout approximation, not a published ad or a connected platform. No performance claims.', 'بيانات عميل تجريبي. محاكاة محلية للتنسيق وليست إعلاناً منشوراً أو منصة متصلة. دون ادعاءات أداء.')}</p></div></div>
    <div className={styles.deliver}><h2>{t('The work behind the growth.', 'العمل الذي يدعم النمو.')}</h2>{[[t('A measurable plan', 'خطة قابلة للقياس'), t('Define audience, channels, conversion actions and the scope of delivery.', 'تحديد الجمهور والقنوات وإجراءات التحويل ونطاق التسليم.')], [t('Creative that stays connected', 'إبداع مترابط'), t('Review copy and placement together, with brand rules beside the work.', 'مراجعة النص والموضع معاً مع إرشادات العلامة التجارية.')], [t('Decisions with evidence', 'قرارات تدعمها الأدلة'), t('Approve a defined plan. Report verified sources and keep missing metrics visible.', 'اعتماد خطة محددة، وتقارير بمصادر موثوقة توضح المقاييس غير المتاحة.')]].map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
    <GrowthBrief locale={locale} />
  </section>;
}

const FIELDS = [
  ['name', 'Your name', 'الاسم'], ['email', 'Email', 'البريد الإلكتروني'], ['organisation', 'Business name', 'اسم النشاط'], ['category', 'Business category', 'فئة النشاط'], ['market', 'Market / country', 'السوق / الدولة'], ['geography', 'Target geography', 'الموقع المستهدف'], ['languages', 'Target languages', 'اللغات المستهدفة'], ['platforms', 'Current platforms', 'المنصات الحالية'],
] as const;
function GrowthBrief({ locale }: { locale: 'en' | 'ar' }) {
  const [review, setReview] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const t = (en: string, ar: string) => locale === 'ar' ? ar : en;
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const invalid: Record<string, string> = {};
    for (const [key] of FIELDS) if (!fields[key]?.trim()) invalid[key] = t('This field is required.', 'هذا الحقل مطلوب.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email ?? '')) invalid.email = t('Enter a valid email.', 'أدخل بريداً إلكترونياً صالحاً.');
    if (!fields.consent) invalid.consent = t('Consent is required.', 'الموافقة مطلوبة.');
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const message = ['KNOuX Growth qualification brief', ...['category', 'market', 'goal', 'geography', 'languages', 'platforms', 'assets', 'budgetBand'].map((key) => `${key}: ${fields[key]}`)].join('\n');
    setReview({ name: fields.name.trim(), email: fields.email.trim(), organisation: fields.organisation.trim(), message, requestType: 'growth', selectedItems: [], preferredChannels: fields.platforms.split(',').map((value) => value.trim()).filter(Boolean), budgetBand: fields.budgetBand, timeline: '', sourceInput: null, entryRoute: '/growth', website: fields.website ?? '' });
    setStatus('');
  }
  async function send() {
    if (!review || sending) return;
    setSending(true);
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(review) });
      const receipt = await response.json() as { delivered?: boolean };
      setStatus(response.ok && receipt.delivered === true ? t('Request delivered.', 'تم تسليم الطلب.') : response.status === 503 ? t('UNCONFIGURED: Nothing was sent. Request delivery is unavailable; use the contact page for an alternative contact method. Your brief is preserved.', 'غير مُهيأ: لم يُرسل شيء. خدمة التسليم غير متاحة؛ استخدم صفحة الاتصال لطريقة بديلة. تم الاحتفاظ بالموجز.') : t('Delivery failed. Your brief is preserved; try again.', 'تعذر التسليم. تم الاحتفاظ بالموجز؛ حاول مجدداً.'));
    } catch { setStatus(t('Network error. Nothing confirmed delivered; your brief is preserved.', 'خطأ في الشبكة. لم يتأكد التسليم وتم الاحتفاظ بالموجز.')); }
    finally { setSending(false); }
  }
  return <section id="growth-brief" className={styles.brief} aria-label="Growth qualification brief"><div><span className={styles.kicker}>{t('START WITH YOUR BUSINESS', 'لنبدأ بعملك')}</span><h2>{t('A useful brief. A real conversation.', 'موجز مفيد. حوار حقيقي.')}</h2><p>{t('Tell us what you need. Review the exact request before sending. This is an inquiry, not a quote or an advertising purchase.', 'أخبرنا باحتياجك وراجع الطلب قبل إرساله. هذا استفسار وليس عرض سعر أو شراء إعلان.')}</p><Link href="/privacy">{t('Privacy: used to respond to your inquiry.', 'الخصوصية: تُستخدم البيانات للرد على استفسارك.')}</Link></div><form noValidate onSubmit={prepare} onChange={() => { setReview(null); setStatus(''); }} className={styles.form}>{FIELDS.map(([key, en, ar]) => <label key={key}>{locale === 'ar' ? ar : en}<input aria-label={locale === 'ar' ? ar : en} name={key} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'email' ? 254 : 100} required dir={key === 'email' ? 'ltr' : undefined} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : key === 'organisation' ? 'organization' : undefined} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `brief-${key}-error` : undefined} />{errors[key] && <small id={`brief-${key}-error`}>{errors[key]}</small>}</label>)}<label>{t('Business goal', 'هدف العمل')}<select name="goal">{[['LEADS', 'Leads', 'عملاء محتملون'], ['SALES', 'Sales', 'مبيعات'], ['CALLS', 'Calls', 'مكالمات'], ['WHATSAPP', 'WhatsApp', 'واتساب'], ['BOOKINGS', 'Bookings', 'حجوزات'], ['BRAND', 'Brand', 'العلامة التجارية']].map(([value, en, ar]) => <option value={value} key={value}>{t(en, ar)}</option>)}</select></label><label>{t('Monthly media budget · client-paid', 'ميزانية الإعلان الشهرية · يدفعها العميل')}<select name="budgetBand">{['To be scoped', 'AED under 5,000', 'AED 5,000–15,000', 'AED 15,000–50,000', 'AED 50,000+'].map((value, index) => <option value={value} key={value}>{locale === 'ar' && index === 0 ? 'تُحدد لاحقاً' : value}</option>)}</select></label><label>{t('Landing page / creative needed?', 'هل تحتاج صفحة هبوط أو مواد إبداعية؟')}<select name="assets"><option value="Both">{t('Both', 'كلاهما')}</option><option value="Landing page">{t('Landing page', 'صفحة هبوط')}</option><option value="Creative">{t('Creative assets', 'مواد إبداعية')}</option><option value="Neither">{t('Already available', 'متوفرة بالفعل')}</option></select></label><div className={styles.honeypot} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div><label className={styles.consent}><input type="checkbox" name="consent" required />{t('I consent to KNOuX using these details to respond to this inquiry.', 'أوافق على استخدام KNOuX لهذه البيانات للرد على الاستفسار.')}{errors.consent && <small>{errors.consent}</small>}</label><button type="submit">{t('Review exact request', 'راجع الطلب كاملاً')} ↗</button>{review && <div className={styles.review}><h3>{t('Request summary', 'ملخص الطلب')}</h3><pre>{JSON.stringify(review, null, 2)}</pre><button type="button" disabled={sending || status === 'Request delivered.' || status === 'تم تسليم الطلب.'} onClick={send}>{sending ? t('Sending…', 'جارٍ الإرسال…') : t('Send growth inquiry', 'إرسال استفسار النمو')}</button></div>}<p role="status">{status}</p></form></section>;
}
