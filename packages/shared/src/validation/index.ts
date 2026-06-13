import { z } from 'zod';

// ── Organization Schemas ────────────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
      message: 'Slug must be lowercase alphanumeric with hyphens, no leading/trailing hyphens',
    }),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  billingEmail: z.string().email().optional(),
  logoUrl: z.string().url().max(500).optional(),
});

// ── Project Schemas ─────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  description: z.string().max(1000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

// ── API Key Schemas ─────────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  projectId: z.string().uuid().optional(),
  scopes: z.array(z.string()).min(1).default(['gateway:write']),
  rateLimitOverride: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  rateLimitOverride: z.number().int().positive().nullable().optional(),
});

// ── Provider Config Schemas ─────────────────────────────────────────────────

export const upsertProviderSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'mistral']),
  displayName: z.string().max(255).optional(),
  apiKey: z.string().min(1), // plaintext — will be encrypted before storage
  baseUrl: z.string().url().optional(),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(0),
  modelsAllowed: z.array(z.string()).optional(),
});

// ── Budget Schemas ──────────────────────────────────────────────────────────

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  projectId: z.string().uuid().optional(),
  period: z.enum(['daily', 'weekly', 'monthly']),
  limitCents: z.number().positive(),
  alertThresholdPct: z.number().int().min(1).max(100).default(80),
  actionOnLimit: z.enum(['alert', 'throttle', 'block']).default('alert'),
});

export const updateBudgetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  limitCents: z.number().positive().optional(),
  alertThresholdPct: z.number().int().min(1).max(100).optional(),
  actionOnLimit: z.enum(['alert', 'throttle', 'block']).optional(),
  isEnabled: z.boolean().optional(),
});

// ── Prompt Schemas ──────────────────────────────────────────────────────────

export const createPromptTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  projectId: z.string().uuid(),
  description: z.string().max(1000).optional(),
});

export const createPromptVersionSchema = z.object({
  templateId: z.string().uuid(),
  content: z.string().min(1).max(50_000),
  systemPrompt: z.string().max(10_000).optional(),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

// ── Member Schemas ──────────────────────────────────────────────────────────

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'viewer']),
});

// ── Alert Schemas ───────────────────────────────────────────────────────────

export const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['budget', 'rate', 'error_spike', 'latency']),
  condition: z.record(z.unknown()),
  channels: z.object({
    email: z.array(z.string().email()).optional(),
    webhook: z.string().url().optional(),
    slack: z.string().url().optional(),
  }),
  cooldownMinutes: z.number().int().min(1).max(1440).default(60),
});

// ── Query Schemas ───────────────────────────────────────────────────────────

export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const usageQuerySchema = dateRangeSchema.extend({
  projectId: z.string().uuid().optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'mistral']).optional(),
  model: z.string().optional(),
  groupBy: z.enum(['day', 'provider', 'model', 'project']).default('day'),
});

export const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
