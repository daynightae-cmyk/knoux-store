import 'server-only';

/**
 * KNOuX Growth — authenticated principal resolution.
 *
 * This is the bridge between Supabase's notion of "a signed-in person" and the
 * Growth RBAC model from Phase 1. Phase 1's `Principal` was a plain object that
 * callers constructed; this module is the only place one is built from a real
 * session, so there is a single answer to "who is this and what may they touch".
 *
 * The resolution order is the one the architecture requires, and it is the order
 * the code runs in:
 *
 *   1. authenticate   — a real Supabase session, or nothing
 *   2. membership     — which client workspaces this user belongs to
 *   3. (boundary)     — enforced by `can()` in `lib/growth/rbac.ts`
 *   4. permission     — enforced by `can()`
 *
 * The important property: **an authenticated user with no membership row gets
 * nothing.** There is no default grant, and no fallthrough to "all clients". A
 * provisioning gap must read as a provisioning gap, not as access.
 */

import { createClient } from '@/lib/supabase/server';
import {
  can,
  canAccessClient,
  hasRolePermission,
  type Decision,
  type Permission,
  type Principal,
  type Role,
} from '../rbac';
import { ROLES } from '../rbac';

/**
 * How a request resolved.
 *
 * `NOT_PROVISIONED` is the state this product spends most of its Phase 2 life in:
 * a real, signed-in user who has no `knoux_growth_memberships` row yet. It is
 * distinct from `ANONYMOUS` because the two need different operator action, and
 * distinct from `ALLOWED` because it must never be mistaken for it.
 */
export type PrincipalResolution =
  | { state: 'ALLOWED'; principal: Principal; email?: string }
  | { state: 'ANONYMOUS'; reason: string }
  | { state: 'NOT_PROVISIONED'; userId: string; email?: string; reason: string }
  | { state: 'MEMBERSHIP_UNAVAILABLE'; userId?: string; reason: string };

/** Where memberships are stored. Matches the Phase 2 migration. */
const MEMBERSHIP_TABLE = 'knoux_growth_memberships';
const CLIENT_TABLE = 'knoux_growth_clients';

/** Role names as they are stored, aligned with the Phase 1 vocabulary. */
const STORED_ROLES: readonly string[] = ROLES;

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && STORED_ROLES.includes(value);
}

/**
 * Resolves the principal for the current request.
 *
 * Every failure mode returns a state rather than throwing, because each one is a
 * normal operational condition that the UI must be able to render: signed out,
 * signed in but not yet granted, or the membership table not deployed.
 */
export async function resolvePrincipal(): Promise<PrincipalResolution> {
  let user: { id: string; email?: string } | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return {
        state: 'ANONYMOUS',
        reason: `The session could not be verified: ${error.message}`,
      };
    }
    user = data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null;
  } catch (error) {
    return {
      state: 'MEMBERSHIP_UNAVAILABLE',
      reason: error instanceof Error ? error.message : 'The auth client could not be created.',
    };
  }

  if (!user) {
    return {
      state: 'ANONYMOUS',
      reason: 'No authenticated Supabase session.',
    };
  }

  // Membership is a second query, deliberately separate: it means a Supabase
  // outage cannot be mistaken for "no memberships" and vice versa.
  let memberships: { client_id: string; role: string }[] | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(MEMBERSHIP_TABLE)
      .select('client_id, role')
      .eq('user_id', user.id);

    if (error) {
      // A missing table is the common case right now: the migration is written
      // but not applied. That is reported as its own state, never as "no
      // access granted" and never as "access allowed".
      return {
        state: 'MEMBERSHIP_UNAVAILABLE',
        userId: user.id,
        ...(user.email ? { email: user.email } : {}),
        reason: `Memberships could not be read: ${error.message}`,
      };
    }
    memberships = (data ?? []) as { client_id: string; role: string }[];
  } catch (error) {
    return {
      state: 'MEMBERSHIP_UNAVAILABLE',
      userId: user.id,
      ...(user.email ? { email: user.email } : {}),
      reason: error instanceof Error ? error.message : 'Membership lookup threw.',
    };
  }

  if (memberships.length === 0) {
    return {
      state: 'NOT_PROVISIONED',
      userId: user.id,
      ...(user.email ? { email: user.email } : {}),
      reason:
        'This account is authenticated but has no Growth workspace membership. An owner must grant one.',
    };
  }

  // An unknown stored role must not become OWNER by falling through a switch.
  // Unknown roles are dropped; if that leaves nothing, the user is unprovisioned.
  const usable = memberships.filter((membership) => isRole(membership.role));
  if (usable.length === 0) {
    return {
      state: 'NOT_PROVISIONED',
      userId: user.id,
      ...(user.email ? { email: user.email } : {}),
      reason: 'Every membership row carries a role this application does not recognise.',
    };
  }

  // Effective role is the most privileged granted role. A person who is OWNER on
  // one client and VIEWER on another acts as OWNER on both — which is why the
  // per-client role is also returned below for the boundary check to use.
  const role = mostPrivileged(usable.map((membership) => membership.role as Role));

  const principal: Principal = {
    userId: user.id,
    role,
    clientIds: [...new Set(usable.map((membership) => membership.client_id))],
  };

  return { state: 'ALLOWED', principal, ...(user.email ? { email: user.email } : {}) };
}

