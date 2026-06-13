import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client for use in the Next.js frontend.
 * Must be initialized with the API URL.
 */
export function createVaultEdgeAuthClient(apiUrl: string) {
  return createAuthClient({
    baseURL: apiUrl,
  });
}
