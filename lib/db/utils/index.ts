/**
 * Utility functions for database operations
 */

import { createHash } from 'crypto';
import { encryptToken } from '@/lib/crypto';
import type { Activity, User } from '@/lib/db';

/**
 * UUID format validation regex
 * Matches standard UUID format: 8-4-4-4-12 hexadecimal characters
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   - time_low (8 hex)
 *   - time_mid (4 hex)
 *   - time_hi_and_version (4 hex)
 *   - clock_seq_hi_and_reserved (4 hex)
 *   - clock_seq_low (12 hex)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

const ALLOWED_USER_UPDATE_FIELDS = ['isActive', 'profilePicture', 'metadata', 'updatedAt'] as const;
const ALLOWED_ACTIVITY_UPDATE_FIELDS = [
  'stravaActivityId',
  'name',
  'type',
  'startDate',
  'description',
  'sportType',
  'timezone',
  'distance',
  'movingTime',
  'elapsedTime',
  'totalElevationGain',
  'averageSpeed',
  'elevHigh',
  'elevLow',
  'maxSpeed',
  'averageCadence',
  'averageHeartrate',
  'maxHeartrate',
  'calories',
  'isManual',
  'isPrivate',
  'metadata',
  'updatedAt',
] as const;

type SanitizedUserUpdateData = {
  isActive?: boolean;
  profilePicture?: string;
  metadata?: Record<string, any>;
  updatedAt?: Date;
};

type SanitizedActivityUpdateData = {
  stravaActivityId?: string;
  name?: string;
  type?: string;
  startDate?: Date;
  description?: string;
  sportType?: string;
  timezone?: string;
  distance?: number;
  movingTime?: number;
  elapsedTime?: number;
  totalElevationGain?: number;
  averageSpeed?: number;
  elevHigh?: number;
  elevLow?: number;
  maxSpeed?: number;
  averageCadence?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  calories?: number;
  isManual?: boolean;
  isPrivate?: boolean;
  metadata?: Record<string, any>;
  updatedAt?: Date;
};

/**
 * Generate a stable, non-reversible fingerprint for logging user identifiers.
 * Returns to first 16 characters of an SHA-256 hash.
 * This allows debugging without exposing raw PII.
 *
 * WARNING: Using only 16 characters (64 bits) provides limited collision resistance
 * and may be vulnerable to brute-force attacks for small input spaces.
 * This is suitable ONLY for debugging logs, not for security-sensitive operations.
 *
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

/**
 * Sanitize user update data for logging by allowing only non-sensitive fields.
 * Uses an allowlist approach to prevent accidental inclusion of new sensitive fields.
 * Keeps non-sensitive fields like isActive, profile settings, etc.
 */
export function sanitizeUserUpdateData(
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): SanitizedUserUpdateData {
  const sanitized: SanitizedUserUpdateData = {};

  for (const [key, value] of Object.entries(data)) {
    if (ALLOWED_USER_UPDATE_FIELDS.includes(key as any) && value != null) {
      (sanitized as Record<string, any>)[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize activity update data for logging by allowing only non-sensitive fields.
 * Uses an allowlist approach to prevent accidental inclusion of new sensitive fields.
 * Keeps non-sensitive fields like name, type, metrics, etc., but excludes location and map data.
 */
export function sanitizeActivityUpdateData(
  data: Partial<Omit<Activity, 'id' | 'userId' | 'createdAt'>>
): SanitizedActivityUpdateData {
  const sanitized: SanitizedActivityUpdateData = {};

  for (const [key, value] of Object.entries(data)) {
    if (ALLOWED_ACTIVITY_UPDATE_FIELDS.includes(key as any) && value != null) {
      (sanitized as Record<string, any>)[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate if a string is a valid UUID format
 * Matches standard UUID format (8-4-4-4-12 hexadecimal characters)
 *
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 *
 * @example
 * ```ts
 * isValidUuid('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUuid('00000000-0000-0000-0000-000000000000'); // true
 * isValidUuid('not-a-uuid'); // false
 * ```
 */
export function isValidUuid(value: string): boolean {
  if (!value) {
    return false;
  }
  return UUID_REGEX.test(value);
}
