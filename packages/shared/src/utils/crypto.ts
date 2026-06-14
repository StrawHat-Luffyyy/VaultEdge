import crypto from 'crypto';
import { API_KEY_CONFIG } from '../constants/limits.js';

/**
 * Generates a secure random API key with a prefix.
 * Prefix is either 've_live_' or 've_test_'.
 */
export function generateApiKey(prefix: 've_live_' | 've_test_' = 've_live_'): string {
  const randomBytes = crypto.randomBytes(API_KEY_CONFIG.keyLength).toString('hex');
  return `${prefix}${randomBytes}`;
}

/**
 * Gets the prefix and first 4 characters of the random part for UI display.
 * Example input: 've_live_abc123...' -> output: 've_live_abc1'
 */
export function getApiKeyPrefix(key: string): string {
  if (key.startsWith('ve_live_')) {
    return `ve_live_${key.slice(8, 12)}`;
  }
  if (key.startsWith('ve_test_')) {
    return `ve_test_${key.slice(8, 12)}`;
  }
  return key.slice(0, 12);
}

/**
 * Hashes a given API key using HMAC-SHA256 with the API_KEY_SECRET.
 */
export function hashApiKey(key: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(key).digest('hex');
}
