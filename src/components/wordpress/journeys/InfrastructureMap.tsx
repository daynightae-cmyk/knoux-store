'use client';

/**
 * 08 · Hosting & Infrastructure — reference 83379, rendered as an honest map.
 *
 * The reference's orbital composition: the canonical mark on a luminous
 * podium, infrastructure cards in orbit around it, and a readout row beneath.
 * The reference's numbers (99.98% uptime, CPU/memory gauges, regional latency)
 * are fabrications no source in this deployment can substantiate, so every
 * gauge slot renders its true state instead: the registrar connection read at
 * request time, the commerce provider's honest absence, and the seven real
 * KNOuX operating services. A map that reports what is known is the product;
 * a map that invents telemetry is a lie a customer could plan around.
 */
import { useEffect, useState } from 'react';
import { wordPressServices } from '@/data/wordpress';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from '../WordPressCosmicMark';
import s from './journeys.module.css';

type ConnectionState = 'reading' | 'configured' | 'unconfigured';

/* Small line glyphs, drawn as code — one per orbital card, echoing the
 * reference's icon tiles without importing any raster asset. */
function OrbitGlyph({ id }: { id: string }) {
  const common = {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  switch (id) {
    case 'domain':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.8 2.6 4 5.6 4 9s-1.2 6.4-4 9c-2.8-2.6-4-5.6-4-9s1.2-6.4 4-9Z" />
        </svg>
      );
    case 'hosting':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="7" rx="1.5" />
          <rect x="3" y="13" width="18" height="7" rx="1.5" />
          <path d="M6.5 7.5h.01M6.5 16.5h.01M10 7.5h3M10 16.5h3" />
        </svg>
      );
    case 'ssl':
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3Z" />
          <path d="M9.5 12l1.8 1.8 3.4-3.6" />
        </svg>
      );
    case 'bridges':
      return (
        <svg {...common}>
          <path d="M9.5 14.5l5-5" />
          <path d="M8 12l-2.2 2.2a3.4 3.4 0 004.8 4.8L13 16.8M16 12l2.2-2.2a3.4 3.4 0 00-4.8-4.8L11 7.2" />
        </svg>
      );
    case 'storage':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5.5" rx="8" ry="2.8" />
          <path d="M4 5.5v13c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8v-13" />
          <path d="M4 12c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3Z" />
          <path d="M4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5" />
        </svg>
      );
  }
}

