import type { Activity, User } from '@/lib/db';
import type { UserSettings } from '@/lib/db/schema/userSettings';

/**
 * Data sanitization utilities for database logging
 *
 * SECURITY: Allowlist approach prevents accidental inclusion of sensitive fields
 * in logs. Only pre-approved non-sensitive fields are logged.
 */

export const ALLOWED_USER_UPDATE_FIELDS = [
  'firstName',
  'lastName',
  'isActive',
  'profilePicture',
  'updatedAt',
] as const;

export const ALLOWED_USER_SETTINGS_UPDATE_FIELDS = ['settings', 'metadata', 'updatedAt'] as const;

export const ALLOWED_ACTIVITY_UPDATE_FIELDS = [
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
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  profilePicture?: string;
  updatedAt?: Date;
};

type SanitizedUserSettingsUpdateData = {
  settings?: Record<string, any>;
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
 * Sanitize user update data for logging by allowing only non-sensitive fields.
 * Uses allowlist approach to prevent accidental inclusion of new sensitive fields.
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
 * Sanitize user settings update data for logging by allowing only non-sensitive fields.
 */
export function sanitizeUserSettingsUpdateData(
  data: Partial<Omit<UserSettings, 'id' | 'userId' | 'createdAt'>>
): SanitizedUserSettingsUpdateData {
  const sanitized: SanitizedUserSettingsUpdateData = {};

  for (const [key, value] of Object.entries(data)) {
    if (ALLOWED_USER_SETTINGS_UPDATE_FIELDS.includes(key as any) && value != null) {
      (sanitized as Record<string, any>)[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize activity update data for logging by allowing only non-sensitive fields.
 * Uses allowlist approach to prevent accidental inclusion of new sensitive fields.
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
