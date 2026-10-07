import 'server-only';

/**
 * KNOuX Growth — persistence repository.
 *
 * Phase 1 read its dataset from `currentSnapshot()`, which returned fixtures. This
 * replaces that with an interface and two implementations, so the choice of
 * storage is an explicit decision rather than an accident of what happens to be
 * importable.
 *
 * The rule that shapes the whole module: **there is no silent fallback.** If the
 * configured repository cannot answer, the caller receives an explicit failure.
 * A production deployment whose database is unreachable must surface that, not
 * quietly start serving demo fixtures — which is precisely how fixture data
 * becomes production data.
 *
 * Every read result therefore carries its origin. A `DEMO` record is a fixture
 * and must never be presented as a client fact; a `LIVE` record names the store
 * it came from.
 */

import type { DataOrigin } from '../states';
import { redactSecrets } from '../../security/redact';

/* ------------------------------------------------------------- provenance */

/**
 * Where a record came from.
 *
 * `SUPABASE` and `FIXTURE` are the two origins a workspace can hold. They are
 * deliberately not collapsed into a boolean: a caller that wants to forbid
 * fixtures needs to be able to say which one it is refusing.
 */
export type StorageOrigin = DataOrigin;

export type RecordMeta = {
  origin: StorageOrigin;
  /** Which implementation produced this. 'supabase' | 'fixture' */
  store: string;
  /** True when the value came from a real stored row rather than a constant. */
  stored: boolean;
};

export type Stored<T> = {
  value: T;
  meta: RecordMeta;
};

/* -------------------------------------------------------------- failures */

/**
 * Why a repository could not answer.
 *
 * `FIXTURE_FALLBACK_REFUSED` is the one that matters most: it records that a
 * production repository failed and the system declined to substitute fixtures.
 * That is the moment a demo number would otherwise become a client number, and
 * having it as a first-class state means the refusal is visible rather than
 * silent.
 */
export type RepositoryFailure =
  | 'NOT_CONFIGURED'
  | 'AUTH_REQUIRED'
  | 'PERMISSION_MISSING'
  | 'QUERY_FAILED'
  | 'SCHEMA_ABSENT'
  | 'FIXTURE_FALLBACK_REFUSED'
  | 'NOT_FOUND'
  | 'INVALID_INPUT';

export type RepositoryResult<T> =
  | { ok: true; data: Stored<T> }
  | {
      ok: false;
      failure: RepositoryFailure;
      message: string;
      /** Verbatim provider message, preserved rather than rewritten. */
      detail?: string;
    };

function failed<T>(
  failure: RepositoryFailure,
  message: string,
  detail?: string,
): RepositoryResult<T> {
  return { ok: false, failure, message, ...(detail ? { detail } : {}) };
}

/**
 * Classifies a Supabase error into a repository failure.
 *
 * A missing relation is `SCHEMA_ABSENT` rather than `QUERY_FAILED`, because the
 * remediation is completely different: the first needs a migration applied, the
 * second needs an operator to look at a log.
 */
function classifyPostgrestError(error: { code?: string; message: string }): RepositoryFailure {
  if (error.code === 'PGRST205' || /relation .* does not exist/i.test(error.message)) {
    return 'SCHEMA_ABSENT';
  }
  if (error.code === '42501' || /row-level security|permission denied/i.test(error.message)) {
    return 'PERMISSION_MISSING';
  }
  if (error.code === 'PGRST301' || /JWT|claim/i.test(error.message)) {
    return 'AUTH_REQUIRED';
  }
  return 'QUERY_FAILED';
}

/* --------------------------------------------------------------- contract */

/** Minimal surface the Command Center needs. Kept narrow on purpose. */
export interface GrowthRepository {
  readonly id: string;
  /** Whether this repository holds real stored data. */
  readonly holdsLiveData: boolean;

  /** Which clients this caller may see. Scoped in SQL, never filtered after. */
  listClientIds(): Promise<RepositoryResult<string[]>>;
  getClient(clientId: string): Promise<RepositoryResult<Record<string, unknown>>>;

