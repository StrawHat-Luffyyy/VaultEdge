import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Structured logger using Pino.
 *
 * - Development: pretty-printed with colors via pino-pretty
 * - Production: JSON output for log aggregation services
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  base: {
    service: 'vaultedge-api',
    env: env.NODE_ENV,
  },
});

export type Logger = typeof logger;
