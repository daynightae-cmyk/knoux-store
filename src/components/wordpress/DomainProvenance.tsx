'use client';

import { useEffect, useState } from 'react';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import s from './journeys/journeys.module.css';

type Connection = {
  status: 'configured' | 'unconfigured' | 'partially-configured';
  explanation: string;
  provider: string | null;
};

export function DomainProvenance() {
  const language = useSiteLanguage();
  const t = (en: string, ar?: string) => resolveRouteCopy(language, en, ar);
  const [connection, setConnection] = useState<Connection | 'unavailable' | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/domain/status', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
    })
      .then((response) => response.ok ? response.json() as Promise<Connection> : null)
      .then((body) => {
        if (controller.signal.aborted) return;
        setConnection(body && ['configured', 'unconfigured', 'partially-configured'].includes(body.status) ? body : 'unavailable');
      })
      .catch(() => {
        if (!controller.signal.aborted) setConnection('unavailable');
      });
    return () => controller.abort();
  }, []);

  const details = typeof connection === 'object' ? connection : null;
  const state = details?.status ?? (connection === 'unavailable' ? connection : 'loading');
  const label = details?.status === 'configured' ? details.provider ?? t('Connected')
    : details?.status === 'partially-configured' ? t('Partially configured', 'إعداد غير مكتمل')
    : details?.status === 'unconfigured' ? t('Not configured', 'غير مُهيأ')
    : connection === 'unavailable' ? t('Registrar status unavailable', 'حالة جهة التسجيل غير متاحة')
    : t('Reading…', 'جارٍ القراءة…');

  return (
    <details className={s.domainConnection} data-registrar-state={state} aria-busy={connection === null}>
      <summary>
        <span>{t('Provider state', 'حالة المزود')}</span>
        <strong role="status">{label}</strong>
      </summary>
      {details && <p>{details.explanation}</p>}
      <p>{t('A registrar is the only authority on whether a domain can be registered. KNOuX shows exactly what it said.')}</p>
    </details>
  );
}
