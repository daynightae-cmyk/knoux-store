'use client';
import Link from 'next/link';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { translatedSiteCopy } from '@/lib/i18n/site-copy';
import { siteDirection } from '@/lib/i18n/languages';

/**
 * Shared page header used by every division and institution page.
 *
 * Translating here rather than per page is deliberate: the index label, the
 * division name and the scroll cue appear on every route, so a single hook
 * covers the whole site. `label` and `description` come from each page's own
 * registry entry and fall through to their English source when a locale has no
 * editorial translation yet — an explicit fallback, not an invented sentence.
 */
export function PageIntro({ index, label, title, italic, description }: { index: string; label: string; title: string; italic: string; description: string }) {
  const language = useSiteLanguage(), t = (text: string) => translatedSiteCopy(text, language);
  const name = t(label);
  return <section className="page-intro" lang={language} dir={siteDirection(language)}><div className="page-crumb"><Link href="/">KNOuX</Link><span>/</span><span>{name}</span></div><div className="page-intro-body"><div><p className="eyebrow">{index} / {name.toUpperCase()}</p><h1>{t(title)}<br /><em>{t(italic)}</em></h1></div><p>{t(description)}</p></div><div className="page-rule"><span>{t('SCROLL TO DISCOVER')}</span><span aria-hidden="true">↓</span></div></section>;
}