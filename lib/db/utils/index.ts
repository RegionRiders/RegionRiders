/**
 * Utility functions for database operations
 */

import { createHash } from 'crypto';
import { encryptToken } from '@/lib/crypto';
import type { Activity, User } from '@/lib/db';

/**
 * Conditionally encrypt a token field
 * Returns encrypted token if value is provided, otherwise returns original value
 * @param token - Token value to encrypt (string, null, or undefined)
 * @returns Encrypted token or original value
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
 * Returns the first 16 characters of an SHA-256 hash.
 * This allows debugging without exposing raw PII.
 *
 * WARNING: Using only 16 characters makes this vulnerable
 * to brute-force attacks for small input spaces like sequential IDs!!!!!!!!!!111
 * This is suitable ONLY for debugging logs, not for any security-sensitive operations.
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
 * Validate if a string is a valid UUID v4 format
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUuid(value: string): boolean {
  if (!value) {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
