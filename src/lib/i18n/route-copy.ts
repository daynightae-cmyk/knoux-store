import type { SiteLanguage } from '@/lib/i18n/languages';

/**
 * Route copy that used to live in a second, page-local language system.
 *
 * PR #46 shipped an EN/AR toggle inside /growth, /wordpress and /signal that
 * had no relationship to the site-wide catalogue, so the header picker and the
 * page could show two different languages at the same time. The Arabic these
 * routes authored is preserved here verbatim; Urdu is authored alongside it so
 * the shipped Urdu is real rather than an English fallback.
 */
export const ROUTE_COPY: Record<string, readonly [string, string]> = {
  "Turn attention into": ["حوّل الاهتمام إلى", "توجہ توجہ کو"],
  "a clear next move.": ["خطوة واضحة.", "ایک واضح اگلا قدم۔"],
  "Strategy, creative and campaigns. One managed workflow, built around your business and reviewed with you before any advertising spend.": ["استراتيجية وإبداع وحملات ضمن مسار عمل مُدار، مصمم لعملك وتراجعه معنا قبل أي إنفاق إعلاني.", "حکمتِ عمل، تخلیق اور مہمات۔ ایک منظم عملی مسیر، آپ کے کاروبار کے مطابق، اور کسی بھی اشتہاری خرچ سے پہلے آپ کے ساتھ جائزہ کیا جاتا ہے۔"],
  "Start a growth brief": ["ابدأ موجز النمو", "نمو کا خلاصہ شروع کریں"],
  "Explore the studio": ["استكشف الاستوديو", "اسٹوڈیو دیکھیں"],
  "KNOuX service fees and client-paid media spend are scoped separately. No guaranteed returns.": ["تُحدد رسوم خدمات KNOuX وميزانية الإعلان المدفوعة من العميل بشكل منفصل. لا ضمان للعوائد.", "KNOuX کی خدمتی فیس اور کلائنٹ کی طرف سے ادا کی جانے والی میڈیا خرچ الگ طور پر طے کی جاتی ہے۔ کسی قسم کی پیش گوئی نہیں۔"],
  "Service operating map": ["خريطة مسار الخدمة", "خدمت کا عملی نقشہ"],
  "01 / Brief": ["01 / الموجز", "01 / خلاصہ"],
  "02 / Create": ["02 / الإبداع", "02 / تخلیق"],
  "03 / Review": ["03 / المراجعة", "03 / جائزہ"],
  "04 / Measure": ["04 / القياس", "04 / پیمائش"],
  "Human approval": ["موافقة بشرية", "انسانی منظوری"],
  "Verified sources": ["مصادر موثوقة", "تصدیق شدہ ذرائع"],
  "Managed service": ["خدمة مُدارة", "منظم خدمت"],
  "INTERACTIVE DEMO / READ-ONLY PRODUCT GLIMPSE": ["عرض توضيحي تفاعلي / معاينة للقراءة فقط", "انٹرایکٹو ڈیمو / صرف پڑھنے کے لیے مصنوعات کا نظارہ"],
  "Demonstration client data. Local layout approximation, not a published ad or a connected platform. No performance claims.": ["بيانات عميل تجريبي. محاكاة محلية للتنسيق وليست إعلاناً منشوراً أو منصة متصلة. دون ادعاءات أداء.", "ڈیمو کلائنٹ ڈیٹا۔ مقامی ترتیب کا تقریبی نمونہ، نہ کوئی شائع شدہ اشتہار اور نہ کوئی منسلک پلیٹ فارم۔ کوئی کارکردگی کا دعویٰ نہیں۔"],
  "The work behind the growth.": ["العمل الذي يدعم النمو.", "نمو کی پیچھے کا کام۔"],
  "A measurable plan": ["خطة قابلة للقياس", "پیمائش کے قابل منصوبہ"],
  "Define audience, channels, conversion actions and the scope of delivery.": ["تحديد الجمهور والقنوات وإجراءات التحويل ونطاق التسليم.", "مخاطب، چینلز، کنورژن ایکشنز اور فراہمی کی حد متعین کریں۔"],
  "Creative that stays connected": ["إبداع مترابط", "منسلک رہنے والا تخلیق"],
  "Review copy and placement together, with brand rules beside the work.": ["مراجعة النص والموضع معاً مع إرشادات العلامة التجارية.", "متن اور جگہ کا جائزہ ایک ساتھ، اور کام کے ساتھ برانڈ کے اصول۔"],
  "Decisions with evidence": ["قرارات تدعمها الأدلة", "شواہد کے ساتھ فیصلے"],
  "Approve a defined plan. Report verified sources and keep missing metrics visible.": ["اعتماد خطة محددة، وتقارير بمصادر موثوقة توضح المقاييس غير المتاحة.", "متعین منصوبہ منظور کریں۔ تصدیق شدہ ذرائع کی رپورٹ دیں اور جو پیمائش موجود نہیں اسے نظر سے ہٹا نہیں سکتے۔"],
  "This field is required.": ["هذا الحقل مطلوب.", "یہ خانہ لازمی ہے۔"],
  "Enter a valid email.": ["أدخل بريداً إلكترونياً صالحاً.", "درست ای میل پتہ درج کریں۔"],
  "Consent is required.": ["الموافقة مطلوبة.", "رضا مندی ضروری ہے۔"],
  "Request delivered.": ["تم تسليم الطلب.", "درخواست پہنچا دی گئی۔"],
  "UNCONFIGURED: Nothing was sent. Request delivery is unavailable; use the contact page for an alternative contact method. Your brief is preserved.": ["غير مُهيأ: لم يُرسل شيء. خدمة التسليم غير متاحة؛ استخدم صفحة الاتصال لطريقة بديلة. تم الاحتفاظ بالموجز.", "غیر ترتیب شدہ: کچھ بھی نہیں بھیجا گیا۔ درخواست کی ترسیل دستیاب نہیں؛ متبادل رابطے کے لیے رابطہ صفحہ استعمال کریں۔ آپ کا خلاصہ محفوظ ہے۔"],
  "Delivery failed. Your brief is preserved; try again.": ["تعذر التسليم. تم الاحتفاظ بالموجز؛ حاول مجدداً.", "ترسیل ناکام۔ آپ کا خلاصہ محفوظ ہے؛ دوبارہ کوشش کریں۔"],
  "Network error. Nothing confirmed delivered; your brief is preserved.": ["خطأ في الشبكة. لم يتأكد التسليم وتم الاحتفاظ بالموجز.", "نیٹ ورک کی خرابی۔ ترسیل کی تصدیق نہیں ہوئی؛ آپ کا خلاصہ محفوظ ہے۔"],
  "START WITH YOUR BUSINESS": ["لنبدأ بعملك", "اپنے کاروبار سے آغاز کریں"],
  "A useful brief. A real conversation.": ["موجز مفيد. حوار حقيقي.", "ایک مفید خلاصہ۔ ایک حقیقی گفتگو۔"],
  "Tell us what you need. Review the exact request before sending. This is an inquiry, not a quote or an advertising purchase.": ["أخبرنا باحتياجك وراجع الطلب قبل إرساله. هذا استفسار وليس عرض سعر أو شراء إعلان.", "ہمیں بتائیں آپ کو کیا درکار ہے۔ بھیجنے سے پہلے درخواست کا پورا جائزہ لیں۔ یہ ایک استفسار ہے، نہ کوئی قیمت نہ اشتہاری خریداری۔"],
  "Your details are used only to respond to this inquiry.": ["تُستخدم بياناتك فقط للرد على هذا الاستفسار.", "آپ کی تفصیلات صرف اس استفسار کے جواب کے لیے استعمال ہوتی ہیں۔"],
  "Business goal": ["هدف العمل", "کاروباری مقصد"],
  "Monthly media budget · client-paid": ["ميزانية الإعلان الشهرية · يدفعها العميل", "ماہانہ میڈیا بجٹ · کلائنٹ ادا کرتا ہے"],
  "Landing page / creative needed?": ["هل تحتاج صفحة هبوط أو مواد إبداعية؟", "لینڈنگ پیج / تخلیقی مواد درکار ہیں؟"],
  "Both": ["كلاهما", "دونوں"],
  "Landing page": ["صفحة هبوط", "لینڈنگ پیج"],
  "Creative assets": ["مواد إبداعية", "تخلیقی وسائل"],
  "Already available": ["متوفرة بالفعل", "پہلے سے موجود"],
  "I consent to KNOuX using these details to respond to this inquiry.": ["أوافق على استخدام KNOuX لهذه البيانات للرد على الاستفسار.", "میں رضا مندی دیتا ہوں کہ KNOuX اس استفسار کے جواب کے لیے ان تفصیلات استعمال کرے۔"],
  "Review exact request": ["راجع الطلب كاملاً", "پوری درخواست دیکھیں"],
  "Request summary": ["ملخص الطلب", "درخواست کا خلاصہ"],
  "Sending…": ["جارٍ الإرسال…", "بھیجا جا رہا ہے…"],
  "Send growth inquiry": ["إرسال استفسار النمو", "نمو کا استفسار بھیجیں"],
  "Your name": ["الاسم", "آپ کا نام"],
  "Business name": ["اسم النشاط", "کاروبار کا نام"],
  "Business category": ["فئة النشاط", "کاروبار کی قسم"],
  "Market / country": ["السوق / الدولة", "مارکیٹ / ملک"],
  "Target geography": ["الموقع المستهدف", "ہدف جغرافیائی علاقہ"],
  "Target languages": ["اللغات المستهدفة", "ہدف زبانیں"],
  "Current platforms": ["المنصات الحالية", "موجودہ پلیٹ فارمز"],
  "Leads": ["عملاء محتملون", "ممکنہ گاہک"],
  "Sales": ["مبيعات", "فروخت"],
  "Calls": ["مكالمات", "کالز"],
  "WhatsApp": ["واتساب", "واٹس ایپ"],
  "Bookings": ["حجوزات", "بکنگز"],
  "Brand": ["العلامة التجارية", "برانڈ"],
  "To be scoped": ["تُحدد لاحقاً", "بعد میں طے ہوگا"],
  "Your next website, in view.": ["موقعك القادم، أمامك.", "آپ کی اگلی ویب سائٹ، سامنے۔"],
  "Official WordPress.org themes": ["قوالب رسمية من WordPress.org", "WordPress.org کے سرکاری تھیمز"],
  "Choose a theme": ["اختر قالبًا", "تھیم منتخب کریں"],
  "Desktop": ["كمبيوتر", "ڈیسک ٹاپ"],
  "Tablet": ["جهاز لوحي", "ٹیبلٹ"],
  "Mobile": ["هاتف", "موبائل"],
  "Official screenshot · resized for comparison, not a live responsive site.": ["صورة رسمية · تغيير الحجم للمقارنة، وليست موقعًا متجاوبًا مباشرًا.", "سرکاری اسکرین شاٹ · موازنے کے لیے سائز بدلی گئی، لائیو ریسپانسو سائٹ نہیں۔"],
  "Compose a site request": ["تكوين طلب موقع", "سائٹ کی درخواست تیار کریں"],
  "Search the full catalogue": ["البحث في الكتالوج الكامل", "مکمل کیٹلاگ میں تلاش کریں"],
  "The official theme directory is unavailable. Browse again or compose a request without a theme.": ["دليل القوالب الرسمي غير متاح حاليًا. تصفح مجددًا أو أنشئ طلبًا دون قالب.", "سرکاری تھیم ڈائریکٹری دستیاب نہیں۔ دوبارہ دیکھیں یا بغیر تھیم کے درخواست تیار کریں۔"],
  "This theme has no official screenshot.": ["لا توجد صورة رسمية لهذا القالب.", "اس تھیم کی سرکاری اسکرین شاٹ موجود نہیں۔"],
  "Open official theme & live preview": ["فتح القالب والمعاينة الرسمية", "سرکاری تھیم اور لائیو پیش گاؤ کھولیں"],
  "Planning studio · nothing installed or published": ["استوديو تخطيط · لم يتم تثبيت أو نشر أي شيء", "تیاری کا اسٹوڈیو · کچھ بھی انسٹال یا شائع نہیں کیا گیا"],
  "Published by": ["نشر بواسطة", "شائع کنندہ"],
  "Screenshot unavailable. Open the official theme page.": ["الصورة غير متاحة. افتح صفحة القالب الرسمية.", "اسکرین شاٹ دستیاب نہیں۔ سرکاری تھیم صفحہ کھولیں۔"],
  "Screenshot width": ["عرض الصورة", "اسکرین شاٹ کی چوڑائی"],
  "Find public business contact evidence, with its source and limitations.": ["ابحث عن أدلة اتصال الأعمال العامة، مع مصدرها وحدودها.", "عوامی کاروباری رابطے کے شواہد تلاش کریں، ان کے ذرائع اور حدود کے ساتھ۔"],
  "Egypt · UAE · Saudi Arabia · Qatar · Kuwait · Bahrain · Oman. Business records are not a complete directory of personal identities.": ["مصر · الإمارات · السعودية · قطر · الكويت · البحرين · عُمان. بيانات الأعمال ليست دليلًا شاملًا لهوية الأفراد.", "مصر · UAE · سعودی عرب · قطر · کویت · بحرین · عمان۔ کاروباری ریکارڈ ذاتی شناختوں کا مکمل فہرست نہیں ہیں۔"],
  "Signal services": ["خدمات Signal", "Signal سروسز"],
  "Look up a number": ["البحث عن رقم", "نمبر تلاش کریں"],
  "Business evidence": ["بيانات الأعمال", "کاروباری شواہد"],
  "Privacy & consent": ["الخصوصية والموافقة", "رازداری اور رضا مندی"],
  "Phone number": ["رقم الهاتف", "فون نمبر"],
  "Country": ["الدولة", "ملک"],
  "Search a phone number": ["ابحث عن رقم هاتف", "فون نمبر تلاش کریں"],
  "Clear number": ["مسح الرقم", "نمبر صاف کریں"],
  "Resolve number": ["البحث عن أدلة الرقم", "نمبر کی تصدیق کریں"],
  "EVIDENCE ONLY": ["أدلة فقط", "صرف شواہد"],
  "NO SUPPORTED EVIDENCE FOUND": ["لا توجد أدلة مدعومة", "کوئی معتبر شواہد نہیں ملا"],
  "The number is structurally valid, but current providers returned no supported identity evidence.": ["صيغة الرقم صحيحة، لكن المصادر الحالية لم تُرجع أدلة هوية مدعومة.", "نمبر کی ساخت درست ہے، مگر موجودہ ذرائع نے کوئی معتبر شناختی شواہد واپس نہیں دیے۔"],
  "Edit brand profile": ["تعديل ملف العلامة", "برانڈ پروفائل میں ترمیم کریں"],
  "Brand profile saved.": ["تم حفظ ملف العلامة.", "برانڈ پروفائل محفوظ ہو گئی۔"],
  "Client and brand rules": ["العميل وقواعد العلامة", "کلائنٹ اور برانڈ کے اصول"],
  "Approved or live work must return through its review workflow before changing brand rules.": ["يجب مراجعة الأعمال المعتمدة أو المباشرة قبل تعديل قواعد العلامة.", "منظور شدہ یا جاری کام کو برانڈ کے اصول تبدیل کرنے سے پہلے اس کے جائزے کے عمل سے گزرنا چاہیے۔"],
  "City": ["المدينة", "شہر"],
  "Website": ["الموقع", "ویب سائٹ"],
  "Tone": ["الأسلوب", "لہجہ"],
  "Colors, one #RRGGBB per line": ["الألوان: لون #RRGGBB في كل سطر", "رنگ، ہر سطر میں ایک #RRGGBB"],
  "Fonts, one per line": ["الخطوط: خط في كل سطر", "فونٹس، ہر سطر میں ایک"],
  "Forbidden claims, one per line": ["الادعاءات الممنوعة: ادعاء في كل سطر", "ممنوعہ دعوے، ہر سطر میں ایک"],
  "Arabic style": ["أسلوب العربية", "عربی انداز"],
  "English style": ["أسلوب الإنجليزية", "انگریزی انداز"],
  "Save brand profile": ["حفظ ملف العلامة", "برانڈ پروفائل محفوظ کریں"],
  "New record": ["سجل جديد", "نیا ریکارڈ"],
  "An existing workspace owner can onboard a client. Initial owner access must be provisioned by the operator.": ["يمكن لمالك مساحة عمل إضافة عميل. يتطلب حساب المالك الأول تهيئة من المشغّل.", "موجودہ ورک اسپیس کا مالک کلائنٹ شامل کر سکتا ہے۔ ابتدائی مالک رسائی مشغّل کے ذریعے فراہم کی جاتی ہے۔"],
  "Brand tone": ["أسلوب العلامة", "برانڈ کا لہجہ"],
  "Campaign": ["الحملة", "مہم"],
  "Unassigned draft": ["مسودة غير مرتبطة", "غیر منسلک مسودہ"],
  "Budget in fils": ["الميزانية بالفلس", "فلس میں بجٹ"],
  "Start date": ["تاريخ البداية", "آغاز کی تاریخ"],
  "End date": ["تاريخ النهاية", "خاتمے کی تاریخ"],
  "Creates an Instagram lead campaign draft in AED. Edit channels and targeting in the campaign builder.": ["ينشئ مسودة حملة عملاء محتملين على إنستغرام بالدرهم. عدّل القنوات والاستهداف في محرّر الحملة.", "AED میں ایک Instagram لیڈ مہم کا مسودہ بناتا ہے۔ چینلز اور ٹارگٹنگ مہم کے تعمیر کنندہ میں بدلیں۔"],
  "Create draft": ["إنشاء المسودة", "مسودہ بنائیں"],
  "Create another": ["إنشاء سجل آخر", "ایک اور بنائیں"],
  "Saved. The workspace is refreshing.": ["تم الحفظ. جارٍ تحديث مساحة العمل.", "محفوظ ہو گیا۔ ورک اسپیس تازہ ہو رہی ہے۔"],
  "RESOLVING EVIDENCE": ["جارٍ البحث عن الأدلة", "شواہد کی تلاش جاری ہے"],
  "EVIDENCE RESOLVED": ["تم العثور على أدلة", "شواہد مل گئے"],
  "NO SUPPORTED EVIDENCE": ["لا توجد أدلة مدعومة", "کوئی معتبر شواہد نہیں"],
  "NUMBER READY": ["الرقم جاهز للبحث", "نمبر تلاش کے لیے تیار ہے"],
  "LOOKUP INTERRUPTED": ["تعذر إكمال البحث", "تلاش مکمل نہیں ہو سکی"],
  "RATE LIMITED": ["تم بلوغ حد الطلبات", "درخواست کی حد طے ہو گئی"],
  "LISTENING": ["أدخل رقمًا للبحث", "تلاش کے لیے نمبر درج کریں"],
  "Too many requests. Try again later.": ["طلبات كثيرة. حاول مجددًا لاحقًا.", "بہت زیادہ درخواستیں۔ بعد میں دوبارہ کوشش کریں۔"],
  "Enter a valid phone number and choose the country.": ["أدخل رقم هاتف صحيحًا واختر الدولة.", "درست فون نمبر درج کریں اور ملک منتخب کریں۔"],
  "The search could not be completed. No identity was established. Try again.": ["تعذر إكمال البحث. لم يتم إثبات أي هوية. حاول مجددًا.", "تلاش مکمل نہیں ہو سکی۔ کوئی شناخت ثابت نہیں ہوئی۔ دوبارہ کوشش کریں۔"],
  "Software Universe": ["عالم البرمجيات", "سافٹ ویئر کا عالم"],
  "Google Presence": ["الحضور على Google", "Google پر موجودگی"],
  "Reports": ["التقارير", "تقاریر"],
  "Clients": ["العملاء", "کلائنٹس"],
  "Campaigns": ["الحملات", "مہمات"],
  "Leads & Inbox": ["العملاء المحتملون", "ممکنہ گاہک اور ان باکس"],
  "Creative Studio": ["استوديو الإبداع", "تخلیقی اسٹوڈیو"],
  "Communities": ["المجتمعات", "کمیونٹیز"],
  "KNOuX Intelligence": ["ذكاء KNOuX", "KNOuX انٹیلیجنس"],
  "Automations": ["الأتمتة", "آٹومیشن"],
  "Connections": ["الاتصالات", "کنکشنز"],
};

