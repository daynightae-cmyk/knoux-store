'use client';

import { useState } from 'react';
import { wordPressServices } from '@/data/wordpress';

/**
 * Build & Operate.
 *
 * The operating layer of the ecosystem, presented as a sequence rather than a
 * service list. The distinction is real: a list says "we do seven things", a
 * sequence says "this is the order they have to happen in and each one depends
 * on the one before it". A WordPress install that is hardened before it is
 * migrated is a different install from one migrated first.
 *
 * Every entry is a service KNOuX actually performs, read from the same
 * `wordPressServices` registry the rest of the division uses. There is no price
 * and no duration, because scope is agreed in conversation and inventing either
 * would be a commitment nobody has made.
 */

const PHASES = [
  {
    id: 'establish',
    code: 'OP-01',
    label: 'Establish',
    serviceIds: ['wp-svc-install', 'wp-svc-backup'],
    statement: 'A documented baseline and a restore that has been tried, before anything is changed.',
  },
  {
    id: 'move',
    code: 'OP-02',
    label: 'Move',
    serviceIds: ['wp-svc-migration'],
    statement: 'Content, URLs and behaviour carried across without loss, on a staged cutover.',
  },
  {
    id: 'steady',
    code: 'OP-03',
    label: 'Steady',
    serviceIds: ['wp-svc-maintenance', 'wp-svc-security'],
    statement: 'Patched, monitored, access-controlled, with a written incident boundary.',
  },
  {
    id: 'accelerate',
    code: 'OP-04',
    label: 'Accelerate',
    serviceIds: ['wp-svc-performance', 'wp-svc-headless'],
    statement: 'Measured removal of the work that makes it slow, and delivery moved where it belongs.',
  },
] as const;

const SERVICE_BY_ID = new Map(wordPressServices.map((service) => [service.id, service]));

export function BuildAndOperate() {
  const [active, setActive] = useState<string>(PHASES[0].id);
  const phase = PHASES.find((entry) => entry.id === active) ?? PHASES[0];
  const services = phase.serviceIds
    .map((id) => SERVICE_BY_ID.get(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));

  return (
    <div className="operate">
      <ol className="operate__phases">
        {PHASES.map((entry) => {
          const isActive = entry.id === phase.id;
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={`operate__phase ${isActive ? 'is-active' : ''}`}
                aria-pressed={isActive}
                onClick={() => setActive(entry.id)}
                onFocus={() => setActive(entry.id)}
              >
                <span className="operate__phase-code">{entry.code}</span>
                <strong className="operate__phase-label">{entry.label}</strong>
                <span className="operate__phase-statement">{entry.statement}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="operate__detail" key={phase.id} aria-live="polite">
        <span className="label label--signal">
          {phase.code} / {phase.label.toUpperCase()}
        </span>
        <ul className="operate__services">
          {services.map((service) => (
            <li key={service.id} className="operate__service">
              <span className="operate__service-code mono">{service.code}</span>
              <div>
                <h4>{service.name}</h4>
                <p>{service.summary}</p>
                <ul className="operate__activities">
                  {service.activities.map((activity) => (
                    <li key={activity}>{activity}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
        <p className="operate__note">
          Scope and sequence are agreed before work starts. KNOuX publishes no duration and no price for these
          services, because both depend on the state of the install being worked on.
        </p>
      </div>
    </div>
  );
}
