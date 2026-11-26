'use client';

import { useEffect, useRef, useState } from 'react';
import { HostingRack } from '../HostingRack';
import studioStyles from '../WordPressStudio.module.css';
import { wordPressServices } from '@/data/wordpress';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from '../WordPressCosmicMark';
import s from './journeys.module.css';

type ConnectionState = 'reading' | 'configured' | 'unconfigured' | 'unavailable';
type HealthState = 'reading' | 'ready' | 'limited' | 'unavailable';

async function readStatus(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { headers: { accept: 'application/json' }, signal });
  if (!response.ok) throw new Error('Status request failed');
  return response.json();
}

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
  const [location, setLocation] = useState<{ host: string; https: boolean } | null>(null);
  const [health, setHealth] = useState<HealthState>('reading');
  const rack = useRef<HTMLDialogElement>(null);

  // The chip shows this deployment's real hostname — never an invented domain.
  useEffect(() => {
    const id = setTimeout(() => setLocation({ host: window.location.host, https: window.location.protocol === 'https:' }), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const lifecycle = new AbortController();
    const signal = AbortSignal.any([lifecycle.signal, AbortSignal.timeout(6000)]);
    void readStatus('/api/domain/status', signal).then((body) => {
      if (lifecycle.signal.aborted) return;
      const status = (body as { status?: string } | null)?.status;
      setRegistrar(status === 'configured' || status === 'unconfigured' ? status : 'unavailable');
    }).catch(() => { if (!lifecycle.signal.aborted) setRegistrar('unavailable'); });
    void readStatus('/api/health', signal).then((body) => {
      if (lifecycle.signal.aborted) return;
      const payload = body as { status?: string; ready?: unknown } | null;
      setHealth(payload?.status === 'ok' && typeof payload.ready === 'boolean'
        ? payload.ready ? 'ready' : 'limited'
        : 'unavailable');
    }).catch(() => { if (!lifecycle.signal.aborted) setHealth('unavailable'); });
    return () => lifecycle.abort();
  }, []);

  const registrarLabels: Record<ConnectionState, string> = {
    reading: t('Reading…', 'جارٍ القراءة…'),
    configured: t('Configured'),
    unconfigured: t('Not configured', 'غير مضبوط'),
    unavailable: t('Status unavailable', 'الحالة غير متاحة'),
  };
  const healthLabels: Record<HealthState, string> = {
    reading: t('Reading…', 'جارٍ القراءة…'),
    ready: t('Deployment reports ready', 'النشر يفيد بأنه جاهز'),
    limited: t('Deployment reports limited readiness', 'النشر يفيد بجاهزية محدودة'),
    unavailable: t('Status unavailable', 'الحالة غير متاحة'),
  };

  const ORBIT_CARDS = [
    {
      id: 'domain', title: t('Domain Connection', 'ربط النطاق'),
      meta: t('Registrar verdicts, attributed', 'أحكام جهة التسجيل، منسوبة إليها'),
      state: registrarLabels[registrar], tone: registrar === 'configured' ? 'ok' : 'off',
    },
    {
      id: 'hosting', title: t('Hosting Nodes', 'عقد الاستضافة'),
      meta: t('Provider supplies the servers', 'المزود يوفر الخوادم'),
      state: t('Provider not configured', 'المزود غير مضبوط'), tone: 'off',
    },
    {
      id: 'ssl', title: t('SSL / Security', 'التشفير والأمان'),
      meta: t('Hardening is a KNOuX service', 'التصليب خدمة تنفذها KNOuX'),
      state: location?.https ? t('This page uses HTTPS', 'هذه الصفحة تستخدم HTTPS') : location ? t('This page uses HTTP', 'هذه الصفحة تستخدم HTTP') : t('Reading…', 'جارٍ القراءة…'), tone: location?.https ? 'ok' : 'signal',
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
              <span className={s.domainState} data-registrar-state={card.id === "domain" ? registrar : undefined} data-tone={card.tone}><i aria-hidden="true" />{card.state}</span>
              {card.id === 'domain' && location ? (
                <span className={s.orbitChip}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M9.5 14.5l5-5M8 12l-2.2 2.2a3.4 3.4 0 004.8 4.8L13 16.8M16 12l2.2-2.2a3.4 3.4 0 00-4.8-4.8L11 7.2" />
                  </svg>
                  {location.host}
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
        <div className={s.panel}>
          <h3 className={s.panelTitle}>{t("Deployment health", "صحة النشر")}</h3>
          <span className={s.domainState} role="status" data-deployment-health={health} data-tone={health === "ready" ? "ok" : "signal"}>
            <i aria-hidden="true" />{healthLabels[health]}
          </span>
          <p className={s.boundary}>{t('Hosting resource telemetry is unavailable.')}</p>
        </div>
        <div className={s.panel} aria-live="polite">
          <h3 className={s.panelTitle}>{activeCard.title}</h3>
          <p className={s.empty}>{activeCard.meta}</p>
          <span className={s.domainState} data-tone={activeCard.tone}><i aria-hidden="true" />{activeCard.state}</span>
          {activeCard.id === 'domain' ? (
            <p className={s.boundary}><a href="#domain">{t('Search availability in Domain Intelligence.')}</a></p>
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
            <button type="button" className={s.ghostAction} onClick={() => rack.current?.showModal()}>{t("Explore infrastructure services", "استكشف خدمات البنية التحتية")}</button>
            <a className={s.primaryAction} href="/contact?intent=infrastructure" onClick={() => cueAtmosphere('success')}>
              {t('Discuss infrastructure', 'ناقش البنية التحتية')} →
            </a>
          </div>
        </div>
      </div>
      <dialog ref={rack} className={studioStyles.contextPanel} aria-labelledby="wp-infrastructure-rack">
        <header>
          <h3 id="wp-infrastructure-rack">{t("Infrastructure services", "خدمات البنية التحتية")}</h3>
          <button type="button" onClick={() => rack.current?.close()}>{t("Close", "إغلاق")}</button>
        </header>
        <HostingRack />
      </dialog>
    </section>
  );
}
