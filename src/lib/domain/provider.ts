import 'server-only';

import type { DomainCheck } from './shared';

/**
 * The registrar boundary.
 *
 * Server-only by construction, not by convention: this module is where a
 * credential is read and an outbound registrar call is made, so importing it
 * from a client component has to fail at build time rather than leak a key into
 * a bundle.
 *
 * The result vocabulary, the normalisation rules and the money formatting all
 * live in `./shared`, which is isomorphic, because the browser's Domain Finder
 * has to render provider facts and cannot import anything marked server-only.
 *
 * A provider returns provider facts or an error. It never decides what the
 * product shows, and it never reports a network failure as a negative result —
 * that rule is the reason `DomainState` separates `unavailable` from `error`,
 * and an adapter that breaks it is a bug in the adapter.
 */
export type DomainProvider = {
  /** Stable id, used in telemetry and in the unconfigured explanation. */
  readonly id: string;
  /** Name shown to a visitor as the source of any answer. */
  readonly name: string;
/**
   * TLDs this provider is declared to carry, or empty for no claim.
   *
   * Used to decide which names may be sent upstream at all, so that an extension
   * nobody sells is reported as `unsupported` rather than being asked about and
   * answered with something that reads like "no".
   *
   * Empty means *the operator has not declared a list*, which is not the same as
   * carrying nothing. Every caller must treat it as silence, so a deployment with
   * no declared list keeps checking every candidate rather than refusing them all.
   */
  readonly supportedTlds: readonly string[];
  /** Bounded batch check. Resolves with `ok: false` on transport failure. */
  check(domains: readonly string[]): Promise<DomainCheck>;
  /**
   * Syntactic alternatives derived from the input alone.
   *
   * These are naming suggestions, not availability, and the UI labels them as
   * such wherever they are shown.
   */
  suggest(input: string): Promise<string[]>;
};

export type { DomainAvailability, DomainCheck, DomainState, Money } from './shared';
