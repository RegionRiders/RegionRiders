/**
 * Token encryption utilities for database operations
 *
 * SECURITY: All OAuth tokens are encrypted at rest using AES-256-GCM.
 * This utility provides conditional encryption that handles null/undefined gracefully.
 */

import { encryptToken } from '@/lib/crypto';

/**
 * Conditionally encrypt a token field
 * Returns encrypted token if value is provided, otherwise returns original value
 * @param token - Token value to encrypt (string, null, or undefined)
 * @returns Encrypted token or original value
 *
 * @example
 * ```ts
 * encryptTokenField('my-token'); // Returns encrypted string
 * encryptTokenField(null); // Returns null
 * encryptTokenField(undefined); // Returns undefined
 * ```
 */
export function encryptTokenField(token: string | null | undefined): string | null | undefined {
  if (!token) {
    return token;
  }
  return encryptToken(token);
}
