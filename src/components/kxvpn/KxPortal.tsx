'use client';

import Link from 'next/link';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { siteDirection } from '@/lib/i18n/languages';
import styles from './KxPortal.module.css';
import enCopy from './locales/en.json';
import arCopy from './locales/ar.json';

type KxPage = 'overview' | 'docs' | 'privacy' | 'support' | 'releases';

const routes: { kind: KxPage; href: string }[] = [
  { kind: 'overview', href: '/software/kx-private-vpn' },
  { kind: 'docs', href: '/docs/kx-private-vpn' },
  { kind: 'privacy', href: '/legal/kx-private-vpn/privacy' },
  { kind: 'support', href: '/support/kx-private-vpn' },
  { kind: 'releases', href: '/software/kx-private-vpn/releases' },
];



const repo = 'https://github.com/daynightae-cmyk/KX-Private-VPN';
const mail = 'knouxio@zohomail.com';

export function KxPortal({ page }: { page: KxPage }) {
  const language = useSiteLanguage();
  const ar = language === 'ar';
  const t = ar ? arCopy : enCopy;
  const current = t.headings[page];

  return (
    <main id="main-content" tabIndex={-1} className={styles.page} dir={siteDirection(language)} lang={language}>
      <div className={styles.mesh} aria-hidden="true" />
      <div className={styles.shell}>
        <div className={styles.topline}>
          <Link href="/products" className={styles.crumb}>KNOuX / SOFTWARE</Link>
          <span className={styles.status}><span aria-hidden="true" className={styles.statusDot} />{t.status}</span>
        </div>
        <nav className={styles.nav} aria-label={ar ? 'تنقل KX' : 'KX product navigation'}>
          {routes.map((item, index) => (
            <Link href={item.href} key={item.kind} className={page === item.kind ? styles.navActive : ''} aria-current={page === item.kind ? 'page' : undefined}>
              <span>{String(index + 1).padStart(2, '0')}</span>{t.nav[index]}
            </Link>
          ))}
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{t.eyebrow}</span>
            <div className={styles.wordmark}>{t.product}<span aria-hidden="true">™</span></div>
            <h1>{current[0]}<br /><em>{current[1]}</em></h1>
            <p className={styles.lead}>{t.descriptions[page]}</p>
            <div className={styles.actions}>
              <Link href="/docs/kx-private-vpn" className={styles.primaryAction}>{t.buttons[0]} <span aria-hidden="true">↗</span></Link>
              <a href={repo} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>{t.buttons[2]} <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className={styles.visual} role="img" aria-label={ar ? 'تصميم توضيحي لتدفق بيانات WireGuard، وليس حالة اتصال حقيقية' : 'Decorative WireGuard connection diagram, not a live connection status'}>
            <div className={styles.orbitOuter} />
            <div className={styles.orbitInner} />
            <div className={styles.beam} />
            <div className={styles.core}><svg viewBox="0 0 128 128" fill="none" aria-hidden="true" focusable="false"><path d="M64 8 110 28v30c0 31-18 51-46 62C36 109 18 89 18 58V28L64 8Z" stroke="currentColor" strokeWidth="3.5"/><path d="m40 64 16 16 33-37" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div className={styles.topVisualLabel}>WIREGUARD / ANDROID</div>
            <div className={styles.bottomVisualLabel}>QA / NO LIVE STATUS</div>
          </div>
        </header>

        {page === 'overview' ? (
          <>
            <div className={styles.facts}>
              <span>ANDROID / API 26+</span><span>WIREGUARD / GoBackend</span><span>LOCAL ENCRYPTED PROFILES</span><span>NO PUBLIC RELEASE</span>
            </div>
            <section className={styles.section}>
              <div className={styles.sectionHeading}><span className={styles.eyebrow}>01 / CAPABILITIES</span><h2>{t.featureHeading}</h2><p>{t.featureIntro}</p></div>
              <div className={styles.cardGrid}>
                {t.features.map(([n, title, detail]) => <article key={n} className={styles.featureCard}><span className={styles.cardNumber}>{n}</span><h3>{title}</h3><p>{detail}</p><span className={styles.cardFoot}>IMPLEMENTED / FIELD QA PENDING</span></article>)}
              </div>
            </section>
            <section className={styles.section}>
              <div className={styles.sectionHeading}><span className={styles.eyebrow}>02 / QA</span><h2>{t.stepsHeading}</h2></div>
              <div className={styles.stepGrid}>{t.steps.map(([n, title, detail]) => <article className={styles.step} key={n}><span>{n}</span><h3>{title}</h3><p>{detail}</p></article>)}</div>
            </section>
            <div className={styles.notice}><strong>{t.availability}</strong><p>{t.access}</p><p>{t.noRelease}</p><Link href="/software/kx-private-vpn/releases">{t.nav[4]} ↗</Link></div>
          </>
        ) : null}

        {page === 'docs' ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span className={styles.eyebrow}>GUIDE / SOURCE-AWARE</span><h2>{ar ? 'دليل الإعداد والأمان' : 'Setup and security guide'}</h2><p>{t.sourceNote}</p></div>
            <div className={styles.articleList}>{t.docsSections.map(([title, body]) => <article key={title} className={styles.article}><h2>{title}</h2><p>{body}</p></article>)}</div>
          </section>
        ) : null}

        {page === 'privacy' ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span className={styles.eyebrow}>PRIVACY NOTICE / REVIEWED 2026-11-05</span><h2>{ar ? 'ما نحفظه، وما لا نعرفه.' : 'What stays local. What does not.'}</h2></div>
            <div className={styles.articleList}>{t.privacySections.map(([title, body]) => <article key={title} className={styles.article}><h2>{title}</h2><p>{body}</p></article>)}</div>
            <p className={styles.smallPrint}>{ar ? 'هذه السياسة تخص تطبيق Android المذكور، وقد تختلف سياسة خصوصية الموقع نفسه.' : 'This notice concerns the named Android client. The website has separate data processing and site analytics.'}</p>
          </section>
        ) : null}

        {page === 'support' ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}><span className={styles.eyebrow}>SUPPORT / REPRODUCIBLE REPORTS</span><h2>{ar ? 'نساعدك بالأدلة.' : 'Evidence makes support useful.'}</h2></div>
            <div className={styles.stepGrid}>{t.supportSteps.map(([title, body], i) => <article className={styles.step} key={title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
            <div className={styles.supportActions}><a href={'mailto:' + mail + '?subject=KX%20Private%20VPN%20Support'} className={styles.primaryAction}>{mail} ↗</a><a href={repo + '/issues'} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>{ar ? 'مشاكل GitHub العامة' : 'Public issue tracker'} ↗</a></div>
          </section>
        ) : null}

        {page === 'releases' ? (
          <section className={styles.section}>
            <div className={styles.releaseWarning}><span className={styles.eyebrow}>RELEASE GATE / BLOCKED</span><h2>{t.noRelease}</h2><p>{t.sourceNote}</p><a href={repo + '/releases'} target="_blank" rel="noopener noreferrer" className={styles.secondaryAction}>{ar ? 'تحقق من إصدارات GitHub' : 'Check GitHub release records'} ↗</a></div>
            <div className={styles.articleList}>{t.releaseSteps.map(([title, body], i) => <article key={title} className={styles.article}><h2>{String(i + 1).padStart(2, '0')} / {title}</h2><p>{body}</p></article>)}</div>
          </section>
        ) : null}

        <aside className={styles.bottomCta}><span>KX / KNOuX</span><p>{t.sourceNote}</p><div><Link href="/legal/kx-private-vpn/privacy">{t.buttons[1]} ↗</Link><Link href="/support/kx-private-vpn">{t.buttons[3]} ↗</Link><Link href="/products">{ar ? 'كل المنتجات' : 'All products'} ↗</Link></div></aside>
      </div>
    </main>
  );
}
