import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@vaultedge/shared';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

/**
 * Global error handler middleware.
 *
 * Catches all errors and returns structured JSON responses.
 * - AppErrors: operational errors with known codes — logged at warn level.
 * - Unknown errors: unexpected failures — logged at error level with stack trace.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, message: err.message, details: err.details }, 'Operational error');

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Unexpected error — log full details, return generic message
  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
}
