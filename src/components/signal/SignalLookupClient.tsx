'use client';

import { useState, type FormEvent } from 'react';
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

export function SignalLookupClient() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('AE');
  const [result, setResult] = useState<SignalLookupResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || busy) return;
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/signal/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, country }),
      });
      const payload = await response.json() as SignalLookupResponse & { error?: string };
      setResult(payload);
      if (!response.ok) setError(payload.error ?? payload.query?.reason ?? 'Lookup failed.');
    } catch {
      setError('Signal could not reach the lookup endpoint.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.workspace}>
      <form className={styles.search} onSubmit={submit}>
        <label htmlFor="signal-query">Phone number</label>
        <div className={styles.searchRow}>
          <select aria-label="Country" value={country} onChange={(event) => setCountry(event.target.value)}>
            {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{code} · {label}</option>)}
          </select>
          <input
            id="signal-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="+971 50 123 4567"
            inputMode="tel"
            autoComplete="tel"
          />
          <button type="submit" disabled={busy || !query.trim()}>{busy ? 'SEARCHING…' : 'SEARCH →'}</button>
        </div>
        <p>International format works without a country selection. No demo labels are generated.</p>
      </form>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      {result?.ok && result.data ? (
        <section className={styles.results} aria-live="polite">
          <header>
            <div>
              <span className={styles.micro}>NORMALIZED NUMBER</span>
              <strong>{result.data.number.e164}</strong>
            </div>
            <span className={styles.type}>{result.data.number.lineType.toUpperCase()}</span>
          </header>

          <div className={styles.grid}>
            <article>
              <span className={styles.micro}>IDENTITY</span>
              {result.data.profile?.verified ? (
                <>
                  <h2>{result.data.profile.businessName ?? result.data.profile.displayName ?? 'Verified profile'}</h2>
                  <p>Verified KNOuX Signal profile.</p>
                </>
              ) : (
                <>
                  <h2>UNCLAIMED / UNVERIFIED</h2>
                  <p>No verified identity is asserted for this number.</p>
                </>
              )}
            </article>

            <article>
              <span className={styles.micro}>COMMUNITY ALIASES</span>
              {result.data.aliases.length ? (
                <ol className={styles.aliases}>
                  {result.data.aliases.map((alias) => (
                    <li key={alias.normalizedLabel}>
                      <strong>{alias.label}</strong>
                      <span>{alias.count} contribution{alias.count === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>
                  {result.data.profile?.communityAliasesEnabled
                    ? 'No community aliases have been contributed yet.'
                    : 'Community aliases are not enabled for this profile.'}
                </p>
              )}
            </article>

            <article>
              <span className={styles.micro}>REPUTATION</span>
              {Object.keys(result.data.reputation).length ? (
                <dl className={styles.reputation}>
                  {Object.entries(result.data.reputation).map(([label, count]) => (
                    <div key={label}><dt>{label}</dt><dd>{count}</dd></div>
                  ))}
                </dl>
              ) : <p>No community reputation evidence is available.</p>}
            </article>

            <article>
              <span className={styles.micro}>BUSINESS MATCHES</span>
              {result.data.businessMatches.length ? (
                <ol className={styles.mentions}>
                  {result.data.businessMatches.map((match) => (
                    <li key={`${match.sourceKey}:${match.name}:${match.sourceUrl ?? ''}`}>
                      {match.sourceUrl ? (
                        <a href={match.sourceUrl} target="_blank" rel="noreferrer">
                          <strong>{match.name}</strong>
                          <span>{match.sourceName}</span>
                        </a>
                      ) : (
                        <div><strong>{match.name}</strong> · {match.sourceName}</div>
                      )}
                      <p>{[match.category, match.locality, match.countryCode].filter(Boolean).join(' · ') || 'Business identity match'}</p>
                    </li>
                  ))}
                </ol>
              ) : <p>No approved business-directory match is stored for this number yet.</p>}
            </article>

            <article>
              <span className={styles.micro}>PUBLIC MENTIONS</span>
              {result.data.publicMentions.length ? (
                <ol className={styles.mentions}>
                  {result.data.publicMentions.map((mention) => (
                    <li key={mention.url}>
                      <a href={mention.url} target="_blank" rel="noreferrer">
                        <strong>{mention.title}</strong>
                        <span>{mention.domain}</span>
                      </a>
                      {mention.snippet ? <p>{mention.snippet}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : <p>No exact public-web mentions were returned by the configured search provider.</p>}
            </article>

            <article>
              <span className={styles.micro}>DATA STATE</span>
              <dl className={styles.reputation}>
                <div><dt>Community graph</dt><dd>{result.providers.community}</dd></div>
                <div><dt>Licensed identity provider</dt><dd>{result.providers.licensedIdentity}</dd></div>
                <div><dt>Public search provider</dt><dd>{result.providers.publicSearch}</dd></div>
              </dl>
              {!result.storage.available ? <p className={styles.warning}>{result.storage.reason}</p> : null}
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
