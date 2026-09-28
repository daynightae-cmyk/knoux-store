'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { track } from '@/lib/analytics';
import { solutions } from '@/data/solutions';
import { webSystems } from '@/data/services';
import { creativeDisciplines } from '@/data/services';
import { growthChannelsDetail } from '@/data/growth';
import { softwareProducts } from '@/data/software';

/**
 * Unified request engine.
 *
 * One form for every division. The request type and the fields shown follow the
 * entry context, so a visitor arriving from a WordPress goal is not asked about
 * campaign budget and a visitor arriving from a Composer stack is not asked to
 * describe their brand from scratch.
 *
 * The form never claims delivery without a configured service. When no
 * transport is configured it says so and points at the direct address.
 */

export type RequestType = 'software' | 'wordpress' | 'web' | 'growth' | 'creative' | 'solution' | 'custom';

const REQUEST_TYPES: { id: RequestType; label: string; blurb: string }[] = [
  { id: 'software', label: 'Software', blurb: 'A KNOuX desktop system, its access, or custom implementation of one.' },
  { id: 'wordpress', label: 'WordPress', blurb: 'Install, migration, maintenance, performance, security or backup.' },
  { id: 'web', label: 'Web', blurb: 'A site, store, application, portal, dashboard or interactive build.' },
  { id: 'growth', label: 'Growth', blurb: 'Campaign structure, measurement, content or discoverability.' },
  { id: 'creative', label: 'Creative', blurb: 'Identity, interface, art direction, motion or campaign assets.' },
  { id: 'solution', label: 'Solution', blurb: 'Several divisions combined for one outcome.' },
  { id: 'custom', label: 'Something else', blurb: 'Anything that does not fit the categories above.' },
];

const TIMELINES = [
  { id: 'unknown', label: 'Not decided yet' },
  { id: 'urgent', label: 'Urgent — something is broken' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'year', label: 'This year' },
  { id: 'exploring', label: 'Exploring, no date in mind' },
];

const BUDGET_BANDS = [
  { id: 'unstated', label: 'Not decided' },
  { id: 'under-5k', label: 'Under 5,000' },
  { id: '5k-15k', label: '5,000 – 15,000' },
  { id: '15k-50k', label: '15,000 – 50,000' },
  { id: 'over-50k', label: 'Over 50,000' },
];

const CONTACT_EMAIL = 'knouxio@zohomail.com';

/**
 * Entry context is read from the URL once, on first render. Deriving initial
 * state from the query string keeps the form deep-linkable without an effect
 * that would flash the wrong fields.
 */
function readEntryContext(params: URLSearchParams | null) {
  const empty: EntryContext = {
    type: null,
    items: [],
    channels: [],
    sourceInput: null,
  };
  if (!params) return empty;

  const items: string[] = [];
  const push = (value: string | null) => {
    if (value && !items.includes(value)) items.push(value);
  };

  push(params.get('items'));
  const system = webSystems.find((entry) => entry.slug === params.get('system'));
  if (system) push(system.title);
  const discipline = creativeDisciplines.find((entry) => entry.slug === params.get('discipline'));
  if (discipline) push(discipline.title);
  const solution = solutions.find((entry) => entry.slug === params.get('solution'));
  if (solution) push(solution.title);
  const target = params.get('target');
  if (target) push(target.replace('growth-', 'Growth: '));
  const budget = params.get('budget');
  if (budget) push(`Budget stated: ${budget}`);

  const requested = params.get('requestType');
  const valid = REQUEST_TYPES.some((entry) => entry.id === requested) ? (requested as RequestType) : null;

  return {
    type: valid,
    items,
    channels: [],
    sourceInput: params.get('input'),
  } satisfies EntryContext;
}

type EntryContext = {
  type: RequestType | null;
  items: string[];
  channels: string[];
  sourceInput: string | null;
};

