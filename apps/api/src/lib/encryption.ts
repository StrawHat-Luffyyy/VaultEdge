import crypto from 'crypto';
import { env } from '../config/env.js';
import { AppError } from '@vaultedge/shared';

// Parse raw keys from env: split comma-separated list or fallback to the single ENCRYPTION_KEY
const getRawKeys = (): string[] => {
  if (env.ENCRYPTION_KEYS) {
    return env.ENCRYPTION_KEYS.split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }
  return [env.ENCRYPTION_KEY];
};

interface DerivedKey {
  keyBuffer: Buffer;
  keyId: string;
}

const rawKeys = getRawKeys();
if (rawKeys.length === 0) {
  throw new Error('No encryption keys configured. Please set ENCRYPTION_KEY or ENCRYPTION_KEYS.');
}

const keyMap = new Map<string, DerivedKey>();
const derivedKeys: DerivedKey[] = rawKeys.map((rawKey) => {
  const keyBuffer = crypto.createHash('sha256').update(rawKey).digest();
  const keyId = crypto.createHash('sha256').update(rawKey).digest('hex').slice(0, 8);
  const dk = { keyBuffer, keyId };
  keyMap.set(keyId, dk);
  return dk;
});

// The first key in the list is always the active key for encryption
const activeKey = derivedKeys[0]!;

/**
 * Encrypts a string using AES-256-GCM with the active encryption key.
 * Output format: v1:keyId:ciphertextHex:tagHex
 */
export function encryptValue(plaintext: string): { ciphertext: string; iv: string } {
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', activeKey.keyBuffer, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');
    const ciphertext = `v1:${activeKey.keyId}:${encrypted}:${tag}`;

    return {
      ciphertext,
      iv: iv.toString('hex'),
    };
  } catch (error: any) {
    throw new AppError({
      code: 'ENCRYPTION_ERROR',
      message: `Encryption failed: ${error.message}`,
      cause: error,
    });
  }
}

/**
 * Decrypts a versioned GCM ciphertext using the key specified by keyId.
 * Enforces format: v1:keyId:ciphertextHex:tagHex
 */
export function decryptValue(encryptedPayload: string, ivHex: string): string {
  try {
    const parts = encryptedPayload.split(':');
    if (parts[0] !== 'v1' || parts.length !== 4) {
      throw new Error('Invalid encryption payload format. Expected v1:keyId:ciphertext:tag');
    }

    const [, keyId, ciphertextHex, tagHex] = parts;
    if (!keyId || !ciphertextHex || !tagHex) {
      throw new Error('Invalid encryption payload components');
    }

    const dk = keyMap.get(keyId);
    if (!dk) {
      throw new Error(`Encryption key with ID "${keyId}" not found in current keyring`);
    }

    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dk.keyBuffer, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    throw new AppError({
      code: 'ENCRYPTION_ERROR',
      message: `Decryption failed: ${error.message}`,
      cause: error,
    });
  }
}
