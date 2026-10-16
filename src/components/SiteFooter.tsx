'use client';
import { useSiteCopy, useSiteLanguage } from '@/components/i18n/SiteLanguage';
import { guideDirection } from '@/lib/sentinel/languages';
import Link from 'next/link';
import { divisions } from '@/lib/entities';
import { institutionNavigation, primaryNavigation } from '@/data/navigation';
import { growthChannelsDetail } from '@/data/growth';

/**
 * Site footer.
 *
 * The full institution is indexed here rather than in a mega-menu, so every
 * division, channel and institution page is reachable without a pointer.
 */
export function SiteFooter() {
  const t = useSiteCopy(), language = useSiteLanguage();
  return (
    <footer lang={language} dir={guideDirection(language)} className="site-footer">
      <div className="footer-top shell">
        <p className="eyebrow">{t('The work continues')}</p>
        <Link href="/contact" className="footer-title">
          {t("Let's make")}
          <br />
          <em>{t('what comes next.')}</em>
          <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <div className="footer-index shell">
        <div className="footer-index__col">
          <span className="label">{t('Divisions')}</span>
          <ul>
            {divisions.map((division) => (
              <li key={division.id}>
                <Link href={division.route}>
                  <span className="mono">{division.index}</span> {t(division.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-index__col">
          <span className="label">{t('Growth channels')}</span>
          <ul>
            {growthChannelsDetail.map((channel) => (
              <li key={channel.id}>
                <Link href={`/growth/${channel.slug}`}>{t(channel.name)}</Link>
              </li>
            ))}
            <li>
              <Link href="/growth">{t('Growth overview')}</Link>
            </li>
          </ul>
        </div>
        <div className="footer-index__col">
          <span className="label">{t('WordPress')}</span>
          <ul>
            {primaryNavigation
              .filter((item) => item.href === '/wordpress')
              .map((item) => (
                <li key={item.href}>
                  <Link href="/wordpress">{t('Ecosystem overview')}</Link>
                </li>
              ))}
            {['themes', 'plugins', 'blocks', 'starter-sites', 'solutions'].map((slug) => (
              <li key={slug}>
                <Link href={`/wordpress/${slug}`}>{t(slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-index__col">
          <span className="label">{t('Institution')}</span>
          <ul>
            {institutionNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{t(item.label)}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-bottom shell">
        <Link href="/" className="footer-logo">
          KNOuX<span>®</span>
        </Link>
        <nav aria-label={t('Footer navigation')}>
          {primaryNavigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <span>{t('Engineering digital systems')}</span>
      </div>
    </footer>
  );
}
