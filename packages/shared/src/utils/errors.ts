/**
 * Application error class with structured error codes.
 * Used across both API responses and internal error handling.
 */

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate limiting & budgets
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',

  // Gateway
  INVALID_API_KEY: 'INVALID_API_KEY',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  MODEL_NOT_ALLOWED: 'MODEL_NOT_ALLOWED',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(params: {
    code: ErrorCode;
    message: string;
    statusCode?: number;
    details?: Record<string, unknown>;
    cause?: Error;
    isOperational?: boolean;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'AppError';
    this.code = params.code;
    this.statusCode = params.statusCode ?? this.inferStatusCode(params.code);
    this.details = params.details;
    this.isOperational = params.isOperational ?? true;
  }

  private inferStatusCode(code: ErrorCode): number {
    const map: Record<string, number> = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      SESSION_EXPIRED: 401,
      VALIDATION_ERROR: 400,
      INVALID_INPUT: 400,
      NOT_FOUND: 404,
      ALREADY_EXISTS: 409,
      CONFLICT: 409,
      RATE_LIMIT_EXCEEDED: 429,
      BUDGET_EXCEEDED: 429,
      INVALID_API_KEY: 401,
      API_KEY_REVOKED: 401,
      API_KEY_EXPIRED: 401,
      PROVIDER_UNAVAILABLE: 502,
      MODEL_NOT_ALLOWED: 403,
      GATEWAY_TIMEOUT: 504,
      INTERNAL_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
      ENCRYPTION_ERROR: 500,
    };
    return map[code] ?? 500;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
