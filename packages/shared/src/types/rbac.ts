/**
 * RBAC types — roles, permissions, and membership.
 */

export const ORG_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PERMISSIONS = [
  'org.update',
  'org.delete',
  'org.transfer',
  'member.invite',
  'member.updateRole',
  'member.remove',
  'project.create',
  'project.update',
  'project.archive',
  'apiKey.create',
  'apiKey.revoke',
  'apiKey.list',
  'provider.manage',
  'budget.manage',
  'usage.view',
  'audit.view',
  'audit.export',
  'prompt.create',
  'prompt.edit',
  'prompt.view',
  'alert.manage',
  'settings.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Permission matrix: maps each permission to the roles that have it.
 */
export const ROLE_PERMISSIONS: Record<Permission, readonly OrgRole[]> = {
  'org.update': ['owner', 'admin'],
  'org.delete': ['owner'],
  'org.transfer': ['owner'],
  'member.invite': ['owner', 'admin'],
  'member.updateRole': ['owner', 'admin'],
  'member.remove': ['owner', 'admin'],
  'project.create': ['owner', 'admin', 'member'],
  'project.update': ['owner', 'admin', 'member'],
  'project.archive': ['owner', 'admin'],
  'apiKey.create': ['owner', 'admin', 'member'],
  'apiKey.revoke': ['owner', 'admin', 'member'],
  'apiKey.list': ['owner', 'admin', 'member', 'viewer'],
  'provider.manage': ['owner', 'admin'],
  'budget.manage': ['owner', 'admin'],
  'usage.view': ['owner', 'admin', 'member', 'viewer'],
  'audit.view': ['owner', 'admin'],
  'audit.export': ['owner', 'admin'],
  'prompt.create': ['owner', 'admin', 'member'],
  'prompt.edit': ['owner', 'admin', 'member'],
  'prompt.view': ['owner', 'admin', 'member', 'viewer'],
  'alert.manage': ['owner', 'admin'],
  'settings.manage': ['owner', 'admin'],
} as const;

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[permission].includes(role);
}