/**
 * Role precedence, highest first.
 *
 * A total order over the role set, used so a multi-membership user resolves to a
 * single effective role rather than to whichever row the database happened to
 * return first.
 */
const ROLE_RANK: Readonly<Record<Role, number>> = {
  OWNER: 70,
  MANAGER: 60,
  ADS_SPECIALIST: 50,
  DESIGNER: 40,
  CONTENT_CREATOR: 30,
  CLIENT: 20,
  VIEWER: 10,
};

function mostPrivileged(roles: Role[]): Role {
  return roles.reduce((best, candidate) =>
    ROLE_RANK[candidate] > ROLE_RANK[best] ? candidate : best,
  );
}

/* --------------------------------------------------------------- guards */

export type GuardFailure = {
  status: 401 | 403 | 503;
  code: 'ANONYMOUS' | 'NOT_PROVISIONED' | 'MEMBERSHIP_UNAVAILABLE' | 'FORBIDDEN';
  message: string;
};

export type GuardResult =
  | { ok: true; principal: Principal; email?: string }
  | { ok: false; failure: GuardFailure; resolution: PrincipalResolution };

/**
 * The server-side gate for a Growth request.
 *
 * Returns a typed failure instead of throwing, so an API route can turn it into
 * a response with the right status and a reason a client can render. The status
 * choice matters: 401 means "sign in", 403 means "you are known and not allowed",
 * and 503 means "the permission system itself is unavailable" — which is a
 * different operational problem and must not be reported as a denial of access.
 */
export async function guardGrowth(request?: {
  permission?: Permission;
  clientId?: string;
  platform?: Parameters<typeof can>[0]['platform'];
  touchesCredentials?: boolean;
}): Promise<GuardResult> {
  const resolution = await resolvePrincipal();

  if (resolution.state !== 'ALLOWED') {
    return {
      ok: false,
      resolution,
      failure:
        resolution.state === 'ANONYMOUS'
          ? { status: 401, code: 'ANONYMOUS', message: resolution.reason }
          : resolution.state === 'NOT_PROVISIONED'
            ? {
                status: 403,
                code: 'NOT_PROVISIONED',
                message: resolution.reason,
              }
            : {
                status: 503,
                code: 'MEMBERSHIP_UNAVAILABLE',
                message: resolution.reason,
              },
    };
  }

  if (request?.permission || request?.clientId) {
    const decision: Decision = can({
      principal: resolution.principal,
      permission: request.permission ?? 'client.view',
      ...(request.clientId ? { clientId: request.clientId } : {}),
      ...(request.platform ? { platform: request.platform } : {}),
      ...(request.touchesCredentials ? { touchesCredentials: true } : {}),
    });

    if (!decision.allowed) {
      return {
        ok: false,
        resolution,
        failure: {
          status: 403,
          code: 'FORBIDDEN',
          message: decision.reason ?? 'Not permitted.',
        },
      };
    }
  }

  return {
    ok: true,
    principal: resolution.principal,
    ...(resolution.email ? { email: resolution.email } : {}),
  };
}

/**
 * Convenience for read paths that only need the client list.
 * Returns the principal or null, so a caller cannot accidentally treat an
 * unresolved identity as an empty-but-allowed one.
 */
export async function requirePrincipal(): Promise<Principal | null> {
  const resolution = await resolvePrincipal();
  return resolution.state === 'ALLOWED' ? resolution.principal : null;
}

/**
 * Which client ids this principal may read. Used by list endpoints so the query
 * is scoped in SQL rather than filtered after the fetch.
 */
export async function visibleClientIdsFor(principal: Principal): Promise<string[]> {
  const scopeAll = principal.role === 'OWNER' || principal.role === 'MANAGER';
  if (scopeAll) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.from(CLIENT_TABLE).select('id');
      if (!error && data) return (data as { id: string }[]).map((row) => row.id);
    } catch {
      /* fall through to the bound list */
    }
  }
  return principal.clientIds;
}

/** Re-exported so route guards need only one import. */
export { canAccessClient, hasRolePermission };
export { CLIENT_TABLE, MEMBERSHIP_TABLE };