import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validates that a request ID is safe for use in structured logs.
 * Allows only alphanumeric characters, hyphens, and underscores (max 128 chars).
 */
const SAFE_REQUEST_ID = /^[a-zA-Z0-9\-_]{1,128}$/;

/**
 * Injects a unique X-Request-ID header into every request.
 * If the client sends one AND it passes validation, it is preserved;
 * otherwise a UUID is generated. This prevents log injection via crafted IDs.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const clientId = req.headers['x-request-id'] as string | undefined;
  const id = clientId && SAFE_REQUEST_ID.test(clientId) ? clientId : uuidv4();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-Id', id);
  next();
}
