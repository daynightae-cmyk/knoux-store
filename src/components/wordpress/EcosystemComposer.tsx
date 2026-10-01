'use client';

import { useState } from 'react';

/**
 * Ecosystem Composer.
 *
 * The closing move: the four layers of the ecosystem assembled into one
 * request. The visitor chooses which layers they want, and the composition is
 * a brief — not a basket, not a checkout, and deliberately not a total.
 *
 * There is no price on this surface and no "add to cart" button, because there
 * is no commerce provider connected to this deployment. What the composer does
 * produce is a selection a person can send to KNOuX, and every layer in it is
 * something KNOuX actually performs. The four layers are the same four the
 * page is organised around, so this is a summary of the ecosystem rather than a
 * separate offer bolted onto the end of it.
 *
 * The selection is real state: it is reflected in a live region, it is
 * keyboard operable, and it survives without any animation. The composition
 * is carried into the site's existing request form as URL state — the same
 * mechanism `/build` and the goal index already use — rather than as a second
 * form that would need its own delivery, its own rate limit and its own
 * validation. One request path, one place where delivery is actually
 * reported, no second intake to keep honest.
 */

const LAYERS = [
  {
    id: 'domain',
    code: '01',
    label: 'Domain',
    statement: 'Find and secure the name. A registrar answers availability; KNOuX handles the decision and the setup.',
    detail: 'Name strategy, extension choice, registrar account, DNS and renewal ownership.',
  },
  {
    id: 'infrastructure',
    code: '02',
    label: 'Infrastructure',
    statement: 'Decide where WordPress runs, and who is responsible for it staying up.',
    detail: 'Hosting selection against the site’s real load, environment configuration, baseline documentation.',
  },
  {
    id: 'wordpress',
    code: '03',
    label: 'WordPress',
    statement: 'The editorial system itself, built on verified software rather than a template bundle.',
    detail: 'Theme configuration, block architecture, plugin selection, content model, role design.',
  },
  {
    id: 'operations',
    code: '04',
    label: 'Operations',
    statement: 'The part that keeps the launch alive after launch day.',
    detail: 'Maintenance, performance work, security monitoring, backup with a tested restore.',
  },
] as const;

type LayerId = (typeof LAYERS)[number]['id'];

export function EcosystemComposer() {
  const [selected, setSelected] = useState<LayerId[]>(['domain', 'wordpress', 'operations']);

  const toggle = (id: LayerId) => {
    setSelected((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const composition = LAYERS.filter((layer) => selected.includes(layer.id));

  // The existing request form reads `requestType` and `items` from the URL, so
  // the composition arrives pre-selected instead of being retyped.
  const requestHref = (() => {
    if (composition.length === 0) return '/contact?requestType=wordpress';
    const params = new URLSearchParams({
      requestType: 'wordpress',
      items: composition.map((layer) => layer.label).join(', '),
    });
    return `/contact?${params.toString()}`;
  })();

  return (
    <div className="composer">
      <div className="composer__stack">
        <span className="composer__stack-label">REQUEST / COMPOSE THE BUILD</span>
        <ol className="composer__layers">
          {LAYERS.map((layer) => {
            const isSelected = selected.includes(layer.id);
            return (
              <li key={layer.id}>
                <button
                  type="button"
                  className={`composer__layer ${isSelected ? 'is-active' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => toggle(layer.id)}
                >
                  <span className="composer__layer-code">{layer.code}</span>
                  <span className="composer__layer-body">
                    <strong>{layer.label}</strong>
                    <span className="composer__layer-statement">{layer.statement}</span>
                  </span>
                  <span className="composer__layer-state">{isSelected ? 'INCLUDED' : 'ADD'}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="composer__brief">
        <span className="label label--signal">YOUR COMPOSITION</span>
        <div aria-live="polite">
          {composition.length === 0 ? (
            <p className="composer__brief-empty">
              Nothing selected yet. Add the layers you want and the request below will describe them.
            </p>
          ) : (
            <>
              <h3 className="composer__brief-title">
                {composition.length} layer{composition.length === 1 ? '' : 's'} composed.
              </h3>
              <ol className="composer__brief-list">
                {composition.map((layer) => (
                  <li key={layer.id}>
                    <span className="mono">{layer.code}</span> {layer.label} — {layer.detail}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <div className="composer__actions">
          <a className="action action--primary" href={requestHref}>
            {composition.length === 0 ? 'Start a WordPress request' : `Request these ${composition.length} layers`}
            <span className="action-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
          <span className="composer__actions-note">Opens the KNOuX request form with this composition selected.</span>
        </div>

        <p className="composer__footnote">
          This is a request, not a checkout. There is no instant purchase on this site: no payment is taken here and
          no domain is registered. KNOuX replies with scope, a sequence and a price for the work before anything is
          committed.
        </p>
      </div>
    </div>
  );
}
