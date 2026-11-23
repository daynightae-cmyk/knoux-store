'use client';

/**
 * 02 · Domain Intelligence — reference 83378, rendered as code on real answers.
 *
 * The reference's instrument layout: a luminous search bar, extension chips,
 * a results list on the left and a selected-domain panel on the right. The
 * honesty rule of the existing DomainFinder governs every pixel: a verdict
 * ("available", "unavailable", "premium") only ever appears when a registrar
 * actually answered, prices are the provider's verbatim or absent, and the
 * three failure states — not configured, check failed, no verdict — stay
 * visibly distinct. The "intelligence" panel computes facts about the typed
 * name itself (length, character makeup) and says so; it never fabricates a
 * match score, a discount or a trending badge.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { formatMoney, TLD_SHORTCUTS, type DomainAvailability } from '@/lib/domain/shared';
import { cueAtmosphere } from '@/components/build/dev/living-atmosphere';
import { resolveRouteCopy } from '@/lib/i18n/route-copy';
import { useSiteLanguage } from '@/lib/i18n/use-language';
import { DomainProvenance } from '../DomainProvenance';
import s from './journeys.module.css';

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'unconfigured' }
  | { kind: 'error' }
  | { kind: 'invalid'; message: string }
  | { kind: 'results'; results: DomainAvailability[]; provider: string | null; elapsedMs: number };

const STATE_TONE: Record<DomainAvailability['state'], { en: string; ar: string; tone: 'ok' | 'signal' | 'off' | 'warn' }> = {
  available: { en: 'Available', ar: 'متاح', tone: 'ok' },
  premium: { en: 'Premium', ar: 'مميز', tone: 'signal' },
  unavailable: { en: 'Unavailable', ar: 'غير متاح', tone: 'off' },
  unsupported: { en: 'Unsupported TLD', ar: 'امتداد غير مدعوم', tone: 'off' },
  unknown: { en: 'Not determined', ar: 'لم يتحدد', tone: 'off' },
  unconfigured: { en: 'Provider not configured', ar: 'المزود غير مضبوط', tone: 'off' },
  error: { en: 'Check failed', ar: 'فشل الفحص', tone: 'warn' },
};

/** Facts computed from the typed label — arithmetic, not a registrar verdict. */
function nameFacts(domain: string): { label: string; value: string }[] {
  const label = domain.slice(0, domain.lastIndexOf('.'));
  const facts: { label: string; value: string }[] = [
    { label: 'Label length', value: `${label.length} character${label.length === 1 ? '' : 's'}` },
    { label: 'Digits', value: /\d/.test(label) ? 'Contains digits' : 'Letters only' },
    { label: 'Hyphens', value: label.includes('-') ? 'Contains hyphens' : 'None' },
    { label: 'Extension', value: `.${domain.slice(domain.lastIndexOf('.') + 1)}` },
  ];
  return facts;
}

