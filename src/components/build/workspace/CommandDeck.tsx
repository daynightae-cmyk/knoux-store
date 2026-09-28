'use client';

/**
 * Command Deck — the genesis layer.
 *
 * The existing Build Composer is preserved and rendered here unchanged. It
 * remains the project assembly surface; the deck adds the deterministic
 * specification reading beside it and the idle state it previously lacked.
 *
 * Nothing below invents a project, a recent session or an activity feed. With
 * no real session there is nothing to show, and the empty region says exactly
 * that instead of filling itself with decoration.
 */

import { useState } from 'react';
import { Composer } from '@/components/Composer';
import { MARK_PATHS, MARK_VIEW_BOX } from '@/lib/knouxMark';
import { entityById } from '@/data/composer-rules';
import { useBuildWorkspace } from './KnouxBuildWorkspace';
import { Blocked, Chips, Empty, Section, StatusBadge } from './Primitives';
import type { ProductKind } from '@/lib/build/types';

const PRODUCT_LABELS: { id: ProductKind; label: string }[] = [
  { id: 'unknown', label: 'UNRESOLVED' },
  { id: 'website', label: 'WEBSITE' },
  { id: 'web-application', label: 'WEB APPLICATION' },
  { id: 'ecommerce', label: 'ECOMMERCE' },
  { id: 'saas', label: 'SAAS' },
  { id: 'portal', label: 'PORTAL' },
  { id: 'api', label: 'API' },
  { id: 'ai-application', label: 'AI APPLICATION' },
  { id: 'admin', label: 'ADMIN' },
  { id: 'landing', label: 'LANDING' },
  { id: 'booking', label: 'BOOKING' },
  { id: 'desktop', label: 'DESKTOP' },
  { id: 'system-tool', label: 'SYSTEM TOOL' },
];

const EXAMPLES = [
  'Build an inventory management app with Supabase, Arabic and English, an admin dashboard and an Android-ready PWA.',
  'I need an online store with payments and Google Ads.',
  'A customer portal where my clients can book appointments.',
];

