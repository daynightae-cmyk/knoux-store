'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { SignalEvidenceInspector } from '@/components/signal/SignalEvidenceInspector';
import { SignalGlobeScene } from '@/components/signal/SignalGlobeScene';
import { placementMap, type EvidenceNode } from '@/lib/signal/evidenceLayout';
import { normalizeSignalPhone } from '@/lib/signal/phone';
import { phaseStatusCopy, visualModeForPhase, type SignalPhase } from '@/lib/signal/sceneState';
import type { SignalLookupResponse } from '@/lib/signal/types';
import styles from '@/app/signal/signal.module.css';

const COUNTRIES = [
  ['AE', 'United Arab Emirates'],
  ['EG', 'Egypt'],
  ['SA', 'Saudi Arabia'],
  ['QA', 'Qatar'],
  ['BH', 'Bahrain'],
  ['OM', 'Oman'],
  ['KW', 'Kuwait'],
] as const;

function hasSupportedEvidence(data: NonNullable<SignalLookupResponse['data']>) {
  return Boolean(
    data.profile?.verified
    || data.aliases.length
    || data.businessMatches.length
    || data.publicMentions.length
    || Object.keys(data.reputation).length,
  );
}

export function SignalLookupClient({ locale = 'en' }: { locale?: 'en' | 'ar' }) {
  const arabic = locale === 'ar';
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('AE');
  const [phase, setPhase] = useState<SignalPhase>('idle');
  const [result, setResult] = useState<SignalLookupResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const normalized = useMemo(
    () => query.trim() ? normalizeSignalPhone(query, country) : null,
    [query, country],
  );

  const evidenceNodes = useMemo<EvidenceNode[]>(() => {
    if (!result?.ok || !result.data) return [];
    const data = result.data;
    const nodes: EvidenceNode[] = [];

    if (data.profile?.verified) {
      const name = data.profile.businessName ?? data.profile.displayName ?? 'Verified profile';
      const details: Array<[string, string]> = [['Verification', 'Verified KNOuX profile']];
      if (data.profile.profileKind) details.push(['Profile kind', data.profile.profileKind]);
      details.push(['Community aliases', data.profile.communityAliasesEnabled ? 'Enabled' : 'Disabled']);
      nodes.push({
        id: 'verified-profile',
        label: name,
        meta: 'VERIFIED PROFILE',
        kind: 'verified',
        category: 'VERIFIED_CLAIM',
        details,
      });
    }

    data.aliases.forEach((alias) => {
      nodes.push({
        id: `alias:${alias.normalizedLabel}`,
        label: alias.label,
        meta: `${alias.count} CONTRIBUTION${alias.count === 1 ? '' : 'S'}`,
        kind: 'alias',
        category: 'COMMUNITY_ALIAS',
        support: alias.count,
        details: [
          ['Normalized label', alias.normalizedLabel],
          ['Category', alias.category],
          ['Support', String(alias.count)],
          ['Evidence source', 'KNOuX community graph'],
        ],
      });
    });

    data.businessMatches.forEach((match, index) => {
      const details: Array<[string, string]> = [['Source', match.sourceName]];
      if (match.category) details.push(['Category', match.category]);
      if (match.locality) details.push(['Locality', match.locality]);
      if (match.countryCode) details.push(['Country', match.countryCode]);
      nodes.push({
        id: `business:${match.sourceKey}:${index}`,
        label: match.name,
        meta: match.sourceName.toUpperCase(),
        kind: 'business',
        category: 'BUSINESS_IDENTITY',
        sourceId: match.sourceKey,
        publisher: match.sourceName,
        details,
        url: match.sourceUrl ?? undefined,
      });
    });

    data.publicMentions.forEach((mention, index) => {
      const details: Array<[string, string]> = [['Domain', mention.domain]];
      if (mention.snippet) details.push(['Matched context', mention.snippet]);
      nodes.push({
        id: `public:${index}:${mention.url}`,
        label: mention.title,
        meta: mention.domain.toUpperCase(),
        kind: 'public',
        category: 'PUBLIC_WEB_MENTION',
        details,
        url: mention.url,
      });
    });

    Object.entries(data.reputation).forEach(([label, count]) => {
      nodes.push({
        id: `reputation:${label}`,
        label,
        meta: `${count} REPORT${count === 1 ? '' : 'S'}`,
        kind: 'reputation',
        category: 'REPUTATION',
        support: count,
        details: [
          ['Category', label],
          ['Report count', String(count)],
        ],
      });
    });

    return nodes;
  }, [result]);

  const selected = selectedId ? evidenceNodes.find((item) => item.id === selectedId) ?? null : null;
  const evidenceCount = evidenceNodes.length;
  const inputSignal = query.replace(/\D/g, '').length;
  const layoutSeed = result?.ok && result.data ? result.data.number.e164 : query;
  const placements = useMemo(
    () => placementMap(evidenceNodes, layoutSeed || 'knoux-signal'),
    [evidenceNodes, layoutSeed],
  );
  const visualMode = visualModeForPhase(phase);

  function transitionInput(value: string, nextCountry = country) {
    setQuery(value);
    setResult(null);
    setSelectedId(null);
    setError('');
    if (!value.trim()) {
      setPhase('idle');
      return;
    }
    setPhase(normalizeSignalPhone(value, nextCountry).valid ? 'ready' : 'input');
  }

  function reset() {
    setQuery('');
    setResult(null);
    setSelectedId(null);
    setError('');
    setPhase('idle');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'searching' || !query.trim()) return;

    const facts = normalizeSignalPhone(query, country);
    if (!facts.valid) {
      setError(facts.reason ?? 'Enter a valid phone number.');
      setPhase('input');
      return;
    }

    setPhase('searching');
    setError('');
    setSelectedId(null);

    try {
      const response = await fetch('/api/signal/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, country }),
      });
      const payload = await response.json() as SignalLookupResponse & { error?: string };
      setResult(payload);

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? payload.query?.reason ?? 'Lookup failed.');
        setPhase(response.status === 429 ? 'rate_limited' : 'error');
        return;
      }

      if (payload.data && hasSupportedEvidence(payload.data)) {
        setPhase('result');
      } else {
        setPhase('not_found');
      }
    } catch {
      setError('Signal could not reach the lookup endpoint.');
      setPhase('error');
    }
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.signalScene} data-phase={phase} aria-label="KNOuX Signal lookup instrument">
        <SignalGlobeScene
          evidenceCount={evidenceCount}
          mode={visualMode}
          inputSignal={inputSignal}
        />
        <div className={styles.sceneVeil} aria-hidden="true" />

        <div className={styles.sceneStatus} aria-hidden="true">
          <span>KN / SIGNAL FIELD</span>
          <span>{phaseStatusCopy(phase)}</span>
        </div>

        <form className={styles.search} onSubmit={submit}>
          <label className={styles.srOnly} htmlFor="signal-query">{arabic ? 'رقم الهاتف' : 'Phone number'}</label>
          <div className={styles.searchRow}>
            <select
              aria-label={arabic ? 'الدولة' : 'Country'}
              value={country}
              onChange={(event) => {
                const nextCountry = event.target.value;
                setCountry(nextCountry);
                transitionInput(query, nextCountry);
              }}
            >
              {COUNTRIES.map(([code, label]) => (
                <option key={code} value={code}>{code} · {label}</option>
              ))}
            </select>
            <input
              id="signal-query"
              dir="ltr"
              value={query}
              onChange={(event) => transitionInput(event.target.value)}
              placeholder={arabic ? 'ابحث عن رقم هاتف' : 'Search a phone number'}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(query.trim()) && normalized?.valid === false}
            />
            <button
              className={styles.clearButton}
              type="button"
              onClick={reset}
              disabled={!query.trim() || phase === 'searching'}
              aria-label={arabic ? 'مسح الرقم' : 'Clear number'}
            >
              ×
            </button>
            <button
              className={styles.submitButton}
              type="submit"
              disabled={phase === 'searching' || !normalized?.valid}
              aria-label={arabic ? 'البحث عن أدلة الرقم' : 'Resolve number'}
            >
              →
            </button>
          </div>
          <p>{arabic ? (phase === 'searching' ? 'جارٍ البحث عن الأدلة' : phase === 'result' ? 'تم العثور على أدلة' : phase === 'not_found' ? 'لا توجد أدلة مدعومة' : phase === 'ready' ? 'الرقم جاهز للبحث' : phase === 'error' ? 'تعذر إكمال البحث' : phase === 'rate_limited' ? 'تم بلوغ حد الطلبات' : 'أدخل رقمًا للبحث') : phaseStatusCopy(phase)} · {arabic ? 'أدلة فقط' : 'EVIDENCE ONLY'}</p>
        </form>

        {result?.ok && result.data ? (
          <div className={styles.resolvedAnchor} aria-hidden="true">
            <strong>{result.data.number.e164}</strong>
            <span>{result.data.number.lineType.toUpperCase()}</span>
          </div>
        ) : null}

        {evidenceNodes.length ? (
          <div className={styles.orbitLabels}>
            {evidenceNodes.slice(0, 8).map((item) => {
              const placement = placements.get(item.id);
              return (
                <button
                  type="button"
                  className={styles.orbitLabel}
                  data-kind={item.kind}
                  data-category={item.category}
                  key={item.id}
                  style={placement ? {
                    left: `${placement.left}%`,
                    top: `${placement.top}%`,
                    zIndex: 5 + (6 - placement.depth),
                  } : undefined}
                  onClick={() => setSelectedId(item.id)}
                  aria-label={`Inspect ${item.label}`}
                >
                  <strong>{item.label}</strong>
                  <span>{item.meta}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <SignalEvidenceInspector
          node={selected}
          onClose={() => setSelectedId(null)}
        />
      </section>

      {error ? <div className={styles.error} role="alert">{arabic ? (phase === 'rate_limited' ? 'طلبات كثيرة. حاول مجددًا لاحقًا.' : phase === 'input' ? 'أدخل رقم هاتف صحيحًا واختر الدولة.' : 'تعذر إكمال البحث. لم يتم إثبات أي هوية. حاول مجددًا.') : error}</div> : null}

      {result?.ok && result.data ? (
        <section className={styles.evidenceLedger} aria-live="polite" aria-label="Signal evidence index">
          <header className={styles.ledgerHeader}>
            <div>
              <span className={styles.micro}>RESOLVED NUMBER</span>
              <strong>{result.data.number.e164}</strong>
            </div>
            <div className={styles.ledgerFacts}>
              <span>{result.data.number.countryCode}</span>
              <span>{result.data.number.lineType.toUpperCase()}</span>
              <span>{evidenceCount} EVIDENCE ITEM{evidenceCount === 1 ? '' : 'S'}</span>
            </div>
          </header>

          {evidenceNodes.length ? (
            <div className={styles.ledgerList}>
              {evidenceNodes.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <code>{String(index + 1).padStart(2, '0')}</code>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.meta}</small>
                  </span>
                  <em>{item.kind.toUpperCase()}</em>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.notFound}>
              <span className={styles.micro}>{arabic ? 'لا توجد أدلة مدعومة' : 'NO SUPPORTED EVIDENCE FOUND'}</span>
              <p>{arabic ? 'صيغة الرقم صحيحة، لكن المصادر الحالية لم تُرجع أدلة هوية مدعومة.' : 'The number is structurally valid, but current providers returned no supported identity evidence.'}</p>
            </div>
          )}

          <div className={styles.providerStrip}>
            <span>COMMUNITY · {result.providers.community}</span>
            <span>LICENSED IDENTITY · {result.providers.licensedIdentity}</span>
            <span>PUBLIC SEARCH · {result.providers.publicSearch}</span>
            {!result.storage.available ? <span>STORAGE · {result.storage.reason ?? 'unavailable'}</span> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
