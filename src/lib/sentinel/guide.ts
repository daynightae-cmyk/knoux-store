import type { DiscoverableEntity, DivisionId } from '@/lib/entities';

export type GuideLanguage = 'en' | 'ar';
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
const aliases: Record<string, string> = { متجر: 'store ecommerce', موقع: 'website web', تطبيق: 'application software', هوية: 'brand identity creative', تسويق: 'growth campaign', نمو: 'growth', ووردبريس: 'wordpress', هندسة: 'engineering', تواصل: 'contact', أكاديمية: 'academy', بوابة: 'portal', حلول: 'solutions', إصلاح: 'repair', برمجيات: 'software' };
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
export function describeEntry(entry: GuideEntry | undefined, language: GuideLanguage, pathname?: string): string {
  if (!entry) return language === 'ar' ? 'لا يوجد سجل منشور مطابق لهذه الصفحة. يمكنك استكشاف الحلول أو التواصل مع KNOuX.' : 'No matching published record for this page. Explore Solutions or contact KNOuX.';
  if (language === 'ar') return routeArabic[pathname ?? entry.route ?? ''] ?? `${entry.name} — سجل منشور ضمن ${arabicDivisions[entry.division]}. راجع الصفحة المصدر لمعرفة النطاق والقيود. الوصف الأصلي بالإنجليزية: ${entry.summary}`;
  return `${entry.name}. ${entry.summary} Published status: ${entry.status}. Check the source page for scope and limitations.`;
}
