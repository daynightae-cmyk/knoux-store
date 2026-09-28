'use client';

import { useMemo, useState } from 'react';
import {
  bandForAmount,
  budgetBands,
  growthModules,
  growthObjectives,
  growthReaches,
  growthTargets,
  type GrowthChannelSlug,
} from '@/data/growth';
import { track } from '@/lib/analytics';

/**
 * Growth entry flow.
 *
 * Three questions in order: what is being grown, what does success look like,
 * and where should the audience be reached. Each answer narrows the set of real
 * service modules. Nothing here promises a result.
 */

const CURRENCIES = [
  { code: 'AED', label: 'AED' },
  { code: 'USD', label: 'USD' },
  { code: 'SAR', label: 'SAR' },
  { code: 'EGP', label: 'EGP' },
];

export function GrowthFlow() {
  const [target, setTarget] = useState<string>('');
  const [objective, setObjective] = useState<string>('');
  const [reaches, setReaches] = useState<string[]>([]);

  const modules = useMemo(() => {
    if (!target && !objective && reaches.length === 0) return [];
    const channels = new Set<GrowthChannelSlug>();
    if (target) {
      const entry = growthTargets.find((item) => item.id === target);
      entry?.defaultChannelSlugs.forEach((slug) => channels.add(slug));
    }
    reaches.forEach((id) => {
      const entry = growthReaches.find((item) => item.id === id);
      if (entry?.channelSlug) channels.add(entry.channelSlug);
    });
    if (channels.size === 0) channels.add('google-ads');

    const ids = new Set<string>();
    for (const slug of channels) {
      for (const candidate of growthModules) {
        if (candidate.channelSlugs.includes(slug)) ids.add(candidate.id);
      }
    }
    // Measurement and strategy are prerequisites for any paid channel.
    if (channels.size > 0) {
      ids.add('growth-campaign-strategy');
      ids.add('growth-conversion-tracking');
    }
    const objectiveEntry = growthObjectives.find((item) => item.id === objective);
    if (objectiveEntry?.capabilityIds.includes('creative-campaign') || objectiveEntry?.capabilityIds.includes('creative-brand-identity')) {
      ids.add('growth-creative-preparation');
    }
    return [...ids];
  }, [target, objective, reaches]);

  const step = target ? (objective ? 3 : 2) : 1;

  return (
    <div className="goal-flow" id="flow">
      <fieldset className="goal-step" style={{ border: 0, padding: '30px 0', margin: 0 }}>
        <legend className="goal-step__label" style={{ padding: 0 }}>
          <span>STEP 01</span>
          What do you want
          <br />
          to grow?
        </legend>
        <div>
          <p className="goal-step__prompt">Start from what exists.</p>
          <div className="option-grid" role="group" aria-label="What do you want to grow?">
            {growthTargets.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="option"
                aria-pressed={target === entry.id}
                onClick={() => {
                  setTarget(target === entry.id ? '' : entry.id);
                  track({ type: 'composer_started', preset: `growth-target-${entry.id}` });
                }}
              >
                <span className="option__title">{entry.label}</span>
                <span className="option__sub">{entry.statement}</span>
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="goal-step" style={{ border: 0, padding: '30px 0', margin: 0 }} disabled={!target}>
        <legend className="goal-step__label" style={{ padding: 0 }}>
          <span>STEP 02</span>
          What is your
          <br />
          objective?
        </legend>
        <div>
          <p className="goal-step__prompt">Define success before spending on it.</p>
          <div className="option-grid" role="group" aria-label="What is your objective?">
            {growthObjectives.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="option"
                aria-pressed={objective === entry.id}
                onClick={() => setObjective(objective === entry.id ? '' : entry.id)}
              >
                <span className="option__title">{entry.label}</span>
                <span className="option__sub">{entry.statement}</span>
              </button>
            ))}
          </div>
          {objective ? (
            <div style={{ marginTop: 22, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
              <span className="label">MEASURED BY</span>
              <ul className="fact-list" style={{ marginTop: 14, gap: 8 }}>
                {growthObjectives
                  .find((entry) => entry.id === objective)
                  ?.measuredBy.map((measure) => (
                    <li key={measure}>{measure}</li>
                  ))}
              </ul>
              <p className="meta-row" style={{ marginTop: 16 }}>
                <span>These are the measures that would be read. No target is set on this page.</span>
              </p>
            </div>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="goal-step" style={{ border: 0, padding: '30px 0', margin: 0 }} disabled={!objective}>
        <legend className="goal-step__label" style={{ padding: 0 }}>
          <span>STEP 03</span>
          Where should we
          <br />
          reach people?
        </legend>
        <div>
          <p className="goal-step__prompt">Only channels KNOuX actually works in.</p>
          <div className="option-grid" role="group" aria-label="Where should we reach people?">
            {growthReaches.map((entry) => {
              const selected = reaches.includes(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  className="option"
                  aria-pressed={selected}
                  onClick={() =>
                    setReaches(selected ? reaches.filter((id) => id !== entry.id) : [...reaches, entry.id])
                  }
                >
                  <span className="option__title">{entry.label}</span>
                  <span className="option__sub">{entry.note}</span>
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      {modules.length > 0 ? (
        <div className="goal-step" style={{ borderBottom: 0 }}>
          <div className="goal-step__label">
            <span>RESULT</span>
            Modules in
            <br />
            scope
          </div>
          <div>
            <p className="goal-step__prompt">
              {modules.length} service module{modules.length === 1 ? '' : 's'} follow from those answers.
            </p>
            <div className="registry">
              {modules.map((id) => {
                const row = growthModules.find((candidate) => candidate.id === id);
                if (!row) return null;
                return (
                  <div key={id} className="registry-row" style={{ gridTemplateColumns: '40px minmax(0,1fr) 90px 20px' }}>
                    <span className="registry-row__id">{row.code}</span>
                    <span className="registry-row__name">
                      {row.name}
                      <small>{row.statement}</small>
                    </span>
                    <span className="registry-row__compat">{row.setup ? 'SETUP' : 'ONGOING'}</span>
                    <span className="registry-row__arrow" aria-hidden="true">
                      ·
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
              <a className="action" href="/contact?requestType=growth&target=growth">
                Send this as an enquiry
                <span className="action-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
              <a className="action" href="/build">Compose the full stack</a>
            </div>
            <p className="meta-row" style={{ marginTop: 20 }}>
              <span>Step {step} of 3</span>
              <span>No cost, forecast or result is produced from these answers</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Campaign budget input.
 *
 * The figure scopes a project and travels with the enquiry. It never produces
 * a projection, a benchmark or a recommendation of where the money should go.
 */
export function BudgetScope() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [kind, setKind] = useState<'media' | 'project'>('media');

  const parsed = Number(amount.replace(/[^0-9.]/g, ''));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const band = valid ? bandForAmount(parsed, kind === 'project' ? 'project' : currency) : null;

  return (
    <div className="budget" id="budget">
      <div>
        <span className="label label--signal">CAMPAIGN BUDGET</span>
        <h3>A figure changes the conversation, not the promise.</h3>
        <p>
          Entering an intended budget tells KNOuX how much scope a project has to work with. It is used to
          understand what can be configured properly and to carry the figure into the enquiry. It is not used to
          produce a forecast, a benchmark, a cost-per-result estimate or a return projection, and no such
          projection appears anywhere on this site.
        </p>
        <div className="budget__field">
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            aria-label="Budget currency"
          >
            {CURRENCIES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.label}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0"
            aria-label="Intended budget amount"
            aria-describedby="budget-scope"
          />
        </div>
        <div className="checkbox-grid" style={{ marginTop: 16 }}>
          <label className="checkbox">
            <input type="radio" name="budget-kind" checked={kind === 'media'} onChange={() => setKind('media')} />
            Media / ad spend
          </label>
          <label className="checkbox">
            <input type="radio" name="budget-kind" checked={kind === 'project'} onChange={() => setKind('project')} />
            Project build cost
          </label>
        </div>
      </div>

      <div className="budget__result" id="budget-scope">
        {band ? (
          <>
            <dl style={{ margin: 0 }}>
              <dt>Scope band</dt>
              <dd>{band.label}</dd>
              <dt>What it implies</dt>
              <dd>{band.description}</dd>
            </dl>
            <p className="budget__caveat">
              This band describes the shape of the work, not a recommendation. KNOuX will not tell you what return
              a figure should produce, and a figure alone does not establish a feasible plan.
            </p>
            <a
              className="action"
              style={{ marginTop: 18 }}
              href={`/contact?requestType=growth&budget=${encodeURIComponent(`${amount} ${currency === 'AED' && kind === 'project' ? 'project' : currency}`)}`}
              onClick={() => track({ type: 'budget_stated', currency, band: band.id })}
            >
              Continue with this figure
              <span className="action-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Enter a figure to see the scope band it implies. A figure is optional: an enquiry without one is
              still a valid starting point.
            </p>
            <dl style={{ marginTop: 20, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              {budgetBands.slice(1, 5).map((entry) => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <dt style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--dim)' }}>{entry.label}</dt>
                  <dd style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textAlign: 'right', maxWidth: '58%' }}>
                    {entry.description}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </div>
  );
}
