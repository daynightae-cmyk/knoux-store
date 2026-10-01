'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { formatMoney, TLD_SHORTCUTS, type DomainAvailability } from '@/lib/domain/shared';

/**
 * Domain Finder.
 *
 * A real instrument: a form, a result field, and one honest state at a time.
 *
 * The governing rule is that this component never states a fact about a domain
 * it did not receive from a registrar. It can say "available", "unavailable",
 * "premium", "unsupported" because those came back from the provider. It
 * cannot say "taken" because a request failed, because no provider is
 * configured, or because the person has not searched yet. Those are three
 * visibly different states here, and the difference is the feature.
 *
 * Everything works without scripting in the sense that matters: the form is a
 * real `<form>` with a real label, the TLD choices are real controls, and the
 * result is announced in a live region. The script layer adds the loading
 * transition; it is not what makes the control operable.
 */

type ResultState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'unconfigured' }
  | { phase: 'error' }
  | { phase: 'invalid'; message: string }
  | { phase: 'results'; results: DomainAvailability[]; provider: string | null; checkedAt: string };

const STATE_COPY: Record<DomainAvailability['state'], { label: string; tone: string }> = {
  available: { label: 'AVAILABLE', tone: 'ok' },
  premium: { label: 'PREMIUM', tone: 'signal' },
  unavailable: { label: 'UNAVAILABLE', tone: 'off' },
  unsupported: { label: 'UNSUPPORTED TLD', tone: 'off' },
  unknown: { label: 'NOT DETERMINED', tone: 'off' },
  unconfigured: { label: 'PROVIDER NOT CONFIGURED', tone: 'off' },
  error: { label: 'CHECK FAILED', tone: 'warn' },
};