/**
 * Resolve route-owned copy against the active site language.
 *
 * Returns undefined for strings this route does not own, so callers can fall
 * through to the shared catalogue instead of treating the English source as
 * the final answer.
 */
export function translatedRouteCopy(source: string, language: SiteLanguage): string | undefined {
  if (language === 'en') return source;
  const key = resolveRouteKey(source);
  if (!key) return undefined;
  /*
   * Arabic is slot 0 and Urdu slot 1. The slot is inlined rather than imported
   * from `languages.ts`: this module must stay a leaf with no runtime imports,
   * or the bundler is free to group it into a chunk every page loads and ship
   * route copy to pages that never show it.
   */
  return ROUTE_COPY[key][language === 'ar' ? 0 : 1];
}

/**
 * Resolve one route-owned string for one language.
 *
 * `arabic` is the route's own authored Arabic for the string; it wins over the
 * catalogue. English is the honest fallback when the route published nothing.
 * This module has no runtime imports by design: a route catalogue that imports
 * the language store ends up grouped into the shared chunk every page loads.
 */
export function resolveRouteCopy(language: SiteLanguage, english: string, arabic?: string): string {
  if (language === 'en') return english;
  if (language === 'ar') return arabic ?? translatedRouteCopy(english, 'ar') ?? english;
  return translatedRouteCopy(english, language) ?? english;
}

const routeKeys = new Map(Object.keys(ROUTE_COPY).map((key) => [key.toLowerCase(), key]));

function resolveRouteKey(source: string): string | undefined {
  return routeKeys.get(source.toLowerCase());
}
