/**
 * Cryptography utilities for sensitive data
 * Provides encryption/decryption for OAuth tokens
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { dbLogger } from './logger';

// Cache for derived encryption key
let cachedKey: Buffer | null = null;
let cachedKeyEnv: string | null = null;
let cachedSaltEnv: string | null = null;

// Encryption constants
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCRYPTED_DATA_PARTS = 3;

// Scrypt parameters (OWASP compliant)
// N=131072 (2^17): CPU/memory cost (~128 MiB RAM, ~0.5s on modern CPUs)
// r=8: Block size (1024 bytes)
// p=1: Parallelization factor
// maxmem: Memory limit ~144 MiB (128 * N * r = 128 MiB requirement + overhead)
// See: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt
const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 144 * 1024 * 1024;

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text Plain text to encrypt
 * @returns Encrypted data as base64 string with IV and auth tag
 *
 * @example
 * ```ts
 * const encrypted = encryptToken('my-access-token');
 * // Returns: "IV_BASE64:AUTH_TAG_BASE64:ENCRYPTED_DATA_BASE64"
 * ```
 */
export function encryptToken(text: string): string {
  if (text === null || text === undefined) {
    return text as any;
  }

  if (typeof text !== 'string') {
    throw new TypeError('encryptToken requires a string input');
  }

  if (text.length === 0) {
    return text;
  }

  if (text.length > 1_000_000) {
    dbLogger.warn({ length: text.length }, 'encryptToken called with very long input');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts data encrypted with encryptToken
 * @param encryptedData Encrypted data string
 * @returns Decrypted plain text
 *
 * @example
 * ```ts
 * const decrypted = decryptToken(encrypted);
 * // Returns: original plain text
 * ```
 */
export function decryptToken(encryptedData: string): string {
  if (encryptedData === null || encryptedData === undefined) {
    return encryptedData as any;
  }

  if (typeof encryptedData !== 'string') {
    throw new TypeError('decryptToken requires a string input');
  }

  if (encryptedData.length === 0) {
    return encryptedData;
  }

  const parts = encryptedData.split(':');
  if (parts.length !== ENCRYPTED_DATA_PARTS) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivBase64, authTagBase64, encrypted] = parts;
  if (!ivBase64 || !authTagBase64 || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid encrypted data format');
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid encrypted data format: ${errorMessage}`);
  }
}

/**
 * Gets the encryption key from environment variable
 * Uses a per-installation salt for better security
 *
 * Performance: Keys are cached to avoid expensive scrypt derivation (~0.5s per call)
 * Cache is invalidated when environment variables change (development mode only)
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.OAUTH_ENCRYPTION_KEY;
  const saltEnv = process.env.OAUTH_ENCRYPTION_SALT;

  if (!keyEnv) {
    throw new Error('OAUTH_ENCRYPTION_KEY environment variable is required');
  }

  if (!saltEnv) {
    throw new Error('OAUTH_ENCRYPTION_SALT environment variable is required');
  }

  if (cachedKey && cachedKeyEnv === keyEnv && cachedSaltEnv === saltEnv) {
    return cachedKey;
  }

  const derivedKey = scryptSync(keyEnv, saltEnv, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });

  cachedKey = derivedKey;
  cachedKeyEnv = keyEnv;
  cachedSaltEnv = saltEnv;

  return derivedKey;
}

/**
 * Clears cached encryption key
 * Useful for testing or when rotating encryption credentials
 * @internal
 *
 * @example
 * ```ts
 * clearEncryptionKeyCache();
 * // Next encryption call will derive a new key
 * ```
 */
export function clearEncryptionKeyCache(): void {
  cachedKey = null;
  cachedKeyEnv = null;
  cachedSaltEnv = null;
}
