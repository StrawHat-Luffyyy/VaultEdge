import { relations } from 'drizzle-orm';
import { organizations } from './schema/organizations.js';
import { orgMembers } from './schema/org-members.js';
import { projects } from './schema/projects.js';
import { apiKeys } from './schema/api-keys.js';
import { providerConfigs } from './schema/provider-configs.js';
import { usageDaily } from './schema/usage-daily.js';
import { budgets } from './schema/budgets.js';
import { rateLimitRules } from './schema/rate-limit-rules.js';
import { promptTemplates, promptVersions } from './schema/prompt-templates.js';
import { alertRules, alertEvents } from './schema/alert-rules.js';

// ── Organization Relations ──────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  projects: many(projects),
  apiKeys: many(apiKeys),
  providerConfigs: many(providerConfigs),
  budgets: many(budgets),
  rateLimitRules: many(rateLimitRules),
  alertRules: many(alertRules),
}));

// ── Org Member Relations ────────────────────────────────────────────────────

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
}));

// ── Project Relations ───────────────────────────────────────────────────────

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  apiKeys: many(apiKeys),
  usageDaily: many(usageDaily),
  budgets: many(budgets),
  promptTemplates: many(promptTemplates),
}));

// ── API Key Relations ───────────────────────────────────────────────────────

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));

// ── Provider Config Relations ───────────────────────────────────────────────

export const providerConfigsRelations = relations(providerConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [providerConfigs.orgId],
    references: [organizations.id],
  }),
}));

// ── Usage Daily Relations ───────────────────────────────────────────────────

export const usageDailyRelations = relations(usageDaily, ({ one }) => ({
  organization: one(organizations, {
    fields: [usageDaily.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [usageDaily.projectId],
    references: [projects.id],
  }),
}));

// ── Budget Relations ────────────────────────────────────────────────────────

export const budgetsRelations = relations(budgets, ({ one }) => ({
  organization: one(organizations, {
    fields: [budgets.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [budgets.projectId],
    references: [projects.id],
  }),
}));

// ── Prompt Relations ────────────────────────────────────────────────────────

export const promptTemplatesRelations = relations(promptTemplates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [promptTemplates.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [promptTemplates.projectId],
    references: [projects.id],
  }),
  versions: many(promptVersions),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one }) => ({
  template: one(promptTemplates, {
    fields: [promptVersions.templateId],
    references: [promptTemplates.id],
  }),
}));

// ── Alert Relations ─────────────────────────────────────────────────────────

export const alertRulesRelations = relations(alertRules, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [alertRules.orgId],
    references: [organizations.id],
  }),
  events: many(alertEvents),
}));

export const alertEventsRelations = relations(alertEvents, ({ one }) => ({
  rule: one(alertRules, {
    fields: [alertEvents.ruleId],
    references: [alertRules.id],
  }),
}));
