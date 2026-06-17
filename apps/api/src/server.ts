import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { toNodeHandler } from 'better-auth/node';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { createDbClient } from '@vaultedge/db';
import { createAuth } from '@vaultedge/auth';
import { appRouter } from './trpc/router.js';
import { createContext } from './trpc/context.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestId } from './middleware/request-id.js';
import { gatewayAuth } from './middleware/gateway-auth.js';
import { AppError, ERROR_CODES } from '@vaultedge/shared';
import { ProviderFactory, MockOpenAIAdapter, MockAnthropicAdapter, MockGeminiAdapter, MockMistralAdapter } from './lib/provider-adapter.js';
import { CredentialService } from './lib/credential-service.js';
import { ProviderExecutor } from './lib/provider-executor.js';
import { ExecutionService } from './lib/execution-service.js';


async function main() {
  // ── Initialize Dependencies ───────────────────────────────────────────
  const { db, pool } = createDbClient(env.DATABASE_URL);

  // ── Initialize Provider execution services ────────────────────────────
  const providerFactory = new ProviderFactory();
  providerFactory.register('openai', MockOpenAIAdapter);
  providerFactory.register('anthropic', MockAnthropicAdapter);
  providerFactory.register('gemini', MockGeminiAdapter);
  providerFactory.register('mistral', MockMistralAdapter);

  const credentialService = new CredentialService();
  const providerExecutor = new ProviderExecutor(providerFactory);
  const executionService = new ExecutionService(db, credentialService, providerExecutor);

  const auth = createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseUrl: env.BETTER_AUTH_URL,
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {}),
  });

  // ── Express App ───────────────────────────────────────────────────────
  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Request processing
  app.use(requestId);
  app.use(express.json({ limit: '10mb' }));
  app.use(
    pinoHttp({
      logger,
      quietReqLogger: true,
      customLogLevel(_req, res, err) {
        if (err || (res.statusCode >= 500)) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  // ── Health Check ──────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.1.0',
    });
  });

  // ── Better Auth Routes ────────────────────────────────────────────────
  app.all('/api/auth/*', toNodeHandler(auth));

  // ── tRPC Routes ───────────────────────────────────────────────────────
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: (opts) => createContext(opts, { db, auth }),
      onError({ error, path }) {
        logger.error({ error: error.message, path }, 'tRPC error');
      },
    }),
  );

  // ── Gateway Routes ────────────────────────────────────────────────────
  app.post('/v1/*', gatewayAuth(db), async (req, res, next) => {
    try {
      const { model, provider, messages, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, stop } = req.body || {};
      const headerProvider = req.headers['x-provider'] || req.headers['x-vaultedge-provider'];
      const preferredProvider = typeof provider === 'string' ? provider : (typeof headerProvider === 'string' ? headerProvider : undefined);

      if (!model || typeof model !== 'string') {
        throw new AppError({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'model is required and must be a string in the request body',
          statusCode: 400,
        });
      }

      // Default message structure to satisfy GatewayChatRequest if not provided
      const requestMessages = Array.isArray(messages) ? messages : [{ role: 'user', content: 'Hello' }];

      const response = await executionService.executeChat({
        gatewayContext: req.gatewayContext!,
        request: {
          model,
          messages: requestMessages,
          temperature,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
          stop,
        },
        preferredProvider,
      });

      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // ── Error Handler (must be last) ──────────────────────────────────────
  app.use(errorHandler);

  // ── Start Server ──────────────────────────────────────────────────────
  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        apiUrl: env.API_URL,
      },
      `🔒 VaultEdge API server running on port ${env.PORT}`,
    );
  });

  // ── Graceful Shutdown ─────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      logger.info('HTTP server closed');
      await pool.end();
      logger.info('Database pool closed');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
