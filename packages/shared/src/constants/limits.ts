/**
 * Default limits and quotas per plan tier.
 */

export const PLAN_LIMITS = {
  free: {
    maxProjects: 3,
    maxApiKeys: 5,
    maxRequestsPerMinute: 20,
    maxMembersPerOrg: 3,
    retentionDays: 7,
    maxProviders: 1,
  },
  pro: {
    maxProjects: 25,
    maxApiKeys: 50,
    maxRequestsPerMinute: 200,
    maxMembersPerOrg: 25,
    retentionDays: 90,
    maxProviders: 4,
  },
  enterprise: {
    maxProjects: -1, // unlimited
    maxApiKeys: -1,
    maxRequestsPerMinute: 1000,
    maxMembersPerOrg: -1,
    retentionDays: 365,
    maxProviders: 4,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

/**
 * Default rate limit values when no custom rule is configured.
 */
export const DEFAULT_RATE_LIMITS = {
  gatewayRequestsPerMinute: 60,
  managementRequestsPerMinute: 100,
  gatewayWindowSeconds: 60,
} as const;

/**
 * API key configuration.
 */
export const API_KEY_CONFIG = {
  prefix: 've',
  environments: ['live', 'test'] as const,
  keyLength: 32, // bytes of randomness
  hashAlgorithm: 'sha256' as const,
} as const;
