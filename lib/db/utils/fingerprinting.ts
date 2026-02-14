/**
 * PII fingerprinting utilities for secure logging
 *
 * SECURITY: SHA-256 first 16 characters provides limited collision resistance.
 * Suitable ONLY for debugging logs, not security-sensitive operations.
 */

import { createHash } from 'crypto';

/**
 * Generate a stable, non-reversible fingerprint for logging user identifiers.
 * Returns first 16 characters of SHA-256 hash.
 * @param value - Value to fingerprint (string, number, null, or undefined)
 * @returns 16-character hex hash or undefined
 *
 * @example
 * ```ts
 * fingerprint('user@example.com'); // Returns: "a1b2c3d4e5f6g7h8"
 * fingerprint(12345); // Returns: "f0e1d2c3b4a59687"
 * fingerprint(null); // Returns: undefined
 * ```
 */
export function fingerprint(value: string | number | null | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const hash = createHash('sha256').update(String(value)).digest('hex');
  return hash.substring(0, 16);
}
