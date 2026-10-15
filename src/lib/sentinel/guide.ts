import type { DiscoverableEntity, DivisionId } from '@/lib/entities';
import { type GuideLanguage } from './languages';

// `GuideLanguage` is re-exported so existing imports of it from this module keep
// resolving. The definition itself now lives in ./languages, which owns the
// language set, directions and scripts for the whole site.
export type { GuideLanguage } from './languages';
export type GuideEntry = Pick<DiscoverableEntity, 'id' | 'name' | 'summary' | 'route' | 'status' | 'division' | 'kind'> & { terms: string[] };
export const PUBLIC_READ_TOOLS = ['published_catalog'] as const;
export const MAX_GUIDE_QUERY = 256;

// A projection, never a copy of private runtime/provider configuration.
export function publicCatalog(entities: readonly DiscoverableEntity[]): GuideEntry[] {
  return entities.filter(entity => entity.route && /^\/(?!\/)[a-z0-9/-]*$/.test(entity.route)).map(entity => ({
    id: entity.id, name: entity.name, route: entity.route, status: entity.status, division: entity.division, kind: entity.kind,
    summary: entity.route === '/signal' ? 'Public business contact evidence with its source and limitations. Not verified private owner identities.' : entity.summary.slice(0, 480),
    terms: entity.searchTerms.slice(0, 12),
  }));
}

