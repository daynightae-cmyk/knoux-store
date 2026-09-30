# KNOuX Domain + Hosting Provider Architecture

## Current repository reality

A repository search found no configured live registrar or hosting commerce provider.
Do not fabricate one.

The existing WordPress division already has real WordPress.org marketplace adapters.
Domain and hosting must be added as separate provider-backed layers.

## Domain search contract

Build a provider-neutral server-side interface.

Suggested normalized result:
- domain
- available | unavailable | unsupported | unknown
- premium?
- registrationPrice?
- renewalPrice?
- currency?
- provider
- checkedAt
- reason?

Never expose registrar secrets to the browser.

## Verified provider options

### Cloudflare Registrar API
Official docs:
https://developers.cloudflare.com/registrar/registrar-api/
https://developers.cloudflare.com/api/resources/registrar/methods/check/

Current official API supports:
- domain search
- real-time authoritative availability checks
- pricing
- registration workflows

Search is discovery.
The authoritative Check endpoint must be used before any registration claim/action.

### Namecheap API
Official docs:
https://www.namecheap.com/support/api/methods/domains/check/

Provides domain availability checks and premium pricing fields.

### WHMCS
Official docs:
https://developers.whmcs.com/domain-registrars/availability-checks
https://developers.whmcs.com/api

Supports registrar modules with availability checks and domain suggestions.
Useful when KNOuX adopts a reseller/hosting commerce backend.

## Provider selection rule

Do NOT hardwire a provider without credentials/decision.

Create an adapter boundary such as:
DomainProvider
HostingProvider

Provider selection comes from server configuration/env.

If none is configured:
- domain UI still renders
- input validation works
- suggestions may be purely syntactic only if clearly labeled
- availability and price are NOT claimed
- show a truthful provider-unconfigured state
- offer contact/request action

## Hosting contract

Do not fabricate hosting packages, CPU/RAM/storage allocations, uptime, prices, renewal rates, or discounts.

Support two truthful modes:

A) CONFIGURED COMMERCE PROVIDER
Real plans/prices loaded from an approved provider/WHMCS/source.

B) KNOuX SERVICE MODE
Describe real engineering/managed-hosting assistance without fake plan specifications or prices.

Existing WordPress services can support truthful service-mode copy:
- Install & Configuration
- Migration
- Maintenance
- Performance
- Security
- Backup & Recovery
- Headless & Decoupled

## Security

- provider keys server-side only
- bounded queries
- input normalization
- IDN/punycode policy explicitly handled
- rate limiting where appropriate
- caching only where provider semantics allow
- authoritative re-check immediately before registration/purchase
- no client-visible raw credentials
- no logging secrets

## UX states

Domain search must visibly distinguish:
SEARCHING
AVAILABLE
UNAVAILABLE
PREMIUM
UNSUPPORTED
PROVIDER UNCONFIGURED
UPSTREAM ERROR

Never turn network failure into "unavailable".
