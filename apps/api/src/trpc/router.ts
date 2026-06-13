import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './trpc.js';

/**
 * Root application router.
 *
 * In M1, all feature routers are stubbed with placeholder procedures.
 * They will be fully implemented in M2–M5.
 */
export const appRouter = router({
  // Health check — public, used by monitoring
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // ── Organization ────────────────────────────────────────────────────────
  org: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      ctx.logger.info('org.list called');
      return []; // TODO: M2 implementation
    }),
  }),

  // ── Project ─────────────────────────────────────────────────────────────
  project: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.string().uuid() }))
      .query(async ({ ctx }) => {
        ctx.logger.info('project.list called');
        return []; // TODO: M2 implementation
      }),
  }),

  // ── API Keys ────────────────────────────────────────────────────────────
  apiKey: router({
    list: protectedProcedure
      .input(z.object({ orgId: z.string().uuid() }))
      .query(async ({ ctx }) => {
        ctx.logger.info('apiKey.list called');
        return []; // TODO: M2 implementation
      }),
  }),

  // ── Usage ───────────────────────────────────────────────────────────────
  usage: router({
    summary: protectedProcedure
      .input(z.object({ orgId: z.string().uuid() }))
      .query(async ({ ctx }) => {
        ctx.logger.info('usage.summary called');
        return { totalRequests: 0, totalTokens: 0, totalCost: 0 }; // TODO: M4
      }),
  }),

  // ── Settings ────────────────────────────────────────────────────────────
  settings: router({
    get: protectedProcedure
      .input(z.object({ orgId: z.string().uuid() }))
      .query(async ({ ctx }) => {
        ctx.logger.info('settings.get called');
        return {}; // TODO: M2
      }),
  }),
});

export type AppRouter = typeof appRouter;