export const arabicDivisions: Record<DivisionId, string> = { software: 'البرمجيات', wordpress: 'ووردبريس', web: 'هندسة الويب', growth: 'النمو', creative: 'الإبداع', solutions: 'الحلول', labs: 'المختبر', institution: 'المؤسسة' };
export const urduDivisions: Record<DivisionId, string> = { software: 'سافٹ ویئر', wordpress: 'ورڈپریس', web: 'ویب انجینیئرنگ', growth: 'ترقی', creative: 'تخلیق', solutions: 'حل', labs: 'لیب', institution: 'ادارہ' };
const arabicNames: Record<string, string> = { '/solutions/start-a-business': 'تأسيس نشاط تجاري', '/solutions/launch-a-new-product': 'إطلاق منتج جديد', '/solutions/build-an-online-store': 'بناء متجر إلكتروني', '/solutions/digitise-operations': 'رقمنة العمليات', '/solutions/create-a-customer-portal': 'إنشاء بوابة للعملاء', '/solutions/promote-a-local-business': 'الترويج لنشاط محلي', '/solutions/build-an-academy-platform': 'بناء منصة أكاديمية', '/solutions/modernise-an-existing-website': 'تحديث موقع قائم', '/solutions': 'الحلول', '/contact': 'التواصل', '/engineering': 'الهندسة', '/products': 'المنتجات', '/web': 'هندسة الويب', '/growth': 'النمو', '/creative': 'الإبداع', '/labs': 'المختبر', '/about': 'عن KNOuX', '/': 'المقر الرقمي' };
const urduNames: Record<string, string> = { '/solutions/start-a-business': 'کاروبار شروع کریں', '/solutions/launch-a-new-product': 'نیا پروڈکٹ لانچ کریں', '/solutions/build-an-online-store': 'آن لائن اسٹور بنائیں', '/solutions/digitise-operations': 'کارروائیوں کو ڈیجیٹل بنائیں', '/solutions/create-a-customer-portal': 'گاہکوں کے لیے پورٹل بنائیں', '/solutions/promote-a-local-business': 'مقامی کاروبار کو بڑھاوہ دیں', '/solutions/build-an-academy-platform': 'اکیڈمی پلیٹ فارم بنائیں', '/solutions/modernise-an-existing-website': 'موجودہ ویب سائٹ کو جدید بنائیں', '/solutions': 'حل', '/contact': 'رابطہ', '/engineering': 'انجینیئرنگ', '/products': 'مصنوعات', '/web': 'ویب انجینیئرنگ', '/growth': 'ترقی', '/creative': 'تخلیق', '/labs': 'لیب', '/about': 'KNOuX کے بارے میں', '/': 'ڈیجیٹل مرکز' };
const statusLabels: Record<GuideLanguage, Record<GuideEntry['status'], string>> = {
  en: { canonical: 'canonical', active: 'active', 'release-candidate': 'release-candidate', 'in-development': 'in-development', research: 'research', service: 'service', planned: 'planned' },
  ar: { canonical: 'مرجعي', active: 'نشط', 'release-candidate': 'مرشح للإصدار', 'in-development': 'قيد التطوير', research: 'بحثي', service: 'خدمة', planned: 'مخطط' },
  ur: { canonical: 'بنیادی', active: 'فعال', 'release-candidate': 'ریلیز امیدوار', 'in-development': 'زیر تکمیل', research: 'تحقیقی', service: 'خدمت', planned: 'منصوبہ بند' },
};
export function guideEntryLabel(entry: GuideEntry, language: GuideLanguage): string {
  if (language === 'ar') return arabicNames[entry.route ?? ''] ?? entry.name;
  if (language === 'ur') return urduNames[entry.route ?? ''] ?? entry.name;
  return entry.name;
}
export function guideStatus(status: GuideEntry['status'], language: GuideLanguage): string {
  // An unrecognised language falls back to the English label, never an empty chip.
  return (statusLabels[language] ?? statusLabels.en)[status] ?? status;
}
const aliases: Record<string, string> = { متجر: 'store ecommerce', موقع: 'website web', تطبيق: 'application software', هوية: 'brand identity creative', تسويق: 'growth campaign', نمو: 'growth', ووردبريس: 'wordpress', هندسة: 'engineering', تواصل: 'contact', أكاديمية: 'academy', بوابة: 'portal', حلول: 'solutions', إصلاح: 'repair', برمجيات: 'software', اسٹور: 'store ecommerce', ویب: 'website web', سائٹ: 'website web', ترقی: 'growth', رابطہ: 'contact', حل: 'solutions', انجینیئرنگ: 'engineering', مصنوعات: 'products' };
export function findGuideEntries(catalog: GuideEntry[], query: string): GuideEntry[] {
  if (!query.trim() || query.length > MAX_GUIDE_QUERY) return [];
  const words = [...new Set(query.toLowerCase().replace(/[\u064B-\u065F\u0640]/g, '').split(/[\s،,.!?؟]+/).flatMap(word => (aliases[word] ?? aliases[word.replace(/^ال/, '')] ?? word).split(' ')).filter(word => word.length > 1))];
  return catalog.map(entry => ({ entry, score: words.reduce((score, word) => score + (`${entry.name} ${entry.summary} ${entry.division} ${entry.terms.join(' ')}`.toLowerCase().includes(word) ? 1 : 0), 0) }))
    .filter(match => match.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(match => match.entry);
}

export function entryForPage(catalog: GuideEntry[], pathname: string): GuideEntry | undefined {
  const exact = catalog.filter(entry => entry.route === pathname);
  return exact.find(entry => entry.kind === 'route') ?? exact[0] ?? catalog.filter(entry => entry.route !== '/' && pathname.startsWith(`${entry.route}/`)).sort((a, b) => b.route!.length - a.route!.length)[0];
}

const routeArabic: Record<string, string> = {
  '/': 'هذا مقر KNOuX الرقمي. استكشف البرمجيات وخدمات الويب والإبداع، أو ابدأ من احتياجك في الحلول.',
  '/engineering': 'تعرض هذه الصفحة منهج الهندسة من الواجهة إلى التسليم، مع أدلة المشاريع التقنية المنشورة.',
  '/solutions': 'ابدأ من احتياج العمل. تربط الحلول بين الطبقات الأساسية والمسارات الاختيارية والخطوة التالية، دون وعد بسعر أو مدة أو نتيجة.',
  '/wordpress': 'استكشف منظومة ووردبريس والمعاينات الرسمية وأرسل طلبك. هذه ليست أداة تحرير أو نشر لموقع مباشر.',
  '/growth': 'استكشف خدمات النمو وإعداد الحملات. عرض الخدمة لا يثبت وجود اتصال فعلي أو بيانات حملة حية.',
  '/signal': 'اعثر على أدلة اتصال تجارية عامة مع مصدرها وحدودها. ليست هذه هوية خاصة مؤكدة لصاحب الرقم.',
  '/products': 'استكشف سجلات منتجات KNOuX. لكل منتج حالته المنشورة؛ الإدراج وحده لا يعني أنه جاهز للتنزيل.',
  '/contact': 'استخدم نموذج التواصل لوصف احتياج مشروعك. الدليل لا يقرأ حقول النموذج ولا يرسل الطلب نيابة عنك.',
  '/build': 'صف احتياجك في Composer لتجميع أنظمة من السجلات المنشورة. لا يقدم تقديراً للسعر أو المدة أو النتيجة.',
};
const routeUrdu: Record<string, string> = {
  '/': 'یہ KNOuX کا ڈیجیٹل مرکز ہے۔ سافٹ ویئر، ویب اور تخلیقی خدمات دیکھیں، یا حل سے اپنی ضرورت سے شروع کریں۔',
  '/engineering': 'یہ صفحہ انٹرفیس سے فراہمی تک انجینیئرنگ کا طریقہ کار اور شائع شدہ تکنیکی شواہد دکھاتا ہے۔',
  '/solutions': 'اپنے کاروباری مقصد سے شروع کریں۔ حل بنیادی پرتوں، اختیاری راستوں اور اگلے مرحلے کو جوڑتے ہیں، بغیر قیمت، مدت یا نتیجے کے وعدے کے۔',
  '/wordpress': 'ورڈپریس ماحولی نظام، سرکاری پیش منظریں دریافت کریں اور اپنی درخواست بھیجیں۔ یہ کسی براہِ راست سائٹ کے لیے تدوین یا اشاعت کا اوزار نہیں ہے۔',
  '/growth': 'ترقی کی خدمات اور مہم کی تیاری دریافت کریں۔ خدمت کا عرضہ اصل کنکشن یا لائیو مہم ڈیٹا کا ثبوت نہیں ہے۔',
  '/signal': 'عوامی کاروباری رابطے کے شواہد ان کے ماخذ اور حدود کے ساتھ تلاش کریں۔ یہ مالک کی نجی تصدیق شدہ شناخت نہیں ہے۔',
  '/products': 'KNOuX مصنوعات کے ریکارڈ دریافت کریں۔ ہر مصنوعات کی شائع شدہ صورتحال ہے؛ صرف فہرست میں ہونا ڈاؤن لوڈ کے لیے تیار ہونے کا مطلب نہیں۔',
  '/contact': 'رابطہ فارم سے اپنے پروجیکٹ کی ضرورت بیان کریں۔ رہنما فارم کے خانوں کو نہیں پڑھتا اور آپ کی طرف سے درخواست نہیں بھیجتا۔',
  '/build': 'Composer میں اپنی ضرورت بیان کریں تاکہ شائع شدہ ریکارڈوں سے نظام بنے۔ یہ قیمت، مدت یا نتیجے کا اندازہ نہیں دیتا۔',
};
const missingEntry: Record<GuideLanguage, string> = {
  en: 'No matching published record for this page. Explore Solutions or contact KNOuX.',
  ar: 'لا يوجد سجل منشور مطابق لهذه الصفحة. يمكنك استكشاف الحلول أو التواصل مع KNOuX.',
  ur: 'اس صفحے کے لیے کوئی شائع شدہ ریکارڈ نہیں ملا۔ حل دریافت کریں یا KNOuX سے رابطہ کریں۔',
};
export function describeEntry(entry: GuideEntry | undefined, language: GuideLanguage, pathname?: string): string {
  if (!entry) return missingEntry[language] ?? missingEntry.en;
  const route = pathname ?? entry.route ?? '';
  if (language === 'ar') return routeArabic[route] ?? `${guideEntryLabel(entry, language)} — سجل منشور ضمن ${arabicDivisions[entry.division]}. الحالة المعلنة: ${guideStatus(entry.status, language)}. راجع الصفحة المصدر لمعرفة النطاق والقيود. الوصف الأصلي بالإنجليزية: ${entry.summary}`;
  if (language === 'ur') return routeUrdu[route] ?? `${guideEntryLabel(entry, language)} — ${urduDivisions[entry.division]} میں شائع شدہ ریکارڈ۔ اعلان شدہ صورتحال: ${guideStatus(entry.status, language)}۔ دائرہ کار اور حدود کے لیے ماخذ صفحہ دیکھیں۔ اصل انگریزی خلاصہ: ${entry.summary}`;
  return `${entry.name}. ${entry.summary} Published status: ${entry.status}. Check the source page for scope and limitations.`;
}
