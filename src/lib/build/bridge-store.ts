/**
 * Bridge store — Supabase CRUD for bridge pairing, approvals, audit, runs.
 *
 * All operations are owner-only (enforced by RLS). The store never exposes
 * secrets — only bridge IDs, fingerprints, and timestamps.
 *
 * Server-only. Never imported by client components.
 */

export interface BridgeRecord {
  id: string;
  ownerId: string;
  url: string;
  bridgeId: string;
  fingerprint: string;
  pairedBy: string;
  pairedAt: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface ApprovalRecord {
  id: string;
  ownerId: string;
  actionHash: string;
  level: string;
  title: string;
  detail: string;
  affects: string[];
  irreversible: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  ownerId: string;
  action: string;
  actor: string;
  target: string;
  outcome: 'success' | 'failure' | 'denied';
  detail: string;
  approvalId: string | null;
  createdAt: string;
}

export interface RunRecord {
  id: string;
  ownerId: string;
  task: string;
  command: string;
  exitCode: number | null;
  durationMs: number | null;
  headSha: string | null;
  bridgeId: string | null;
  ranAt: string;
  output: string | null;
}

/**
 * The slice of the Supabase query builder this store actually uses.
 *
 * Declared structurally rather than as `any` so a change to the call shape breaks the
 * build instead of passing silently, and so the store stays unit-testable with a stub
 * that implements only what is used.
 */
interface SupabaseQueryResult {
  data: unknown;
  error: { message: string } | null;
}

interface SupabaseQueryResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * The slice of the Supabase query builder this store uses, declared structurally.
 *
 * A hand-written `Database` type was tried first and is the wrong shape here: the real
 * client's generics collapse to `never` without generated types, so the inserts and
 * updates did not typecheck. This describes the call chain instead, so a change to the
 * shape breaks the build rather than passing silently, and tests can inject a stub
 * without a live project. `pair/route.ts` performs the one narrowing cast.
 */
interface SupabaseFilterBuilder extends PromiseLike<SupabaseQueryResult> {
  select(columns?: string): SupabaseFilterBuilder;
  insert(values: Record<string, unknown>): SupabaseFilterBuilder;
  update(values: Record<string, unknown>): SupabaseFilterBuilder;
  delete(): SupabaseFilterBuilder;
  eq(column: string, value: string): SupabaseFilterBuilder;
  order(column: string, options?: { ascending?: boolean }): SupabaseFilterBuilder;
  range(from: number, to: number): PromiseLike<SupabaseQueryResult>;
  limit(count: number): PromiseLike<SupabaseQueryResult>;
  single(): PromiseLike<SupabaseQueryResult>;
}

export interface SupabaseLike {
  from(table: string): SupabaseFilterBuilder;
}

/**
 * Bridge store — uses Supabase server client.
 * Lazy-imported so tests can run without Supabase.
 */
export class BridgeStore {
  private supabase: SupabaseLike;
  private ownerId: string;

  constructor(supabase: SupabaseLike, ownerId: string) {
    this.supabase = supabase;
    this.ownerId = ownerId;
  }

  // -------------------------------------------------------------------------
  // Bridges
  // -------------------------------------------------------------------------

  async listBridges(): Promise<BridgeRecord[]> {
    const { data, error } = await this.supabase
      .from('knoux_build_bridges')
      .select('*')
      .eq('owner_id', this.ownerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list bridges: ${error.message}`);
    return (data ?? []) as BridgeRecord[];
  }

  async getBridge(id: string): Promise<BridgeRecord | null> {
    const { data, error } = await this.supabase
      .from('knoux_build_bridges')
      .select('*')
      .eq('id', id)
      .eq('owner_id', this.ownerId)
      .single();
    if (error) return null;
    return data as BridgeRecord;
  }

  async createBridge(record: Omit<BridgeRecord, 'id' | 'createdAt'>): Promise<BridgeRecord> {
    const { data, error } = await this.supabase
      .from('knoux_build_bridges')
      .insert({ ...record, owner_id: this.ownerId })
      .select()
      .single();
    if (error) throw new Error(`Failed to create bridge: ${error.message}`);
    return data as BridgeRecord;
  }

  async updateBridge(id: string, patch: Partial<BridgeRecord>): Promise<void> {
    const { error } = await this.supabase
      .from('knoux_build_bridges')
      .update(patch)
      .eq('id', id)
      .eq('owner_id', this.ownerId);
    if (error) throw new Error(`Failed to update bridge: ${error.message}`);
  }

  async deleteBridge(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('knoux_build_bridges')
      .delete()
      .eq('id', id)
      .eq('owner_id', this.ownerId);
    if (error) throw new Error(`Failed to delete bridge: ${error.message}`);
  }

  // -------------------------------------------------------------------------
  // Approvals
  // -------------------------------------------------------------------------

  async createApproval(record: Omit<ApprovalRecord, 'id' | 'createdAt'>): Promise<ApprovalRecord> {
    const { data, error } = await this.supabase
      .from('knoux_build_approvals')
      .insert({ ...record, owner_id: this.ownerId })
      .select()
      .single();
    if (error) throw new Error(`Failed to create approval: ${error.message}`);
    return data as ApprovalRecord;
  }

  async getApproval(id: string): Promise<ApprovalRecord | null> {
    const { data, error } = await this.supabase
      .from('knoux_build_approvals')
      .select('*')
      .eq('id', id)
      .eq('owner_id', this.ownerId)
      .single();
    if (error) return null;
    return data as ApprovalRecord;
  }

  async getPendingApprovals(): Promise<ApprovalRecord[]> {
    const { data, error } = await this.supabase
      .from('knoux_build_approvals')
      .select('*')
      .eq('owner_id', this.ownerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list approvals: ${error.message}`);
    return (data ?? []) as ApprovalRecord[];
  }

  async updateApproval(id: string, patch: Partial<ApprovalRecord>): Promise<void> {
    const { error } = await this.supabase
      .from('knoux_build_approvals')
      .update(patch)
      .eq('id', id)
      .eq('owner_id', this.ownerId);
    if (error) throw new Error(`Failed to update approval: ${error.message}`);
  }

  // -------------------------------------------------------------------------
  // Audit
  // -------------------------------------------------------------------------

  async appendAudit(record: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('knoux_build_audit')
      .insert({ ...record, owner_id: this.ownerId });
    if (error) throw new Error(`Failed to append audit: ${error.message}`);
  }

  async listAudit(limit = 100, offset = 0): Promise<AuditRecord[]> {
    const { data, error } = await this.supabase
      .from('knoux_build_audit')
      .select('*')
      .eq('owner_id', this.ownerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Failed to list audit: ${error.message}`);
    return (data ?? []) as AuditRecord[];
  }

  // -------------------------------------------------------------------------
  // Runs
  // -------------------------------------------------------------------------

  async createRun(record: Omit<RunRecord, 'id'>): Promise<RunRecord> {
    const { data, error } = await this.supabase
      .from('knoux_build_runs')
      .insert({ ...record, owner_id: this.ownerId })
      .select()
      .single();
    if (error) throw new Error(`Failed to create run: ${error.message}`);
    return data as RunRecord;
  }

  async listRuns(limit = 50): Promise<RunRecord[]> {
    const { data, error } = await this.supabase
      .from('knoux_build_runs')
      .select('*')
      .eq('owner_id', this.ownerId)
      .order('ran_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to list runs: ${error.message}`);
    return (data ?? []) as RunRecord[];
  }
}