export function InfrastructureMap() {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [registrar, setRegistrar] = useState<ConnectionState>('reading');
  const [focused, setFocused] = useState<string>('services');
  const [host, setHost] = useState<string | null>(null);

  // The chip shows this deployment's real hostname — never an invented domain.
  useEffect(() => {
    const id = setTimeout(() => setHost(window.location.host), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/domain/status', { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { status?: string } | null) => {
        if (!cancelled) setRegistrar(body?.status === 'configured' ? 'configured' : 'unconfigured');
      })
      .catch(() => { if (!cancelled) setRegistrar('unconfigured'); });
    return () => { cancelled = true; };
  }, []);

  const registrarLabel = registrar === 'reading'
    ? t('Reading…', 'جارٍ القراءة…')
    : registrar === 'configured'
      ? t('Connected', 'مربوط')
      : t('Not configured', 'غير مضبوط');

  const ORBIT_CARDS = [
    {
      id: 'domain', title: t('Domain Connection', 'ربط النطاق'),
      meta: t('Registrar verdicts, attributed', 'أحكام جهة التسجيل، منسوبة إليها'),
      state: registrarLabel, tone: registrar === 'configured' ? 'ok' : 'off',
    },
    {
      id: 'hosting', title: t('Hosting Nodes', 'عقد الاستضافة'),
      meta: t('Provider supplies the servers', 'المزود يوفر الخوادم'),
      state: t('Provider not configured', 'المزود غير مضبوط'), tone: 'off',
    },
    {
      id: 'ssl', title: t('SSL / Security', 'التشفير والأمان'),
      meta: t('Hardening is a KNOuX service', 'التصليب خدمة تنفذها KNOuX'),
      state: t('Performed per site', 'يُنفَّذ لكل موقع'), tone: 'signal',
    },
    {
      id: 'bridges', title: t('Service Bridges', 'جسور الخدمات'),
      meta: t('Integrations · APIs · services', 'تكاملات · واجهات · خدمات'),
      state: t('Scoped per project', 'حسب نطاق المشروع'), tone: 'signal',
    },
    {
      id: 'storage', title: t('Storage & Database', 'التخزين وقواعد البيانات'),
      meta: t('Files · media · data · backup', 'ملفات · وسائط · بيانات · نسخ'),
      state: t('No telemetry connected', 'لا قياسات مربوطة'), tone: 'off',
    },
    {
      id: 'services', title: t('Operating Services', 'خدمات التشغيل'),
      meta: t('Engineering KNOuX performs', 'هندسة تنفذها KNOuX'),
      state: `${wordPressServices.length} ${t('available now', 'متاحة الآن')}`, tone: 'ok',
    },
  ] as const;

  const activeCard = ORBIT_CARDS.find((card) => card.id === focused) ?? ORBIT_CARDS[5];

  return (
    <section className={s.infraJourney} aria-label={t('Hosting and Infrastructure')}>
      <div className={s.infraMap}>
        <div className={s.infraOrbitCards}>
          {ORBIT_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              className={s.orbitCard}
              aria-pressed={focused === card.id}
              onClick={() => { if (focused !== card.id) cueAtmosphere('confirm'); setFocused(card.id); }}
            >
              <span className={s.orbitCardHead}>
                <span className={s.orbitIcon}><OrbitGlyph id={card.id} /></span>
                <span className={s.orbitCardTitles}>
                  <span className={s.orbitCardTitle}>{card.title}</span>
                  <span className={s.orbitCardMeta}>{card.meta}</span>
                </span>
              </span>
              <span className={s.domainState} data-tone={card.tone}><i aria-hidden="true" />{card.state}</span>
              {card.id === 'domain' && host ? (
                <span className={s.orbitChip}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9.5 14.5l5-5M8 12l-2.2 2.2a3.4 3.4 0 004.8 4.8L13 16.8M16 12l2.2-2.2a3.4 3.4 0 00-4.8-4.8L11 7.2" />
                  </svg>
                  {host}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <div className={s.infraCore} aria-hidden="true">
          <span className={s.infraRing} />
          <span className={s.infraRingB} />
          <WordPressCosmicMark className={s.infraMark} label="" />
          <span className={s.infraPodium} />
          <span className={s.infraPodiumB} />
        </div>
      </div>

      <div className={s.infraReadout}>
        <div className={s.panel} aria-live="polite">
          <h3 className={s.panelTitle}>{activeCard.title}</h3>
          <p className={s.empty}>{activeCard.meta}</p>
          <span className={s.domainState} data-tone={activeCard.tone}><i aria-hidden="true" />{activeCard.state}</span>
          {activeCard.id === 'domain' ? (
            <p className={s.boundary}>{t('The registrar state is read from this deployment at request time. Search real availability in journey 02.', 'تُقرأ حالة جهة التسجيل من هذا النشر لحظة الطلب. افحص التوفر الحقيقي في الرحلة 02.')}</p>
          ) : null}
          {activeCard.id === 'hosting' || activeCard.id === 'storage' ? (
            <p className={s.boundary}>{t('Plans, resource limits, prices and live gauges appear only when a provider supplies them. None are invented here.', 'الخطط وحدود الموارد والأسعار والعدادات الحية تظهر فقط عندما يوفرها مزود. لا نختلق أياً منها هنا.')}</p>
          ) : null}
        </div>

        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('Services Overview', 'نظرة على الخدمات')}</h3>
          <ul className={s.serviceList}>
            {wordPressServices.map((service) => (
              <li key={service.id}>
                <span className={s.serviceCode}>{service.code}</span>
                <span className={s.serviceName}>{service.name}</span>
                <i className={s.serviceTick} aria-hidden="true">✓</i>
              </li>
            ))}
          </ul>
          <p className={s.boundary}>{t('Real services, available now. No uptime promise, no price, no duration is published without a source.', 'خدمات حقيقية متاحة الآن. لا وعد توفر ولا سعر ولا مدة تُنشر بلا مصدر.')}</p>
        </div>

        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t('The Boundary', 'الحد الفاصل')}</h3>
          <dl className={s.boundaryList}>
            <div>
              <dt>{t('KNOuX performs', 'KNOuX تنفّذ')}</dt>
              <dd>{t('Installation, configuration, migration, maintenance, performance, security, backup and recovery.', 'التثبيت والتهيئة والترحيل والصيانة والأداء والأمان والنسخ والاستعادة.')}</dd>
            </div>
            <div>
              <dt>{t('A provider supplies', 'المزود يوفّر')}</dt>
              <dd>{t('The server, the network, the uptime commitment and the billing relationship.', 'الخادم والشبكة والتزام التوفر وعلاقة الفوترة.')}</dd>
            </div>
          </dl>
          <div className={s.actions}>
            <a className={s.primaryAction} href="/contact?intent=infrastructure" onClick={() => cueAtmosphere('success')}>
              {t('Discuss infrastructure', 'ناقش البنية التحتية')} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
