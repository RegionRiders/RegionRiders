/**
 * User Query Operations
 * Read-only operations for fetching user data
 */

import { cache } from 'react';
import { desc, eq } from 'drizzle-orm';
import { getDb, users } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { GetUsersOptions, User } from '../types';

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
    dbLogger.error({ error, id }, 'Error fetching user by ID');
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
    dbLogger.error({ error, stravaId }, 'Error fetching user by Strava ID');
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
    dbLogger.error({ error, email }, 'Error fetching user by email');
    return undefined;
  }
});

/**
 * Get all users with pagination
 * Cached for the duration of the request (React cache)
 */
export const getAllUsers = cache(async (options?: GetUsersOptions): Promise<User[]> => {
  try {
    const db = getDb();
    const { limit = 50, offset = 0, activeOnly = false } = options || {};

    let query = db.select().from(users);

    if (activeOnly) {
      query = query.where(eq(users.isActive, true)) as any;
    }

    return await query.orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  } catch (error) {
    dbLogger.error({ error, options }, 'Error fetching users');
    return [];
  }
});
