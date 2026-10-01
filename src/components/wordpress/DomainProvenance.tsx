'use client';

import { useEffect, useState } from 'react';

/**
 * Domain data provenance.
 *
 * Says two things a visitor is entitled to know before typing a name: whether a
 * registrar is connected, and what KNOuX does and does not claim on its behalf.
 *
 * It reads `/api/domain/status` at request time rather than receiving a prop
 * from the page, and that is a deliberate decision about staleness. This page
 * is statically generated, so a provider state read during the build would be
 * baked into the HTML and served to every visitor until the next deployment —
 * meaning connecting a registrar would either require a rebuild to be visible,
 * or worse, be invisible while the page claimed there was no provider. The
 * request costs one same-origin fetch of a fixed, non-secret shape, and buys a
 * statement that is true now.
 *
 * Until that read resolves, the state is rendered as unknown rather than
 * guessed in either direction. Claiming a connection that cannot be confirmed
 * would be the more damaging of the two mistakes, so the fallback is the
 * conservative one.
 */

type Connection = {
  status: 'configured' | 'unconfigured' | 'partially-configured';
  explanation: string;
  provider: string | null;
};

export function useDomainConnection(): Connection | null {
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/domain/status', { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? (response.json() as Promise<Connection>) : null))
      .then((body) => {
        if (cancelled || !body?.status) return;
        setConnection(body);
      })
      .catch(() => {
        // A failed status read leaves the state unknown. The panel below renders
        // that absence rather than substituting a guess.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return connection;
}

export function DomainProvenance() {
  const connection = useDomainConnection();

  return (
    <aside className="eco-provenance" aria-label="Domain data provenance" aria-busy={connection === null}>
      <span className="label label--signal">PROVIDER STATE</span>

      <p className="eco-provenance__state">
        {connection === null ? (
          <span className="mark">READING</span>
        ) : connection.status === 'configured' ? (
          <span className="mark mark--active">CONNECTED · {connection.provider}</span>
        ) : (
          <span className="mark mark--planned">NOT CONFIGURED</span>
        )}
      </p>

      <p className="eco-provenance__body">
        {connection === null
          ? 'Checking whether a registrar is connected to this deployment.'
          : connection.explanation}
      </p>

      <p className="eco-provenance__body">
        Secrets for a registrar are read on the server and never reach the browser. When a provider is connected,
        every result carries the provider name that produced it and the time it was checked. Nothing is registered,
        reserved or purchased from this page.
      </p>

      {connection?.status === 'partially-configured' ? (
        <p className="eco-provenance__body">
          A partially configured provider is treated as absent, because a provider missing one credential fails at the
          first request and turns a configuration problem into a visitor-facing error.
        </p>
      ) : null}
    </aside>
  );
}

/** The same state, compressed to the ledger's one-line form. */
export function DomainConnectionSummary() {
  const connection = useDomainConnection();

  if (connection === null) return <span className="eco-provenance__pending">Reading</span>;
  if (connection.status === 'configured') return `Connected · ${connection.provider}`;
  return connection.status === 'partially-configured' ? 'Partially configured' : 'Not configured';
}
