'use client';

import { useState } from 'react';
import { wordPressServices } from '@/data/wordpress';

/**
 * KNOuX Infrastructure Rack.
 *
 * This is a rack, not a pricing table, and the distinction is load-bearing.
 * A pricing table has one shape — name, three numbers, a button — and a rack
 * has layers that respond to a selection. So a plan or a service is a
 * *position* in a stack, and choosing one reveals what KNOuX actually does
 * around it.
 *
 * The honesty rule is absolute here, and it is why there is no price anywhere
 * in this component. No provider plan, CPU figure, RAM figure, storage figure,
 * uptime promise, discount or renewal rate has been established by any source
 * this project can read, so none is displayed. The rack shows what is real:
 *
 *   - four infrastructure journeys, which are UX categories for grouping, not
 *     purchasable products
 *   - the seven KNOuX operating services that actually perform the work
 *   - the boundary of what KNOuX does versus what an infrastructure provider
 *     does, stated plainly
 *
 * The one place a number would normally go — a monthly price — says "no
 * commerce provider is connected" instead. A section that refuses to invent its
 * numbers is more credible than one that fills them in, and the difference is
 * the product.
 */

const JOURNEYS = [
  {
    id: 'start',
    code: 'RACK-01',
    label: 'WordPress Start',
    statement: 'A working WordPress environment for a site that does not exist yet.',
    services: ['wp-svc-install', 'wp-svc-security', 'wp-svc-backup'],
  },
  {
    id: 'business',
    code: 'RACK-02',
    label: 'Business',
    statement: 'An install carrying real editorial load, real roles and real traffic.',
    services: ['wp-svc-install', 'wp-svc-maintenance', 'wp-svc-performance'],
  },
  {
    id: 'commerce',
    code: 'RACK-03',
    label: 'Commerce',
    statement: 'A store with a deliberate catalogue model and measured checkout behaviour.',
    services: ['wp-svc-install', 'wp-svc-performance', 'wp-svc-security'],
  },
  {
    id: 'managed',
    code: 'RACK-04',
    label: 'Managed KNOuX',
    statement: 'Ongoing ownership: monitoring, recovery and a named person for each change.',
    services: ['wp-svc-maintenance', 'wp-svc-backup', 'wp-svc-headless'],
  },
] as const;

const SERVICE_BY_ID = new Map(wordPressServices.map((service) => [service.id, service]));

export function HostingRack() {
  const [active, setActive] = useState<string>(JOURNEYS[3].id);
  const journey = JOURNEYS.find((entry) => entry.id === active) ?? JOURNEYS[0];
  const services = journey.services
    .map((id) => SERVICE_BY_ID.get(id))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));

  return (
    <div className="rack" data-journey={journey.id}>
      <div className="rack__shell" role="group" aria-label="Infrastructure journeys">
        <div className="rack__spine">
          <span className="rack__spine-label">KNOuX INFRASTRUCTURE RACK</span>
          <span className="rack__spine-meta">
            <span>4 JOURNEYS</span>
            <span>{wordPressServices.length} SERVICES</span>
          </span>
        </div>

        <ul className="rack__slots">
          {JOURNEYS.map((entry) => {
            const isActive = entry.id === journey.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`rack__slot ${isActive ? 'is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setActive(entry.id)}
                  onFocus={() => setActive(entry.id)}
                >
                  <span className="rack__slot-code">{entry.code}</span>
                  <strong className="rack__slot-label">{entry.label}</strong>
                  <span className="rack__slot-state">{isActive ? 'SELECTED' : 'SELECT'}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="rack__readout" key={journey.id}>
          <span className="label label--signal">
            {journey.code} / {journey.label.toUpperCase()}
          </span>
          <h3 className="rack__readout-title">{journey.statement}</h3>

          <ul className="rack__services">
            {services.map((service) => (
              <li key={service.id} className="rack__service">
                <span className="rack__service-code mono">{service.code}</span>
                <div>
                  <strong>{service.name}</strong>
                  <p>{service.summary}</p>
                  <span className="rack__service-activities mono">{service.activities.join(' / ')}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/*
        The commercial column, present and empty on purpose. This is where plan
        names, verified resources, prices, billing periods and renewal terms
        would appear if a commerce provider were connected. Showing the column
        with its absence stated is more useful than hiding it, because it tells
        a visitor exactly what is missing rather than implying KNOuX has no
        infrastructure offer at all.
      */}
      <div className="rack__commercial">
        <div className="rack__commercial-head">
          <span className="label label--signal">COMMERCE PROVIDER</span>
          <span className="mark mark--planned">NOT CONFIGURED</span>
        </div>
        <div className="rack__commercial-empty">
          <p className="rack__commercial-title">No hosting commerce provider is connected to this deployment.</p>
          <p>
            Verified plan names, resource limits, prices, billing periods and renewal terms appear in this column when a
            provider supplies them. None are published here, because no source for them has been configured and an
            invented specification is a specification a customer could plan around.
          </p>
        </div>
        <div className="rack__commercial-actions">
          <a className="action action--primary" href="/contact?intent=infrastructure">
            Discuss infrastructure
          </a>
          <a className="action" href="/contact">
            Contact KNOuX
          </a>
        </div>
      </div>

      <dl className="rack__boundary">
        <div>
          <dt>KNOuX performs</dt>
          <dd>
            Installation, configuration, migration, maintenance, performance work, security hardening, backup and
            recovery, and headless delivery.
          </dd>
        </div>
        <div>
          <dt>An infrastructure provider supplies</dt>
          <dd>
            The server, the network, the uptime commitment and the billing relationship. KNOuX does not resell
            hardware and does not restate a provider&rsquo;s specifications as its own.
          </dd>
        </div>
      </dl>
    </div>
  );
}
