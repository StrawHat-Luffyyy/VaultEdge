/**
 * RBAC types — roles, permissions, and membership.
 */

export const ORG_ROLES = ['owner', 'admin', 'developer', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  developer: 2,
  viewer: 1,
};

export const PERMISSIONS = [
  'org.update',
  'org.delete',
  'org.transfer',
  'org.view',
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
  'org.view': ['owner', 'admin', 'developer', 'viewer'],
  'member.invite': ['owner', 'admin'],
  'member.updateRole': ['owner', 'admin'],
  'member.remove': ['owner', 'admin'],
  'project.create': ['owner', 'admin', 'developer'],
  'project.update': ['owner', 'admin', 'developer'],
  'project.archive': ['owner', 'admin'],
  'apiKey.create': ['owner', 'admin', 'developer'],
  'apiKey.revoke': ['owner', 'admin', 'developer'],
  'apiKey.list': ['owner', 'admin', 'developer', 'viewer'],
  'provider.manage': ['owner', 'admin'],
  'budget.manage': ['owner', 'admin'],
  'usage.view': ['owner', 'admin', 'developer', 'viewer'],
  'audit.view': ['owner', 'admin'],
  'audit.export': ['owner', 'admin'],
  'prompt.create': ['owner', 'admin', 'developer'],
  'prompt.edit': ['owner', 'admin', 'developer'],
  'prompt.view': ['owner', 'admin', 'developer', 'viewer'],
  'alert.manage': ['owner', 'admin'],
  'settings.manage': ['owner', 'admin'],
} as const;

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[permission].includes(role);
}