export function DomainIntelligence() {
  const language = useSiteLanguage();
  const t = (english: string, arabic?: string) => resolveRouteCopy(language, english, arabic);
  const [query, setQuery] = useState('');
  const [tlds, setTlds] = useState<string[]>(['com']);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [selected, setSelected] = useState<string | null>(null);
  const [review, setReview] = useState<{ state: string; message: string; externalReference: string | null } | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const searchRef = useRef<AbortController | null>(null);
  const reviewRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    searchRef.current?.abort();
    reviewRef.current?.abort();
  }, []);

  const clearReview = useCallback(() => {
    reviewRef.current?.abort();
    reviewRef.current = null;
    setReview(null);
    setReviewBusy(false);
  }, []);

  const clearResults = useCallback(() => {
    searchRef.current?.abort();
    searchRef.current = null;
    setPhase({ kind: 'idle' });
    setSelected(null);
    clearReview();
  }, [clearReview]);

  const toggleTld = useCallback((tld: string) => {
    clearResults();
    cueAtmosphere('settle');
    setTlds((current) =>
      current.includes(tld) ? (current.length === 1 ? current : current.filter((entry) => entry !== tld)) : [...current, tld],
    );
  }, [clearResults]);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setPhase({ kind: 'invalid', message: 'Enter a name to search for.' });
      return;
    }
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    setPhase({ kind: 'checking' });
    setSelected(null);
    clearReview();
    cueAtmosphere('ready');
    const startedAt = performance.now();
    const params = new URLSearchParams({ q: trimmed });
    for (const tld of tlds) params.append('tld', tld);
    try {
      const response = await fetch(`/api/domain/search?${params.toString()}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      });
      const body = (await response.json()) as {
        state?: string; message?: string; provider?: string | null; results?: DomainAvailability[];
      };
      if (controller.signal.aborted || searchRef.current !== controller) return;
      if (body.state === 'unconfigured') {
        setPhase({ kind: 'unconfigured' });
      } else if (body.state === 'invalid' || body.state === 'rate-limited') {
        setPhase({ kind: 'invalid', message: body.message ?? 'That search could not be run.' });
      } else if (response.ok && body.state === 'checked' && Array.isArray(body.results)) {
        const results = body.results;
        setPhase({
          kind: 'results', results,
          provider: body.provider ?? null,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
        setSelected(results.find((entry) => entry.state === 'available')?.domain ?? results[0]?.domain ?? null);
        cueAtmosphere('success');
      } else {
        setPhase({ kind: 'error' });
        cueAtmosphere('error');
      }
    } catch {
      if (controller.signal.aborted || searchRef.current !== controller) return;
      setPhase({ kind: 'error' });
      cueAtmosphere('error');
    }
  }, [clearReview, query, tlds]);

  async function reviewRegistration(domain: string) {
    clearReview();
    const controller = new AbortController();
    reviewRef.current = controller;
    setReviewBusy(true);
    try {
      const response = await fetch('/api/domain/registration', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      });
      const value = await response.json();
      if (controller.signal.aborted || reviewRef.current !== controller) return;
      setReview(value.state ? value : { state: 'REGISTRATION_REQUIRES_OPERATOR', message: 'Registration capability could not be verified.', externalReference: null });
    } catch {
      if (controller.signal.aborted || reviewRef.current !== controller) return;
      setReview({ state: 'REGISTRATION_REQUIRES_OPERATOR', message: 'Registration capability could not be verified. No purchase was requested.', externalReference: null });
    } finally {
      if (reviewRef.current === controller) {
        reviewRef.current = null;
        setReviewBusy(false);
      }
    }
  }

  const busy = phase.kind === 'checking';
  const results = phase.kind === 'results' ? phase.results : [];
  const chosen = results.find((entry) => entry.domain === selected) ?? null;
  const setupHref = `/contact?${new URLSearchParams({
    requestType: 'wordpress',
    items: `Assisted domain review: ${chosen?.domain || query.trim() || 'name to be agreed'} · extensions: ${tlds.join(', ')} · confirm current availability`,
  }).toString()}`;

  return (
    <section className={s.domainJourney} aria-label={t('Domain Intelligence')}>
      <DomainProvenance />
      <form className={s.domainSearchRow} onSubmit={submit} role="search" noValidate>
        <label className={s.domainSearch}>
          <span className={s.visuallyHidden}>{t('Find your domain', 'ابحث عن نطاقك')}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" strokeLinecap="round" /></svg>
          <input
            type="text"
            value={query}
            onChange={(event) => { setQuery(event.target.value); clearResults(); }}
            placeholder={t('yourbrand', 'اسم-علامتك')}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={253}
            inputMode="url"
          />
        </label>
        <button type="submit" className={s.primaryAction} disabled={busy}>
          {busy ? t('Checking…', 'جارٍ الفحص…') : t('Search Domains', 'ابحث في النطاقات')} ↗
        </button>
      </form>

      <div className={s.domainChips} role="group" aria-label={t('Extensions to check', 'الامتدادات المطلوب فحصها')}>
        <span className={s.chipsLabel}>{t('TLD quick add', 'إضافة امتداد')}</span>
        {TLD_SHORTCUTS.map((tld) => (
          <button key={tld} type="button" className={s.filter} aria-pressed={tlds.includes(tld)} disabled={tlds.length === 1 && tlds.includes(tld)} onClick={() => toggleTld(tld)}>
            .{tld}
          </button>
        ))}
      </div>

      <div className={s.domainColumns}>
        <div className={s.library} aria-live="polite" aria-busy={busy}>
          <header className={s.libraryHead}>
            <h3 className={s.panelTitle}>{t('Domain Results', 'نتائج النطاقات')}</h3>
            {phase.kind === 'results' ? (
              <span className={s.count}>
                {phase.results.length} {t('checked', 'مفحوص')} · {phase.elapsedMs}ms
              </span>
            ) : null}
          </header>

          {phase.kind === 'idle' ? (
            <p className={s.empty} role="status">
              {t('Awaiting a query. A registrar answers availability; when one is connected, its verdict and its published prices appear here, attributed to the registrar that produced them.', 'في انتظار استعلام. جهة التسجيل هي من تجيب عن التوفر؛ عند ربطها تظهر نتائجها وأسعارها المنشورة هنا منسوبة إليها.')}
            </p>
          ) : null}
          {phase.kind === 'checking' ? (
            <p className={s.empty} role="status">{t('Asking the registrar. No result is assumed while this runs.', 'نسأل جهة التسجيل الآن. لا نفترض أي نتيجة أثناء الفحص.')}</p>
          ) : null}
          {phase.kind === 'invalid' ? (
            <p className={s.empty} role="status" data-tone="error">{phase.message}</p>
          ) : null}
          {phase.kind === 'unconfigured' ? (
            <div className={s.domainNotice}>
              <span className={s.noticeLabel}>{t('Provider not configured', 'المزود غير مضبوط')}</span>
              <p>{t('This deployment has no registrar connected. KNOuX will not answer for a registrar it has not asked — availability and pricing appear the moment one is connected. In the meantime the name can be checked and registered for you.', 'لا توجد جهة تسجيل مربوطة بهذا النشر. لا نجيب نيابة عن جهة لم نسألها — يظهر التوفر والتسعير فور الربط. وحتى ذلك الحين يمكن فحص الاسم وتسجيله نيابة عنك.')}</p>
              <a className={s.primaryAction} href={setupHref} onClick={() => cueAtmosphere('confirm')}>{t('Request domain setup', 'اطلب إعداد النطاق')} →</a>
            </div>
          ) : null}
          {phase.kind === 'error' ? (
            <div className={s.domainNotice} data-tone="error">
              <span className={s.noticeLabel}>{t('Check failed', 'فشل الفحص')}</span>
              <p>{t('The registrar could not be reached. This is a failure to check, not a verdict — no statement is made about whether any of these names is available.', 'تعذر الوصول إلى جهة التسجيل. هذا فشل في الفحص وليس حكماً — لا نقول شيئاً عن توفر أي من هذه الأسماء.')}</p>
              <div className={s.actions}>
                <button type="button" className={s.ghostAction} onClick={() => void submit({ preventDefault() {} } as FormEvent<HTMLFormElement>)}>{t('Try again', 'أعد المحاولة')}</button>
                <a className={s.primaryAction} href={setupHref}>{t('Ask KNOuX', 'اسأل KNOuX')} →</a>
              </div>
            </div>
          ) : null}

          {phase.kind === 'results' && results.length === 0 ? (
            <p className={s.empty} role="status">{t('The registrar did not return an answer for this name. Nothing is claimed either way.', 'لم تُرجع جهة التسجيل إجابة عن هذا الاسم. لا ندّعي شيئاً في أي اتجاه.')}</p>
          ) : null}
          {results.length ? (
            <ul className={s.domainList} aria-label={t('Checked names', 'الأسماء المفحوصة')}>
              {results.map((entry) => {
                const tone = STATE_TONE[entry.state];
                const price = formatMoney(entry.registration);
                const isSelected = entry.domain === selected;
                return (
                  <li key={entry.domain}>
                    <button
                      type="button"
                      className={s.domainRow}
                      data-tone={tone.tone}
                      aria-pressed={isSelected}
                      onClick={() => { if (!isSelected) { cueAtmosphere('confirm'); clearReview(); } setSelected(entry.domain); }}
                    >
                      <span className={s.domainName}>{entry.domain}</span>
                      <span className={s.domainProvider}>{entry.provider}</span>
                      <span className={s.domainState} data-tone={tone.tone}>
                        <i aria-hidden="true" />{t(tone.en, tone.ar)}
                      </span>
                      <span className={s.domainPrice}>{price ?? t('Not published', 'غير منشور')}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <aside className={s.stagePanel} aria-label={t('Selected domain', 'النطاق المختار')}>
          <header className={s.libraryHead}>
            <h3 className={s.panelTitle}>{t('Selected Domain', 'النطاق المختار')}</h3>
            {chosen ? <span className={s.selectedFlagStatic}>{t('Selected', 'مختار')}</span> : null}
          </header>
          {chosen ? (
            <>
              <div className={s.chosenHead}>
                <h4 className={s.chosenName}>{chosen.domain}</h4>
                <span className={s.domainState} data-tone={STATE_TONE[chosen.state].tone}>
                  <i aria-hidden="true" />{t(STATE_TONE[chosen.state].en, STATE_TONE[chosen.state].ar)}
                </span>
              </div>
              <dl className={s.facts}>
                <div><dt>{t('Source', 'المصدر')}</dt><dd>{chosen.provider}</dd></div>
                <div><dt>{t('Registration', 'التسجيل')}</dt><dd>{formatMoney(chosen.registration) ?? t('Not published', 'غير منشور')}</dd></div>
                <div><dt>{t('Renewal', 'التجديد')}</dt><dd>{formatMoney(chosen.renewal) ?? t('Not published', 'غير منشور')}</dd></div>
                <div>
                  <dt>{t('Checked', 'وقت الفحص')}</dt>
                  <dd>{Number.isFinite(Date.parse(chosen.checkedAt)) ? <time dateTime={chosen.checkedAt}>{new Date(chosen.checkedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time> : '—'}</dd>
                </div>
              </dl>
              {chosen.reason ? <p className={s.empty}>{chosen.reason}</p> : null}

              <div className={s.panel}>
                <h3 className={s.panelTitle}>{t('Name analysis', 'تحليل الاسم')}</h3>
                <ul className={s.breakpoints}>
                  {nameFacts(chosen.domain).map((fact) => (
                    <li key={fact.label}><span>{t(fact.label)}</span><b>{fact.value}</b></li>
                  ))}
                </ul>
                <p className={s.boundary}>{t('Computed from the typed name — arithmetic, not a registrar verdict or a score.', 'محسوب من الاسم المكتوب — حساب مباشر، وليس حكم جهة تسجيل ولا تقييماً.')}</p>
              </div>

              <div className={s.actions}>
                {(chosen.state === 'available' || chosen.state === 'premium') ? (
                  <button type="button" className={s.ghostAction} disabled={reviewBusy} onClick={() => void reviewRegistration(chosen.domain)}>
                    {reviewBusy ? t('Checking boundary…', 'جارٍ فحص الحد…') : t('Review registration', 'راجع حدود التسجيل')}
                  </button>
                ) : null}
                <a className={s.primaryAction} href={setupHref} onClick={() => cueAtmosphere('success')}>{t('Request this domain', 'اطلب هذا النطاق')} →</a>
              </div>
              {review ? (
                <p className={s.domainNotice} role="status">
                  <span className={s.noticeLabel}>{review.state}</span>
                  {review.message} {t('Receipt:', 'الإيصال:')} {review.externalReference ?? t('None', 'لا يوجد')}
                </p>
              ) : null}
            </>
          ) : (
            <p className={s.empty}>
              {t('Search a name, then select a result to see exactly what the registrar said about it — its verdict, its prices and the instant it was checked.', 'ابحث عن اسم ثم اختر نتيجة لترى ما قالته جهة التسجيل بالضبط — حكمها وأسعارها ولحظة الفحص.')}
            </p>
          )}
          <p className={s.boundary}>{t('Nothing is registered or charged from this studio. Registration is an explicit operator decision after a fresh availability check.', 'لا يُسجَّل ولا يُحصَّل شيء من هذا الاستوديو. التسجيل قرار تشغيلي صريح بعد فحص توفر جديد.')}</p>
        </aside>
      </div>
    </section>
  );
}
