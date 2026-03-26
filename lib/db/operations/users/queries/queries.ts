/**
 * User Query Operations
 * Read-only operations for fetching user data
 */

import { cache } from 'react';
import { desc, eq } from 'drizzle-orm';
import { fingerprint, getDb, users, userSettings } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { GetUsersOptions, User, UserSettings } from '../types';

/**
 * Get a user by ID
 * Cached for the duration of the request (React cache)
 */
export const getUserById = cache(async (id: string): Promise<User | undefined> => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  } catch (error) {
    dbLogger.error({ error, userIdFingerprint: fingerprint(id) }, 'Error fetching user by ID');
    return undefined;
  }
});

/**
 * Get a user by Strava ID
 * Cached for the duration of the request (React cache)
 */
export const getUserByStravaId = cache(async (stravaId: string): Promise<User | undefined> => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.stravaId, stravaId)).limit(1);
    return user;
  } catch (error) {
    dbLogger.error(
      { error, stravaIdFingerprint: fingerprint(stravaId) },
      'Error fetching user by Strava ID'
    );
    return undefined;
  }
});

/**
 * Get a user by email
 * Cached for the duration of the request (React cache)
 */
export const getUserByEmail = cache(async (email: string): Promise<User | undefined> => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  } catch (error) {
    dbLogger.error({ error, emailFingerprint: fingerprint(email) }, 'Error fetching user by email');
    return undefined;
  }
});

/**
 * Get all users with pagination
 * Cached for the duration of the request (React cache)
 */
export const getAllUsers = cache(async (options?: GetUsersOptions): Promise<User[]> => {
  const { limit = 50, offset = 0, activeOnly = false } = options || {};

  // Clamp pagination parameters to safe ranges
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeOffset = Math.max(0, offset);

  try {
    const db = getDb();

    const baseQuery = db.select().from(users);
    const filteredQuery = activeOnly ? baseQuery.where(eq(users.isActive, true)) : baseQuery;

    return await filteredQuery.orderBy(desc(users.createdAt)).limit(safeLimit).offset(safeOffset);
  } catch (error) {
    dbLogger.error(
      { error, limit: safeLimit, offset: safeOffset, activeOnly },
      'Error fetching users'
    );
    return [];
  }
});

/**
 * Get user settings by user ID
 * Cached for the duration of the request (React cache)
 */
export const getUserSettingsByUserId = cache(
  async (userId: string): Promise<UserSettings | undefined> => {
    try {
      const db = getDb();
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);
      return settings;
    } catch (error) {
      dbLogger.error(
        { error, userIdFingerprint: fingerprint(userId), operation: 'getUserSettingsByUserId' },
        'Error fetching user settings by user ID'
      );
      return undefined;
    }
  }
);
