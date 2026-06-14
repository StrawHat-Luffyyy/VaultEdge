import { router, publicProcedure, orgProcedure } from './trpc.js';
import { orgRouter } from './routers/org.js';

/**
 * Root application router.
 *
 * In M1, all feature routers are stubbed with placeholder procedures.
 * They will be fully implemented in M2–M5.
 *
 * All org-scoped stubs use orgProcedure to enforce tenant isolation
 * and RBAC even before real implementations are added.
 */
export const appRouter = router({
  // Health check — public, used by monitoring
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // ── Organization ────────────────────────────────────────────────────────
  org: orgRouter,

  // ── Project ─────────────────────────────────────────────────────────────
  project: router({
    list: orgProcedure('org.view')
      .query(async ({ ctx }) => {
        ctx.logger.info('project.list called');
        return []; // TODO: M2 implementation
      }),
  }),

  // ── API Keys ────────────────────────────────────────────────────────────
  apiKey: router({
    list: orgProcedure('apiKey.list')
      .query(async ({ ctx }) => {
        ctx.logger.info('apiKey.list called');
        return []; // TODO: M2 implementation
      }),
  }),

  // ── Usage ───────────────────────────────────────────────────────────────
  usage: router({
    summary: orgProcedure('usage.view')
      .query(async ({ ctx }) => {
        ctx.logger.info('usage.summary called');
        return { totalRequests: 0, totalTokens: 0, totalCost: 0 }; // TODO: M4
      }),
  }),

  // ── Settings ────────────────────────────────────────────────────────────
  settings: router({
    get: orgProcedure('org.view')
      .query(async ({ ctx }) => {
        ctx.logger.info('settings.get called');
        return {}; // TODO: M2
      }),
  }),
});

export type AppRouter = typeof appRouter;
