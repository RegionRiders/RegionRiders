/**
 * User Mutation Operations
 * Write operations for creating, updating, and deleting users
 */

import { eq } from 'drizzle-orm';
import { getDb, getUserByStravaId, users } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { NewUser, User, UserTokenUpdate } from '../types';

/**
 * Create a new user
 * @throws {Error} If user creation fails
 */
export async function createUser(data: NewUser): Promise<User> {
  try {
    const db = getDb();
    const [user] = await db.insert(users).values(data).returning();

    return user;
  } catch (error) {
    dbLogger.error({ error, data }, 'Error creating user');
    throw error;
  }
}

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
  tokens: UserTokenUpdate
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