  listCampaigns(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>>;
  getCampaign(campaignId: string): Promise<RepositoryResult<Record<string, unknown>>>;

  listCommunities(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>>;
  listLeads(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>>;
  listConnections(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>>;
  listMetrics(clientId: string, window: MetricWindow): Promise<RepositoryResult<MetricRow[]>>;
  listAudit(clientId: string, limit: number): Promise<RepositoryResult<Record<string, unknown>[]>>;

  /**
   * Appends an audit entry.
   *
   * Separate from the reads because it is the only write in the interface this
   * phase, and because a write failing must not be swallowed: an unaudited
   * sensitive action is a defect, not a degraded mode.
   */
  appendAudit(entry: AuditWrite): Promise<RepositoryResult<null>>;
}

export type MetricWindow = {
  periodStart: string;
  periodEnd: string;
};

export type MetricRow = {
  channel: string;
  campaignId?: string;
  metricKey: string;
  value: number;
  currency?: string;
  origin: StorageOrigin;
  evidence?: string;
};

export type AuditWrite = {
  clientId: string;
  actorId?: string;
  actorLabel: string;
  action: string;
  subjectType: string;
  subjectId: string;
  detail?: string;
};

/* ------------------------------------------------------ fixture repository */

/**
 * The Phase 1 dataset, behind the repository contract.
 *
 * Kept because demo mode is genuinely useful for design review and for tests,
 * and because deleting it would leave no way to exercise the UI without
 * credentials. It is only ever selected deliberately, and every value it returns
 * carries `origin: 'FIXTURE'` and `stored: false`.
 */
export class FixtureGrowthRepository implements GrowthRepository {
  readonly id = 'fixture';
  readonly holdsLiveData = false;

  private readonly meta: RecordMeta;

  /*
   * An explicit field rather than a TypeScript parameter property
   * (`constructor(private readonly data: …)`). This repository's tests are
   * executed by Node's type-stripping loader, which does not support parameter
   * properties — they are erased along with their types, so the field would be
   * missing at runtime and the constructor would silently leave `data`
   * undefined. Explicit fields work under the bundler and under the test runner.
   */
  private readonly data: FixtureDataset;

  constructor(data: FixtureDataset) {
    this.data = data;
    this.meta = { origin: 'FIXTURE', store: 'fixture', stored: false };
  }

  private ok<T>(value: T): RepositoryResult<T> {
    return { ok: true, data: { value, meta: this.meta } };
  }

  async listClientIds(): Promise<RepositoryResult<string[]>> {
    return this.ok(this.data.clientIds);
  }

  async getClient(clientId: string): Promise<RepositoryResult<Record<string, unknown>>> {
    const row = this.data.clients[clientId];
    if (!row) return failed('NOT_FOUND', `No demo client ${clientId}.`);
    return this.ok(row);
  }

  async listCampaigns(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    return this.ok((this.data.campaigns[clientId] ?? []) as Record<string, unknown>[]);
  }

  async getCampaign(campaignId: string): Promise<RepositoryResult<Record<string, unknown>>> {
    const row = this.data.campaignsById[campaignId];
    if (!row) return failed('NOT_FOUND', `No demo campaign ${campaignId}.`);
    return this.ok(row);
  }

  async listCommunities(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    return this.ok((this.data.communities[clientId] ?? []) as Record<string, unknown>[]);
  }

  async listLeads(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    return this.ok((this.data.leads[clientId] ?? []) as Record<string, unknown>[]);
  }

  async listConnections(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    return this.ok((this.data.connections[clientId] ?? []) as Record<string, unknown>[]);
  }

  async listMetrics(clientId: string, window: MetricWindow): Promise<RepositoryResult<MetricRow[]>> {
    const rows = (this.data.metrics[clientId] ?? []).filter(
      (row) => row.periodStart <= window.periodEnd && row.periodEnd >= window.periodStart,
    );
    return this.ok(rows.map((row) => ({ ...row, origin: 'FIXTURE' as const })));
  }

  async listAudit(clientId: string, limit: number): Promise<RepositoryResult<Record<string, unknown>[]>> {
    return this.ok((this.data.audit[clientId] ?? []).slice(0, limit));
  }

  async appendAudit(entry: AuditWrite): Promise<RepositoryResult<null>> {
    // The fixture store does not persist. Reporting the write as accepted would
    // be a false claim, so it reports that nothing was stored while still
    // validating the call, which is what makes it useful in tests.
    if (!entry.clientId || !entry.action) {
      return failed('INVALID_INPUT', 'An audit entry needs a client and an action.');
    }
    return this.ok(null);
  }
}

export type FixtureDataset = {
  clientIds: string[];
  clients: Record<string, Record<string, unknown>>;
  campaigns: Record<string, Record<string, unknown>[]>;
  campaignsById: Record<string, Record<string, unknown>>;
  communities: Record<string, Record<string, unknown>[]>;
  leads: Record<string, Record<string, unknown>[]>;
  connections: Record<string, Record<string, unknown>[]>;
  metrics: Record<string, (MetricRow & { periodStart: string; periodEnd: string })[]>;
  audit: Record<string, Record<string, unknown>[]>;
};

/* ---------------------------------------------------- supabase repository */

/** The narrow slice of the Supabase client this module uses. */
/**
 * The narrow slice of the Supabase client this module uses.
 *
 * `QueryBuilderLike` is thenable because a PostgREST builder resolves when it is
 * awaited, and modelling that directly means the repository never calls an
 * await itself — the whole query is one expression, which is how it reads in
 * supabase-js and how it must read here.
 */
type QueryBuilderLike = PromiseLike<QueryResult> & {
  select: (columns?: string) => QueryBuilderLike;
  eq: (column: string, value: unknown) => QueryBuilderLike;
  in: (column: string, values: readonly unknown[]) => QueryBuilderLike;
  gte: (column: string, value: unknown) => QueryBuilderLike;
  lte: (column: string, value: unknown) => QueryBuilderLike;
  order: (column: string, opts?: { ascending?: boolean }) => QueryBuilderLike;
  limit: (count: number) => QueryBuilderLike;
};

type TableLike = {
  select: (columns?: string) => QueryBuilderLike;
  insert: (values: unknown) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
};

/** What every Supabase query resolves to once awaited. */
type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

export type SupabaseLike = {
  from: (table: string) => TableLike;
};

const T = {
  clients: 'knoux_growth_clients',
  memberships: 'knoux_growth_memberships',
  campaigns: 'knoux_growth_campaigns',
  channels: 'knoux_growth_campaign_channels',
  communities: 'knoux_growth_communities',
  leads: 'knoux_growth_leads',
  connections: 'knoux_growth_connections',
  metrics: 'knoux_growth_metrics',
  audit: 'knoux_growth_audit_log',
} as const;

/**
 * Reads and writes through Supabase, with RLS as the tenancy boundary.
 *
 * Every method scopes its query by `client_id` in the SQL rather than fetching
 * and filtering in the application. That is not a style preference: a fetch-then-
 * filter pattern is correct only while nobody remembers to filter, and the RLS
 * policies already express the rule in a place the database enforces.
 */
export class SupabaseGrowthRepository implements GrowthRepository {
  readonly id = 'supabase';
  readonly holdsLiveData = true;

  private readonly meta: RecordMeta = {
    origin: 'LIVE',
    store: 'supabase',
    stored: true,
  };

  // Explicit fields, for the same type-stripping reason documented on
  // FixtureGrowthRepository: parameter properties are erased by Node's
  // strip-only loader, which would leave these undefined at runtime in tests.
  private readonly supabase: SupabaseLike;
  private readonly allowedClientIds: readonly string[];

  constructor(supabase: SupabaseLike, allowedClientIds: readonly string[]) {
    this.supabase = supabase;
    this.allowedClientIds = allowedClientIds;
  }

  private ok<T>(value: T): RepositoryResult<T> {
    return { ok: true, data: { value, meta: this.meta } };
  }

  /**
   * The client boundary, applied before any query runs.
   *
   * An empty allowlist is a refusal, not "all clients". This is the same
   * invariant as `canAccessClient`, expressed where it can be forgotten least.
   */
  private assertClient(clientId: string): RepositoryResult<never> | null {
    if (!clientId) {
      return failed('PERMISSION_MISSING', 'A client id is required.');
    }
    if (!this.allowedClientIds.includes(clientId)) {
      return failed(
        'PERMISSION_MISSING',
        'This principal is not bound to that client workspace.',
      );
    }
    return null;
  }

  private rows<T>(result: QueryResult): RepositoryResult<T> {
    if (result.error) {
      return failed(classifyPostgrestError(result.error), 'The query was refused.', result.error.message);
    }
    return this.ok((result.data ?? []) as T);
  }

  private async exec(
    builder: PromiseLike<QueryResult>,
    detail: string,
  ): Promise<RepositoryResult<Record<string, unknown>[]>> {
    try {
      const result = await builder;
      return this.rows<Record<string, unknown>[]>(result);
    } catch (error) {
      return failed(
        'QUERY_FAILED',
        detail,
        error instanceof Error ? error.message : 'transport failed',
      );
    }
  }

  async listClientIds(): Promise<RepositoryResult<string[]>> {
    if (this.allowedClientIds.length === 0) {
      return failed('PERMISSION_MISSING', 'This principal has no bound client workspaces.');
    }
    const result = await this.exec(
      this.supabase.from(T.clients).select('id').in('id', this.allowedClientIds),
      'Client workspaces could not be listed.',
    );
    if (!result.ok) return result;
    return this.ok(result.data.value.map((row) => String(row.id)));
  }

  async getClient(clientId: string): Promise<RepositoryResult<Record<string, unknown>>> {
    const denied = this.assertClient(clientId);
    if (denied) return denied;
    const result = await this.exec(
      this.supabase.from(T.clients).select('*').eq('id', clientId).limit(1),
      'The client workspace could not be read.',
    );
    if (!result.ok) return result;
    const row = result.data.value[0];
    if (!row) return failed('NOT_FOUND', `No client workspace ${clientId}.`);
    return this.ok(row);
  }

  async listCampaigns(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    const denied = this.assertClient(clientId);
    if (denied) return denied;
    return this.exec(
      this.supabase
        .from(T.campaigns)
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false }),
      'Campaigns could not be listed.',
    );
  }

  async getCampaign(campaignId: string): Promise<RepositoryResult<Record<string, unknown>>> {
    const result = await this.exec(
      this.supabase.from(T.campaigns).select('*').eq('id', campaignId).limit(1),
      'The campaign could not be read.',
    );
    if (!result.ok) return result;
    const row = result.data.value[0];
    if (!row) return failed('NOT_FOUND', `No campaign ${campaignId}.`);
    // Defence in depth: even with RLS, verify the row's client is one this
    // principal may see before returning it.
    const denied = this.assertClient(String(row.client_id));
    if (denied) return denied;
    return this.ok(row);
  }

  async listCommunities(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    const denied = this.assertClient(clientId);
    if (denied) return denied;
    return this.exec(
      this.supabase
        .from(T.communities)
        .select('*')
        .eq('client_id', clientId)
        .order('city'),
      'Communities could not be listed.',
    );
  }

  async listLeads(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    const denied = this.assertClient(clientId);
    if (denied) return denied;
    return this.exec(
      this.supabase
        .from(T.leads)
        .select('*')
        .eq('client_id', clientId)
        .order('occurred_at', { ascending: false }),
      'Leads could not be listed.',
    );
  }

  async listConnections(clientId: string): Promise<RepositoryResult<Record<string, unknown>[]>> {
    const denied = this.assertClient(clientId);
    if (denied) return denied;
    return this.exec(
      this.supabase.from(T.connections).select('*').eq('client_id', clientId),
      'Connections could not be listed.',
    );
  }

  async listMetrics(clientId: string, window: MetricWindow): Promise<RepositoryResult<MetricRow[]>> {
    const denied = this.assertClient(clientId);
    if (denied) return denied;
    const result = await this.exec(
      this.supabase
        .from(T.metrics)
        .select('*')
        .eq('client_id', clientId)
        .gte('period_start', window.periodStart)
        .lte('period_end', window.periodEnd)
        .order('period_end', { ascending: false }),
      'Metrics could not be read.',
    );
    if (!result.ok) return result;

    return this.ok(
      result.data.value.map((row) => ({
        channel: String(row.channel ?? ''),
        ...(row.campaign_id ? { campaignId: String(row.campaign_id) } : {}),
        metricKey: String(row.metric_key ?? ''),
        value: Number(row.value ?? 0),
        ...(row.currency ? { currency: String(row.currency) } : {}),
        // The stored origin travels through, so a FIXTURE metric that was
        // imported into the database is still labelled as one.
        origin: row.origin === 'FIXTURE' ? ('FIXTURE' as const) : ('LIVE' as const),
        ...(row.evidence ? { evidence: String(row.evidence) } : {}),
      })),
    );
  }

  async listAudit(clientId: string, limit: number): Promise<RepositoryResult<Record<string, unknown>[]>> {
    const denied = this.assertClient(clientId);
    if (denied) return denied;
    return this.exec(
      this.supabase
        .from(T.audit)
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 200)),
      'The audit trail could not be read.',
    );
  }

