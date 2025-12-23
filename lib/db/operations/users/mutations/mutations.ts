/**
 * User Mutation Operations
 * Write operations for creating, updating, and deleting users
 */

import { eq } from 'drizzle-orm';
import { encryptToken } from '@/lib/crypto';
import { fingerprint, getDb, sanitizeUserUpdateData, users } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { NewUser, User, UserTokenUpdate } from '../types';

/**
 * Create a new user
 * @throws {Error} If user creation fails
 */
export async function createUser(data: NewUser): Promise<User> {
  try {
    const db = getDb();

    // Encrypt sensitive OAuth tokens before storing
    const encryptedData = {
      ...data,
      accessToken: data.accessToken ? encryptToken(data.accessToken) : data.accessToken,
      refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : data.refreshToken,
    };

    // Exclude stravaId if it's null to avoid NOT NULL constraint violation
    if (encryptedData.stravaId === null) {
      const { stravaId, ...dataWithoutStravaId } = encryptedData;
      const [user] = await db.insert(users).values(dataWithoutStravaId).returning();
      return user;
    }

    const [user] = await db.insert(users).values(encryptedData).returning();

    return user;
  } catch (error) {
    dbLogger.error(
      { error, stravaIdFingerprint: fingerprint(data.stravaId) },
      'Error creating user'
    );
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
    dbLogger.error(
      { error, userIdFingerprint: fingerprint(id), sanitizedData: sanitizeUserUpdateData(data) },
      'Error updating user'
    );
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
        accessToken: tokens.accessToken ? encryptToken(tokens.accessToken) : tokens.accessToken,
        refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : tokens.refreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  } catch (error) {
    dbLogger.error({ error, userIdFingerprint: fingerprint(id) }, 'Error updating user tokens');
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
    dbLogger.error({ error, userIdFingerprint: fingerprint(id) }, 'Error deactivating user');
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
    dbLogger.error({ error, userIdFingerprint: fingerprint(id) }, 'Error deleting user');
    throw error;
  }
}

/**
 * Atomically insert or update a user based on the unique `strava_id`.
 * Falls back to a normal create when `stravaId` is not provided.
 */
export async function upsertUser(data: NewUser): Promise<User> {
  try {
    const db = getDb();

    if (!data.stravaId) {
      return await createUser(data);
    }

    // Build the SET payload for ON CONFLICT DO UPDATE. Exclude immutable keys.
    const { id, createdAt, ...updatableFields } = data;
    const setPayload: Partial<Omit<User, 'id' | 'createdAt'>> = {
      ...updatableFields,
      updatedAt: new Date(),
    };

    const [user] = await db
      .insert(users)
      .values({
        ...data,
        accessToken: data.accessToken ? encryptToken(data.accessToken) : data.accessToken,
        refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : data.refreshToken,
      })
      .onConflictDoUpdate({
        target: users.stravaId,
        set: {
          ...setPayload,
          accessToken: setPayload.accessToken
            ? encryptToken(setPayload.accessToken)
            : setPayload.accessToken,
          refreshToken: setPayload.refreshToken
            ? encryptToken(setPayload.refreshToken)
            : setPayload.refreshToken,
        },
      })
      .returning();

    return user;
  } catch (error) {
    dbLogger.error(
      { error, stravaIdFingerprint: fingerprint(data.stravaId) },
      'Error upserting user'
    );
    throw error;
  }
}

/**
 * Find or create a user by Strava ID (upsert pattern)
 * Replaced pre-check with an atomic upsert to avoid race conditions.
 */
export async function findOrCreateUser(data: NewUser): Promise<User> {
  try {
    if (data.stravaId) {
      return await upsertUser(data);
    }
    return await createUser(data);
  } catch (error) {
    dbLogger.error(
      { error, stravaIdFingerprint: fingerprint(data.stravaId) },
      'Error in findOrCreateUser'
    );
    throw error;
  }
}
