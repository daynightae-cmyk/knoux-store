/**
 * KNOuX Growth — roles, permissions, and client scoping.
 *
 * The load-bearing rule from the mission is that a *client* role must not be
 * able to reach another client's data. That is enforced by construction here:
 * every permission check takes the caller's client scope, and `can()` refuses
 * whenever the subject's client is outside it. A missing scope is a refusal, not
 * a permissive default.
 *
 * Note on what this is not: it is not an identity system. The Supabase session
 * supplies the authenticated user; this module decides what that user may do
 * once authenticated, and it makes the client boundary explicit rather than
 * leaving it to each route to remember.
 */

import type { PlatformId } from './types';

export const ROLES = [
  'OWNER',
  'MANAGER',
  'ADS_SPECIALIST',
  'DESIGNER',
  'CONTENT_CREATOR',
  'CLIENT',
  'VIEWER',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_MEANING: Readonly<Record<Role, string>> = {
  OWNER: 'Full control of the workspace, including connections and role assignment.',
  MANAGER: 'Runs clients and campaigns. Approves. Cannot change connection secrets.',
  ADS_SPECIALIST: 'Builds and optimises campaigns. Submits for approval, does not approve.',
  DESIGNER: 'Produces creative drafts. No campaign budget access.',
  CONTENT_CREATOR: 'Produces and schedules content. No campaign budget access.',
  CLIENT: 'Sees only their own workspace. Approves plans submitted to them. Read-only elsewhere.',
  VIEWER: 'Read-only across the workspace. Cannot approve or change anything.',
};

/** Internal roles see every client. A client account sees exactly one. */
export type RoleScope = 'ALL_CLIENTS' | 'OWN_CLIENTS_ONLY' | 'ASSIGNED_ONLY';

export const PERMISSIONS = [
  'client.view',
  'client.manage',
  'campaign.view',
  'campaign.create',
  'campaign.edit',
  'campaign.submit',
  'campaign.approve',
  'campaign.launch',
  'budget.view',
  'budget.edit',
  'creative.view',
  'creative.create',
  'creative.approve',
  'content.view',
  'content.create',
  'content.schedule',
  'content.publish',
  'lead.view',
  'lead.edit',
  'community.view',
  'community.manage',
  'connection.view',
  'connection.manage',
  'analytics.view',
  'report.view',
  'report.generate',
  'automation.view',
  'automation.manage',
  'intelligence.use',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const VIEWER: Permission[] = [
  'client.view',
  'campaign.view',
  'budget.view',
  'creative.view',
  'content.view',
  'lead.view',
  'community.view',
  'connection.view',
  'analytics.view',
  'report.view',
  'automation.view',
  'intelligence.use',
];

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  VIEWER: VIEWER,
  CLIENT: [
    ...VIEWER,
    'campaign.approve',
    'creative.approve',
    'report.generate',
  ],
  CONTENT_CREATOR: [
    ...VIEWER,
    'content.create',
    'content.schedule',
    'creative.create',
    'campaign.create',
    'campaign.edit',
  ],
  DESIGNER: [...VIEWER, 'creative.create', 'creative.approve', 'content.create'],
  ADS_SPECIALIST: [
    ...VIEWER,
    'campaign.create',
    'campaign.edit',
    'campaign.submit',
    'budget.edit',
    'community.manage',
    'report.generate',
  ],
  MANAGER: [
    ...VIEWER,
    'client.manage',
    'campaign.create',
    'campaign.edit',
    'campaign.submit',
    'campaign.approve',
    'campaign.launch',
    'budget.edit',
    'creative.approve',
    'content.create',
    'content.schedule',
    'content.publish',
    'lead.edit',
    'community.manage',
    'report.generate',
    'automation.manage',
  ],
  OWNER: [...PERMISSIONS],
};

export const ROLE_SCOPE: Readonly<Record<Role, RoleScope>> = {
  OWNER: 'ALL_CLIENTS',
  MANAGER: 'ALL_CLIENTS',
  ADS_SPECIALIST: 'ASSIGNED_ONLY',
  DESIGNER: 'ASSIGNED_ONLY',
  CONTENT_CREATOR: 'ASSIGNED_ONLY',
  CLIENT: 'OWN_CLIENTS_ONLY',
  VIEWER: 'ASSIGNED_ONLY',
};

/**
 * Platforms whose connection settings carry credentials. Viewing the *state* of
 * a connection is ordinary operator work; changing where its credential comes
 * from is not, so it is split out and restricted to ownership.
 */
const SENSITIVE_PLATFORMS: readonly PlatformId[] = [
  'facebook',
  'instagram',
  'meta_ads',
  'google_ads',
  'ga4',
  'search_console',
  'youtube',
  'google_business',
  'whatsapp',
];

export function isSensitivePlatform(platform: PlatformId): boolean {
  return SENSITIVE_PLATFORMS.includes(platform);
}

export type Principal = {
  userId: string;
  role: Role;
  /**
   * Clients this principal is bound to. Meaning depends on `role`:
   * OWNER/MANAGER ignore it and see everything; CLIENT is bound to exactly the
   * one client they belong to; an assigned staff role sees only these.
   */
  clientIds: string[];
};

export type Decision = {
  allowed: boolean;
  /** Present when refused. The UI renders this instead of a bare denial. */
  reason?: string;
};

const ALLOW: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

export function hasRolePermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Whether a principal may act on a given client at all.
 *
 * This is the client boundary. It is checked before every permission decision,
 * so no permission set can accidentally grant cross-client reach.
 */
export function canAccessClient(principal: Principal, clientId: string): Decision {
  const scope = ROLE_SCOPE[principal.role];

  if (scope === 'ALL_CLIENTS') return ALLOW;
  if (!principal.clientIds.includes(clientId)) {
    return deny('This principal is not bound to that client workspace.');
  }
  return ALLOW;
}

export type AccessRequest = {
  principal: Principal;
  permission: Permission;
  /** Required for anything client-scoped. Absent means a workspace-level call. */
  clientId?: string;
  /** Required when the call names a platform, to gate credential settings. */
  platform?: PlatformId;
  /** True when the call writes to a connection's credential path. */
  touchesCredentials?: boolean;
};

export function can(request: AccessRequest): Decision {
  const { principal, permission, clientId, platform, touchesCredentials } = request;

  if (clientId) {
    const clientAccess = canAccessClient(principal, clientId);
    if (!clientAccess.allowed) return clientAccess;
  } else if (ROLE_SCOPE[principal.role] !== 'ALL_CLIENTS') {
    return deny('This action is scoped to a client and none was supplied.');
  }

  if (touchesCredentials) {
    if (principal.role !== 'OWNER') {
      return deny('Changing a connection credential is restricted to the workspace owner.');
    }
  } else if (platform && isSensitivePlatform(platform) && !hasRolePermission(principal.role, 'connection.view')) {
    return deny('Viewing this platform connection requires the connection.view permission.');
  }

  if (!hasRolePermission(principal.role, permission)) {
    return deny(`Role ${principal.role} does not hold ${permission}.`);
  }

  return ALLOW;
}

/** Convenience for templates: the client list a principal is allowed to see. */
export function visibleClientIds(principal: Principal, allClientIds: string[]): string[] {
  if (ROLE_SCOPE[principal.role] === 'ALL_CLIENTS') return [...allClientIds];
  const allowed = new Set(principal.clientIds);
  return allClientIds.filter((id) => allowed.has(id));
}

/**
 * Separation of duties for campaign approval.
 *
 * The person who submits a campaign may not also approve it. Without this an
 * approval record only proves that one person clicked twice.
 */
export function canApproveOwnSubmission(params: {
  requestedBy: string;
  decidedBy: string;
}): Decision {
  if (params.requestedBy === params.decidedBy) {
    return deny('The author of a plan cannot be its approver. Assign a different reviewer.');
  }
  return ALLOW;
}