  async appendAudit(entry: AuditWrite): Promise<RepositoryResult<null>> {
    const denied = this.assertClient(entry.clientId);
    if (denied) return denied;

    try {
      const { error } = await this.supabase.from(T.audit).insert({
        client_id: entry.clientId,
        ...(entry.actorId ? { actor_id: entry.actorId } : {}),
        actor_label: entry.actorLabel.slice(0, 200),
        action: entry.action,
        subject_type: entry.subjectType,
        subject_id: entry.subjectId.slice(0, 200),
        ...(entry.detail ? { detail: redactAuditDetail(entry.detail) } : {}),
      });
      if (error) {
        return failed(classifyPostgrestError(error), 'The audit entry was refused.', error.message);
      }
      return this.ok(null);
    } catch (error) {
      return failed(
        'QUERY_FAILED',
        'The audit entry could not be written.',
        error instanceof Error ? error.message : 'transport failed',
      );
    }
  }
}

/* ---------------------------------------------------------------- redaction */

/** Redact through the canonical scanner before truncating a durable audit entry. */
export function redactAuditDetail(detail: string): string {
  return redactSecrets(detail)
    .replace(/[A-Za-z0-9+/]{120,}={0,2}/g, '[REDACTED_LONG_TOKEN]')
    .slice(0, 2000);
}
