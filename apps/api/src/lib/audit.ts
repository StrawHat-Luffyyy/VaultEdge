import type { Database } from '@vaultedge/db';
import { auditLogs } from '@vaultedge/db/schema';
import { logger } from './logger.js';

export interface AuditLogParams {
  orgId: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api_key';
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: { before?: Record<string, any>; after?: Record<string, any> };
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Writes an event to the append-only, immutable audit logs table.
 * Caught errors are logged to console/logger rather than failing the caller procedure.
 */
export async function writeAuditLog(db: Database, params: AuditLogParams) {
  try {
    await db.insert(auditLogs).values({
      orgId: params.orgId,
      actorId: params.actorId,
      actorType: params.actorType,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      changes: params.changes,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (err) {
    logger.error({ err, params }, 'Failed to write audit log');
  }
}