export function CommandDeck({ onCompile }: { onCompile: (raw: string) => void }) {
  const { state, dispatch } = useBuildWorkspace();
  const [draft, setDraft] = useState('');
  const intent = state.intent;

  return (
    <div className="bo-genesis">
      <div className="bo-genesis__left">
        <svg
          className="bo-genesis__mark"
          viewBox={`0 0 ${MARK_VIEW_BOX.width} ${MARK_VIEW_BOX.height}`}
          aria-hidden="true"
          focusable="false"
        >
          {MARK_PATHS.map((path) => (
            <path key={path.id} d={path.d} fill="none" stroke="var(--bo-violet)" strokeWidth="9" strokeLinejoin="round" />
          ))}
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="bo-label">Project genesis</span>
          <h2 className="bo-editorial">
            Describe what you need.
            <br />
            <em>KNOuX reads it against its own registries.</em>
          </h2>
          <p className="bo-note">
            The deck below is the existing Build Composer, unchanged. It resolves your sentence to real KNOuX
            products, services and systems. Beside it, a deterministic specification reader extracts product kind,
            stack, integrations, language and deployment target from the same words — without a model, and without
            inventing a term it cannot resolve.
          </p>
        </div>

        <Section label="Try a specification">
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--bo-line-faint)' }}>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="bo-example"
                onClick={() => {
                  setDraft(example);
                  onCompile(example);
                }}
              >
                <span className="bo-example__text">{example}</span>
                <span className="bo-example__go" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Specification read">
          <div className="bo-field">
            <label className="bo-field__label" htmlFor="bo-intent">
              Intent
            </label>
            <textarea
              id="bo-intent"
              className="bo-textarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Describe the project."
              aria-describedby="bo-intent-help"
            />
          </div>
          <div className="bo-actions">
            <button
              type="button"
              className="bo-action bo-action--primary"
              disabled={draft.trim().length === 0}
              onClick={() => onCompile(draft)}
            >
              READ SPECIFICATION
            </button>
            {intent ? (
              <button type="button" className="bo-action" onClick={() => dispatch({ type: 'reset' })}>
                CLEAR
              </button>
            ) : null}
          </div>
          <p id="bo-intent-help" className="bo-blocked__req">
            Deterministic extraction. The same sentence always yields the same reading on any machine.
          </p>
        </Section>

        {intent ? (
          <Section label="Read result">
            <div className="bo-chips" style={{ marginBottom: 12 }}>
              <StatusBadge status={intent.confidence === 'resolved' ? 'pass' : intent.confidence === 'partial' ? 'partial' : 'not-run'} label={intent.confidence.toUpperCase()} />
              {intent.productKind !== 'unknown' ? (
                <span className="bo-chip" style={{ cursor: 'default' }}>
                  {PRODUCT_LABELS.find((entry) => entry.id === intent.productKind)?.label ?? intent.productKind}
                </span>
              ) : null}
              {intent.deploymentTarget !== 'unknown' ? (
                <span className="bo-chip" style={{ cursor: 'default' }}>
                  → {intent.deploymentTarget.toUpperCase()}
                </span>
              ) : null}
            </div>

            <dl className="bo-kv">
              <dt>Stack</dt>
              <dd>{intent.requestedStack.length ? intent.requestedStack.join(', ') : 'NOT STATED'}</dd>
              <dt>Integrations</dt>
              <dd>{intent.requestedIntegrations.length ? intent.requestedIntegrations.join(', ') : 'NOT STATED'}</dd>
              <dt>Languages</dt>
              <dd>{intent.languagePreferences.length ? intent.languagePreferences.join(', ') : 'NOT STATED'}</dd>
              <dt>Matched phrases</dt>
              <dd>{intent.matchedPhrases.length ? intent.matchedPhrases.join(', ') : 'NONE'}</dd>
              <dt>Resolved records</dt>
              <dd>
                {intent.resolvedEntityIds.length
                  ? intent.resolvedEntityIds
                      .map((id) => entityById.get(id))
                      .filter((entity) => Boolean(entity))
                      .map((entity) => `${entity?.code} ${entity?.name}`)
                      .join(' · ')
                  : 'NONE'}
              </dd>
              <dt>Unresolved terms</dt>
              <dd style={{ color: intent.unresolvedTerms.length ? 'var(--bo-amber)' : undefined }}>
                {intent.unresolvedTerms.length
                  ? `${intent.unresolvedTerms.join(', ')} — these matched nothing and were not guessed at.`
                  : 'None. Every term resolved or was a stop word.'}
              </dd>
            </dl>
          </Section>
        ) : (
          <Blocked
            title="NO SPECIFICATION READ"
            body="Nothing has been compiled yet. The registry resolution below already works on its own — it is the existing Build Composer, and it needs no model."
            requirement="Type an intent above, or pick an example, to see the deterministic reading."
          />
        )}
      </div>

      <div className="bo-genesis__right">
        <span className="bo-label">KNOuX Composer — preserved</span>
        <Composer />

        <div style={{ height: 8 }} />
        <hr className="bo-rule" />
        <div style={{ height: 8 }} />

        <Section label="What this environment can actually do">
          <Chips
            ariaLabel="Available capabilities"
            options={(Object.keys(state.adapter.capabilities) as (keyof typeof state.adapter.capabilities)[])
              .filter((capability) => state.adapter.capabilities[capability] === 'available')
              .map((capability) => ({ id: capability, label: capability.toUpperCase() }))}
            value={null}
            onChange={() => {}}
          />
          <p className="bo-blocked__req">
            Everything not listed above is blocked or unconfigured on purpose, and the status rail at the foot of this
            page names the exact requirement for each one. No control in this workspace claims a capability the
            adapter does not have.
          </p>
        </Section>

        <div style={{ height: 8 }} />
        <Empty
          title="No session history"
          body="There is no stored project, no recent session and no activity to show, because none is persisted. Recording them would mean a backend that does not exist."
        />
      </div>
    </div>
  );
}
