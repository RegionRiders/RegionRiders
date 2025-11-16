/**
 * User CRUD Operations
 * Provides Create, Read, Update, Delete operations for users
 *
 * Note: These are database operations used by Server Actions and API Routes.
 * For direct Server Actions, create separate files in the app directory.
 */

import { cache } from 'react';
import { desc, eq } from 'drizzle-orm';
import { getDb, users, type NewUser, type User } from '@/lib/db';
import { dbLogger } from '@/lib/logger';

/**
 * Create a new user
 * @throws {Error} If user creation fails
 */
export async function createUser(data: NewUser): Promise<User> {
  try {
    const db = getDb();
    const [user] = await db.insert(users).values(data).returning();

    if (!user) {
      throw new Error('Failed to create user');
    }

    return user;
  } catch (error) {
    dbLogger.error({ error, data }, 'Error creating user');
    throw error;
  }
}

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
export const getAllUsers = cache(
  async (options?: { limit?: number; offset?: number; activeOnly?: boolean }): Promise<User[]> => {
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
  }
);

/**
 * Update a user
 * @throws {Error} If update fails
 */
export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | undefined> {
  try {
    const db = getDb();
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  } catch (error) {
    dbLogger.error({ error, id, data }, 'Error updating user');
    throw error;
  }
}

/**
 * Update user tokens (for OAuth refresh)
 * @throws {Error} If token update fails
 */
export async function updateUserTokens(
  id: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  }
): Promise<User | undefined> {
  try {
    const db = getDb();
    const [user] = await db
      .update(users)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  } catch (error) {
    dbLogger.error({ error, id }, 'Error updating user tokens');
    throw error;
  }
}

/**
 * Deactivate a user (soft delete)
 * @throws {Error} If deactivation fails
 */
export async function deactivateUser(id: string): Promise<User | undefined> {
  try {
    const db = getDb();
    const [user] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  } catch (error) {
    dbLogger.error({ error, id }, 'Error deactivating user');
    throw error;
  }
}

/**
 * Delete a user permanently
 * @throws {Error} If deletion fails
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    dbLogger.error({ error, id }, 'Error deleting user');
    throw error;
  }
}

/**
 * Find or create a user by Strava ID (upsert pattern)
 * @throws {Error} If operation fails
 */
export async function findOrCreateUser(data: NewUser): Promise<User> {
  try {
    const existingUser = await getUserByStravaId(data.stravaId);
    if (existingUser) {
      return existingUser;
    }
    return await createUser(data);
  } catch (error) {
    dbLogger.error({ error, stravaId: data.stravaId }, 'Error in findOrCreateUser');
    throw error;
  }
}
