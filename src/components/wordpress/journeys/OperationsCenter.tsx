'use client';

/**
 * 10 · Operations Command Center — reference 83383, rendered honestly.
 *
 * The reference's bridge layout: capability panels flanking the canonical
 * mark on its podium, a module grid, and a feed. Its numbers — uptime 99.99%,
 * 24.7k req/s, "24/24 services online", a live alert stream — describe a
 * monitoring system this deployment does not have, so they are not rendered.
 * What is rendered is real: the seven operating services with their actual
 * activities, a feed of what this studio session genuinely did (kept in this
 * tab), and readouts that state absence instead of inventing telemetry.
 */
import { useEffect, useRef, useState } from 'react';
import { wordPressServices } from '@/data/wordpress';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { WordPressCosmicMark } from '../WordPressCosmicMark';
import { BuildAndOperate } from '../BuildAndOperate';
import studioStyles from '../WordPressStudio.module.css';
import s from './journeys.module.css';

const EVENT_KEY = 'knoux-wp-studio-feed';

type FeedEntry = { at: string; text: string };

function readFeed(): FeedEntry[] {
  try {
    const raw = window.sessionStorage.getItem(EVENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedEntry[];
    return Array.isArray(parsed) ? parsed.slice(-8) : [];
  } catch {
    return [];
  }
}

/** Real session facts, read from what this tab actually holds. */
function sessionFacts(): FeedEntry[] {
  const facts: FeedEntry[] = [];
  try {
    const intent = window.sessionStorage.getItem('knoux-wp-studio-intent');
    if (intent) facts.push({ at: '', text: `Intent recorded: “${intent.slice(0, 80)}”` });
    const identity = window.sessionStorage.getItem('knoux-wp-identity-draft');
    if (identity) {
      const draft = JSON.parse(identity) as { name?: string };
      facts.push({ at: '', text: `Identity draft in progress${draft.name ? `: ${draft.name}` : ''}` });
    }
  } catch { /* private mode: nothing stored, nothing claimed */ }
  return facts;
}

const SECURITY = wordPressServices.find((service) => service.id === 'wp-svc-security');
const PERFORMANCE = wordPressServices.find((service) => service.id === 'wp-svc-performance');
const MAINTENANCE = wordPressServices.find((service) => service.id === 'wp-svc-maintenance');

export function OperationsCenter() {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [focusedService, setFocusedService] = useState<string>(wordPressServices[0]?.id ?? '');
  const [consoleOpened, setConsoleOpened] = useState(false);
  const consolePanel = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setFeed([...readFeed(), ...sessionFacts()]);
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  const service = wordPressServices.find((entry) => entry.id === focusedService) ?? wordPressServices[0];

  return (
    <section className={s.opsJourney} aria-label={t('Operations Command Center')}>
      <div className={s.opsGrid}>
        <div className={s.opsFlank}>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Security', 'الأمان')}</h3>
            <p className={s.empty}>{SECURITY?.summary}</p>
            <ul className={s.opsChecklist}>
              {SECURITY?.activities.map((activity) => (
                <li key={activity}><i aria-hidden="true">✓</i>{activity}</li>
              ))}
            </ul>
            <p className={s.boundary}>{t('Performed on your install after scope is agreed — not a running monitor on this page.', 'يُنفَّذ على موقعك بعد الاتفاق — وليس مراقباً يعمل في هذه الصفحة.')}</p>
          </div>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Performance', 'الأداء')}</h3>
            <p className={s.empty}>{PERFORMANCE?.summary}</p>
            <ul className={s.opsChecklist}>
              {PERFORMANCE?.activities.map((activity) => (
                <li key={activity}><i aria-hidden="true">✓</i>{activity}</li>
              ))}
            </ul>
          </div>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Maintenance', 'الصيانة')}</h3>
            <ul className={s.opsChecklist}>
              {MAINTENANCE?.activities.map((activity) => (
                <li key={activity}><i aria-hidden="true">✓</i>{activity}</li>
              ))}
            </ul>
            <button type="button" className={s.ghostAction} onClick={() => {
              setConsoleOpened(true);
              consolePanel.current?.showModal();
            }}>{t('Open trusted operations')}</button>
          </div>
        </div>

        <div className={s.opsCore}>
          <div className={s.infraCore} aria-hidden="true">
            <span className={s.infraRing} />
            <span className={s.infraRingB} />
            <WordPressCosmicMark className={s.infraMark} label="" />
            <span className={s.infraPodium} />
          </div>
          <div className={s.opsMeters}>
            <div className={s.opsMeter}>
              <span>{t('Operating services', 'خدمات التشغيل')}</span>
              <b>{wordPressServices.length}</b>
            </div>
            <div className={s.opsMeter}>
              <span>{t('Live telemetry', 'قياسات حية')}</span>
              <b data-dim="true">{t('Not connected', 'غير مربوطة')}</b>
            </div>
            <div className={s.opsMeter}>
              <span>{t('Uptime promise', 'وعد التوفر')}</span>
              <b data-dim="true">{t('None published', 'لا يُنشر')}</b>
            </div>
          </div>
        </div>

        <div className={s.opsFlank}>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Operational Modules', 'وحدات التشغيل')}</h3>
            <div className={s.moduleRow} role="group" aria-label={t('Operating services')}>
              {wordPressServices.map((entry) => (
                <button key={entry.id} type="button" className={s.moduleChip} aria-pressed={focusedService === entry.id}
                  onClick={() => { if (focusedService !== entry.id) cueAtmosphere('confirm'); setFocusedService(entry.id); }}>
                  {entry.name}
                </button>
              ))}
            </div>
            {service ? (
              <p className={s.empty} aria-live="polite">
                <b className={s.serviceCode}>{service.code}</b> — {service.summary}
              </p>
            ) : null}
          </div>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Session Feed', 'سجل الجلسة')}</h3>
            {feed.length ? (
              <ul className={s.feedList} aria-live="polite">
                {feed.map((entry, index) => (
                  <li key={`${entry.text}-${index}`}><i aria-hidden="true" />{entry.text}</li>
                ))}
              </ul>
            ) : (
              <p className={s.empty} role="status">
                {t('Nothing recorded yet this session. Real actions — an intent, a draft, a request — appear here as they happen.', 'لم يُسجَّل شيء في هذه الجلسة بعد. الأحداث الحقيقية — وصف أو مسودة أو طلب — تظهر هنا فور حدوثها.')}
              </p>
            )}
            <p className={s.boundary}>{t('This feed reads only what this tab actually did. It is not a server monitoring stream.', 'هذا السجل يقرأ ما فعله هذا التبويب فعلاً. ليس بث مراقبة من خادم.')}</p>
          </div>
          <div className={s.panel}>
            <h3 className={s.panelTitle}>{t('Engage Operations', 'ابدأ التشغيل')}</h3>
            <p className={s.empty}>{t('Scope and sequence are agreed before work starts. Compose the operating work your install needs.', 'يُتفق على النطاق والترتيب قبل بدء العمل. اكتب عمل التشغيل الذي يحتاجه موقعك.')}</p>
            <div className={s.actions}>
              <a className={s.primaryAction} onClick={() => cueAtmosphere('success')}
                href={`/contact?${new URLSearchParams({ requestType: 'wordpress', items: `Operations engagement: ${service?.name ?? 'maintenance'}; scope to be agreed` }).toString()}`}>
                {t('Request operations', 'اطلب خدمات التشغيل')} →
              </a>
            </div>
          </div>
        </div>
      </div>
      <dialog ref={consolePanel} className={studioStyles.contextPanel} aria-labelledby="wp-operation-panel">
        <header>
          <h3 id="wp-operation-panel">{t('Trusted operations')}</h3>
          <button type="button" onClick={() => consolePanel.current?.close()}>{t('Close')}</button>
        </header>
        {consoleOpened && <BuildAndOperate />}
      </dialog>
    </section>
  );
}