export function RequestForm() {
  const router = useRouter();
  const params = useSearchParams();
  const context = useMemo(() => readEntryContext(params), [params]);

  const [type, setType] = useState<RequestType>(context.type ?? 'web');
  const [items, setItems] = useState<string[]>(context.items);
  const [channels, setChannels] = useState<string[]>(context.channels);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'unconfigured'>('idle');
  const [message, setMessage] = useState('');

  const entryRequestType = context.type;
  const entryInput = context.sourceInput;

  useEffect(() => {
    track({ type: 'request_started', requestType: entryRequestType ?? 'direct', entryRoute: '/contact' });
  }, [entryRequestType]);

  const options = useMemo(() => {
    switch (type) {
      case 'software':
        return softwareProducts.map((product) => product.name);
      case 'wordpress':
        return ['Install & configuration', 'Migration', 'Maintenance', 'Performance', 'Security', 'Backup & recovery', 'Headless delivery'];
      case 'web':
        return webSystems.map((system) => system.title);
      case 'growth':
        return growthChannelsDetail.map((channel) => channel.name);
      case 'creative':
        return creativeDisciplines.map((discipline) => discipline.title);
      case 'solution':
        return solutions.map((solution) => solution.title);
      default:
        return [];
    }
  }, [type]);

  const showBudget = type === 'growth' || type === 'web' || type === 'wordpress' || type === 'solution';
  const showChannels = type === 'growth' || type === 'solution' || type === 'creative';
  const showSoftware = type === 'software';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    setStatus('sending');
    setMessage('');

    const payload = {
      name: data.get('name'),
      email: data.get('email'),
      organisation: data.get('organisation'),
      message: data.get('message'),
      website: data.get('website'),
      requestType: type,
      selectedItems: items,
      preferredChannels: channels,
      budgetBand: showBudget ? data.get('budgetBand') : null,
      timeline: data.get('timeline'),
      sourceInput: entryInput,
      entryRoute: '/contact',
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.status === 503) {
        setStatus('unconfigured');
        setMessage('No request intake is configured on this deployment. Use the address below instead.');
        return;
      }
      const receipt = await response.json() as { stored?: boolean; delivered?: boolean };
      if (!response.ok && response.status !== 202) throw new Error('The request could not be received.');
      if (receipt.delivered === true) {
        setStatus('sent');
        setMessage('Request delivered.');
        track({ type: 'request_submitted', requestType: type, itemCount: items.length, delivered: true });
        form.reset();
        return;
      }
      if (receipt.stored === true) {
        setStatus('sent');
        setMessage('Request received securely.');
        track({ type: 'request_submitted', requestType: type, itemCount: items.length, delivered: false });
        form.reset();
        return;
      }
      throw new Error('The request could not be received.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'The request could not be delivered.');
      track({ type: 'request_submitted', requestType: type, itemCount: items.length, delivered: false });
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 14 }}>
          WHAT IS THIS ABOUT
        </legend>
        <div className="option-grid">
          {REQUEST_TYPES.map((entry) => (
            <label key={entry.id} className="checkbox" style={{ textTransform: 'none', letterSpacing: 0 }}>
              <input
                type="radio"
                name="requestType"
                value={entry.id}
                checked={type === entry.id}
                onChange={() => {
                  setType(entry.id);
                  setItems([]);
                  setChannels([]);
                }}
              />
              {entry.label}
            </label>
          ))}
        </div>
        <p className="field__hint" style={{ marginTop: 12 }}>
          {REQUEST_TYPES.find((entry) => entry.id === type)?.blurb}
        </p>
      </fieldset>

      {options.length > 0 ? (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ marginBottom: 14 }}>
            RELEVANT TO THIS REQUEST
          </legend>
          <div className="checkbox-grid">
            {options.map((option) => (
              <label key={option} className="checkbox" style={{ textTransform: 'none', letterSpacing: 0 }}>
                <input
                  type="checkbox"
                  checked={items.includes(option)}
                  onChange={() =>
                    setItems((current) =>
                      current.includes(option) ? current.filter((entry) => entry !== option) : [...current, option],
                    )
                  }
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {showChannels ? (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ marginBottom: 14 }}>
            PREFERRED CHANNELS
          </legend>
          <div className="checkbox-grid">
            {['Google Search', 'YouTube', 'Instagram', 'Facebook', 'TikTok', 'Organic search', 'Not decided'].map((channel) => (
              <label key={channel} className="checkbox" style={{ textTransform: 'none', letterSpacing: 0 }}>
                <input
                  type="checkbox"
                  checked={channels.includes(channel)}
                  onChange={() =>
                    setChannels((current) =>
                      current.includes(channel) ? current.filter((entry) => entry !== channel) : [...current, channel],
                    )
                  }
                />
                {channel}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {showSoftware ? (
        <p className="field__hint">
          KNOuX software is published as source. Access, packaging and custom implementation are discussed here
          rather than purchased from this page; no payment infrastructure exists on this site.
        </p>
      ) : null}

      {showBudget ? (
        <div className="field">
          <label htmlFor="budgetBand">Budget band, if you have one</label>
          <select id="budgetBand" name="budgetBand" defaultValue="unstated">
            {BUDGET_BANDS.map((band) => (
              <option key={band.id} value={band.id}>
                {band.label}
              </option>
            ))}
          </select>
          <span className="field__hint">
            Used to understand scope. It is not a quote and it is not used to produce a forecast or a return
            projection.
          </span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="timeline">Timing</label>
        <select id="timeline" name="timeline" defaultValue="unknown">
          {TIMELINES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Name" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="organisation">Organisation, if any</label>
        <input id="organisation" name="organisation" maxLength={160} autoComplete="organization" placeholder="Optional" />
      </div>

      <div className="field">
        <label htmlFor="message">The situation</label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          placeholder="What exists now, what is not working, and what a good outcome looks like."
        />
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="action action--primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending' : 'Send request'}
          <span className="action-arrow" aria-hidden="true">
            ↗
          </span>
        </button>
        <span className="field__hint">
          Or email <a href={`mailto:${CONTACT_EMAIL}`} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{CONTACT_EMAIL}</a>
        </span>
      </div>

      <p className={`form-status form-status--${status}`} role="status" aria-live="polite">
        {message}
      </p>

      <p className="field__hint">
        This form only reports success after the request is durably received or externally delivered.
        If intake is unavailable, use the address above instead.
        <button type="button" className="action action--ghost" style={{ fontSize: 9 }} onClick={() => router.push('/build')}>
          Or assemble a stack first
          <span className="action-arrow" aria-hidden="true">
            ↗
          </span>
        </button>
      </p>
    </form>
  );
}
