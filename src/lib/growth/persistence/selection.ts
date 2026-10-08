import 'server-only';

/**
 * KNOuX Growth — repository selection.
 *
 * One function decides which `GrowthRepository` this request uses, from
 * environment only. There is no auto-detection and no try-the-fallback path,
 * because both of those are how a production deployment ends up serving demo
 * fixtures after a database blip without anybody noticing.
 *
 * The three outcomes:
 *
 *   'supabase' — a real store, selected by configuration
 *   'fixture'  — demo mode, selected by configuration
 *   'unavailable' — neither is configured, so reads fail explicitly
 *
 * Selecting fixtures requires saying so out loud, via
 * `KNOUX_GROWTH_DATA_SOURCE=fixture`. The default is `supabase`, and a
 * misconfigured Supabase produces `unavailable`, never fixtures.
 */

import {
  FixtureGrowthRepository,
  SupabaseGrowthRepository,
  type FixtureDataset,
  type GrowthRepository,
  type RepositoryFailure,
  type SupabaseLike,
} from './repository';

/*
 * The Supabase client is imported lazily, inside `selectRepository`, rather than
 * at module scope.
 *
 * Two reasons, one practical and one about layering. Practically: importing the
 * server client drags in `next/headers`, which cannot be resolved outside a
 * Next request context, so a module-scope import would make this file untestable
 * and make `configuredDataSource` — a pure function — unavailable outside the app.
 * In terms of layering: this module's own logic is configuration and selection;
 * it should not depend on a request-bound client to be reasoned about.
 */

export type DataSource = 'supabase' | 'fixture' | 'unavailable';

export type RepositorySelection =
  | { source: 'supabase'; repository: GrowthRepository }
  | { source: 'fixture'; repository: GrowthRepository }
  | { source: 'unavailable'; failure: RepositoryFailure; message: string };

/** Default. Absent configuration means the real store, not the demo one. */
export function configuredDataSource(env: Record<string, string | undefined> = process.env): DataSource {
  const declared = (env.KNOUX_GROWTH_DATA_SOURCE ?? '').trim().toLowerCase();
  if (declared === 'fixture' || declared === 'demo') return 'fixture';
  if (declared === 'supabase') return 'supabase';

  // No explicit choice. Supabase is configured in this repository's config
  // module with a project ref and publishable key, so the real store is the
  // honest default and fixtures require opting in.
  return 'supabase';
}

/**
 * Builds the repository for this request.
 *
 * `allowedClientIds` is the principal's bound client list. The Supabase
 * repository refuses anything outside it *in addition to* RLS, so a policy
 * mistake alone is not enough to cross a tenant boundary.
 */
export async function selectRepository(
  allowedClientIds: readonly string[],
  env: Record<string, string | undefined> = process.env,
): Promise<RepositorySelection> {
  const source = configuredDataSource(env);

  if (source === 'fixture') {
    const { buildFixtureDataset } = await import('./fixture-dataset');
    return { source: 'fixture', repository: new FixtureGrowthRepository(buildFixtureDataset()) };
  }

  if (allowedClientIds.length === 0) {
    // Not "all clients". A principal with no membership reads nothing.
    return {
      source: 'unavailable',
      failure: 'PERMISSION_MISSING',
      message: 'This principal has no bound client workspaces, so no repository can be scoped.',
    };
  }

  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    return {
      source: 'supabase',
      // The Supabase client is structurally wider than the narrow slice the
      // repository declares it needs. Narrowing at the boundary is what keeps the
      // repository testable against a hand-built double instead of a live client.
      repository: new SupabaseGrowthRepository(
        supabase as unknown as SupabaseLike,
        allowedClientIds,
      ),
    };
  } catch (error) {
    // A Supabase client that cannot be created is an unavailable store. It is
    // deliberately NOT substituted with fixtures.
    return {
      source: 'unavailable',
      failure: 'NOT_CONFIGURED',
      message: error instanceof Error
        ? `The Supabase client could not be created: ${error.message}`
        : 'The Supabase client could not be created.',
    };
  }
}

/**
 * The message shown when a configured production store cannot answer.
 *
 * Every branch says plainly that fixtures were NOT substituted. That sentence is
 * the whole point of the function: an operator reading "no data source is
 * configured" could reasonably assume the product quietly served demo records,
 * which is the failure this refusal exists to make impossible. So the message
 * states both the state and the non-substitution.
 *
 * Phrased so an operator reads it as the store problem it is, rather than as a
 * request to accept demo data.
 */
export function refusalMessage(failure: RepositoryFailure, detail?: string): string {
  switch (failure) {
    case 'SCHEMA_ABSENT':
      return 'Growth data source state: SCHEMA_ABSENT. Fixtures were not substituted. Apply the Growth migrations to this project, then retry.';
    case 'AUTH_REQUIRED':
      return 'Growth data source state: AUTH_REQUIRED. Fixtures were not substituted. Sign in again so the Growth store can verify the session.';
    case 'PERMISSION_MISSING':
      return 'Growth data source state: PERMISSION_MISSING. Fixtures were not substituted. This principal may not read that client workspace.';
    case 'NOT_CONFIGURED':
      return 'Growth data source state: NOT_CONFIGURED. Fixtures were not substituted. Set KNOUX_GROWTH_DATA_SOURCE, or explicitly select fixture mode for demo use.';
    case 'QUERY_FAILED':
      return `Growth data source state: QUERY_FAILED. Fixtures were not substituted.${detail ? ` Provider detail: ${detail}` : ''}`;
    case 'FIXTURE_FALLBACK_REFUSED':
      return 'Growth data source state: FIXTURE_FALLBACK_REFUSED. Fixtures were not substituted. A production store failed and the system declined to fall back to demo data.';
    case 'NOT_FOUND':
      return 'Growth data source state: NOT_FOUND. Fixtures were not substituted. That record does not exist in the Growth store.';
    case 'INVALID_INPUT':
      return 'Growth data source state: INVALID_INPUT. Fixtures were not substituted. The request was rejected before it reached the store.';
    default:
      return 'Growth data source state: UNAVAILABLE. Fixtures were not substituted.';
  }
}

export type { FixtureDataset };