function ResultRow({ result }: { result: DomainAvailability }) {
  const copy = STATE_COPY[result.state];
  const registration = formatMoney(result.registration);
  const renewal = formatMoney(result.renewal);

  return (
    <li className={`domain-row domain-row--${copy.tone}`}>
      <div className="domain-row__identity">
        <span className="domain-row__name">{result.domain}</span>
        <span className="domain-row__state">
          <span className="domain-row__state-dot" aria-hidden="true" />
          {copy.label}
        </span>
      </div>

      <dl className="domain-row__facts">
        <div>
          <dt>Registration</dt>
          <dd>{registration ?? <span className="is-absent">Not published</span>}</dd>
        </div>
        <div>
          <dt>Renewal</dt>
          <dd>{renewal ?? <span className="is-absent">Not published</span>}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{result.provider}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>
            <time dateTime={result.checkedAt}>
              {new Date(result.checkedAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </dd>
        </div>
      </dl>

      {result.reason ? <p className="domain-row__reason">{result.reason}</p> : null}
    </li>
  );
}

export function DomainFinder() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(['com']);
  const [state, setState] = useState<ResultState>({ phase: 'idle' });
  // `null` means the connection state has not been read yet. It is read once on
  // mount from a request-time endpoint rather than being baked into the HTML at
  // build time, because this page is statically generated and a provider can be
  // connected after a build.
  const [connection, setConnection] = useState<{ connected: boolean; known: boolean }>({
    connected: false,
    known: false,
  });
  const fieldId = useId();
  const listId = useId();
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/domain/status', { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { status?: string } | null) => {
        if (cancelled || !body?.status) return;
        setConnection({ connected: body.status === 'configured', known: true });
      })
      .catch(() => {
        // A status read that fails leaves the state unknown, and an unknown
        // state renders as "not configured" — the conservative reading, since
        // claiming a connection that cannot be confirmed would be worse.
        if (!cancelled) setConnection({ connected: false, known: true });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((tld: string) => {
    setSelected((current) =>
      current.includes(tld) ? (current.length === 1 ? current : current.filter((entry) => entry !== tld)) : [...current, tld],
    );
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        setState({ phase: 'invalid', message: 'Enter a name to search for.' });
        return;
      }

      const ticket = requestRef.current + 1;
      requestRef.current = ticket;
      setState({ phase: 'checking' });

      const params = new URLSearchParams({ q: trimmed });
      for (const tld of selected) params.append('tld', tld);

      try {
        const response = await fetch(`/api/domain/search?${params.toString()}`, {
          headers: { accept: 'application/json' },
        });
        const body = (await response.json()) as {
          state?: string;
          message?: string;
          provider?: string | null;
          checkedAt?: string;
          results?: DomainAvailability[];
        };

        // A slower earlier request must not overwrite a newer answer.
        if (requestRef.current !== ticket) return;

        if (body.state === 'unconfigured') {
          setState({ phase: 'unconfigured' });
        } else if (body.state === 'error') {
          setState({ phase: 'error' });
        } else if (body.state === 'invalid' || body.state === 'rate-limited') {
          setState({ phase: 'invalid', message: body.message ?? 'That search could not be run.' });
        } else {
          setState({
            phase: 'results',
            results: body.results ?? [],
            provider: body.provider ?? null,
            checkedAt: body.checkedAt ?? new Date().toISOString(),
          });
        }
      } catch {
        if (requestRef.current !== ticket) return;
        // A network failure is reported as a failure. It is never rendered as
        // an availability answer.
        setState({ phase: 'error' });
      }
    },
    [query, selected],
  );

  const busy = state.phase === 'checking';

  return (
    <div className="domain-finder">
      <form className="domain-finder__form" onSubmit={submit} role="search" noValidate>
        <div className="domain-finder__input-row">
          <label className="domain-finder__label" htmlFor={fieldId}>
            Find your domain
          </label>
          <div className="domain-finder__field">
            <span className="domain-finder__prefix" aria-hidden="true">
              ⌕
            </span>
            <input
              id={fieldId}
              name="domain"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="yourbrand"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={63}
              aria-describedby={`${fieldId}-hint`}
            />
            <button className="action action--primary domain-finder__submit" type="submit" disabled={busy}>
              {busy ? 'Checking' : 'Search'}
              <span className="action-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          </div>
          <p className="domain-finder__hint" id={`${fieldId}-hint`}>
            Enter a name or a full domain. Nothing is registered from this page.
          </p>
        </div>

        <fieldset className="domain-finder__tlds">
          <legend className="domain-finder__legend">Extensions to check</legend>
          <div className="domain-finder__tld-list" role="group" aria-label="Extensions to check">
            {TLD_SHORTCUTS.map((tld) => {
              const isSelected = selected.includes(tld);
              return (
                <button
                  key={tld}
                  type="button"
                  className={`tag tag--button domain-finder__tld ${isSelected ? 'is-active' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => toggle(tld)}
                >
                  .{tld}
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>

      {/*
        One live region for the whole result area. A result field that changes
        silently is invisible to a screen reader, and the state change is the
        entire point of the control.
      */}
      <div className="domain-finder__results" id={listId} aria-live="polite" aria-busy={busy}>
        {state.phase === 'idle' ? (
          <p className="domain-finder__idle">
            <span className="label label--signal">AWAITING A QUERY</span>
            <span>
              A registrar answers availability. When one is connected, its verdict and its published prices appear
              here, attributed to the registrar that produced them.
            </span>
          </p>
        ) : null}

        {state.phase === 'checking' ? (
          <p className="domain-finder__idle">
            <span className="label label--signal">CHECKING</span>
            <span>Asking the registrar. No result is assumed while this runs.</span>
          </p>
        ) : null}

        {state.phase === 'unconfigured' ? (
          <div className="domain-finder__notice">
            <span className="label label--signal">LIVE AVAILABILITY PROVIDER NOT CONFIGURED</span>
            <p className="domain-finder__notice-title">This deployment has no registrar connected.</p>
            <p>
              KNOuX will not answer for a registrar it has not asked. Availability and pricing appear here once a
              registrar connection is configured, and every result is labelled with the provider that produced it.
              In the meantime the name can be checked and registered for you.
            </p>
            <div className="domain-finder__notice-actions">
              <a className="action action--primary" href="/contact?intent=domain">
                Request domain setup
              </a>
              <a className="action" href="/contact">
                Contact KNOuX
              </a>
            </div>
          </div>
        ) : null}

        {state.phase === 'error' ? (
          <div className="domain-finder__notice" data-tone="error">
            <span className="label label--signal">UPSTREAM ERROR</span>
            <p className="domain-finder__notice-title">The registrar could not be reached.</p>
            <p>
              This is a failure to check, not a verdict. No statement is made about whether any of these names is
              available. Try again, or ask KNOuX to check a specific name.
            </p>
            <div className="domain-finder__notice-actions">
              <button className="action action--primary" type="button" onClick={() => void submit({ preventDefault() {} } as FormEvent<HTMLFormElement>)}>
                Try again
              </button>
              <a className="action" href="/contact?intent=domain">
                Ask KNOuX
              </a>
            </div>
          </div>
        ) : null}

        {state.phase === 'invalid' ? (
          <div className="domain-finder__notice" data-tone="error">
            <span className="label label--signal">INVALID INPUT</span>
            <p className="domain-finder__notice-title">{state.message}</p>
          </div>
        ) : null}

        {state.phase === 'results' ? (
          <>
            <p className="domain-finder__status meta-row">
              <span>{state.results.length} name{state.results.length === 1 ? '' : 's'} checked</span>
              {state.provider ? <span>Source: {state.provider}</span> : null}
            </p>
            {state.results.length === 0 ? (
              <p className="domain-finder__idle">
                <span className="label label--signal">NO VERDICT RETURNED</span>
                <span>The registrar did not return an answer for this name. Nothing is claimed either way.</span>
              </p>
            ) : (
              <ul className="domain-list">
                {state.results.map((result) => (
                  <ResultRow key={result.domain} result={result} />
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>

      {/*
        Rendered whenever no provider is active, so the state is legible
        before anyone interacts with the control. A finder that only admits it
        cannot answer *after* a search invites the question.
      */}
      {connection.known && !connection.connected && state.phase === 'idle' ? (
        <p className="domain-finder__preflight">
          <span className="label label--signal">PROVIDER STATE: NOT CONFIGURED</span>
          <span>
            The complete finder is rendered and functional. Availability will be filled in by a registrar the moment
            one is connected to this deployment.
          </span>
        </p>
      ) : null}
    </div>
  );
}
