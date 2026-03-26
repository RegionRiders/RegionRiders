/**
 * User Mutation Operations
 * Write operations for creating, updating, and deleting users
 */

import { eq } from 'drizzle-orm';
import { encryptTokenField, fingerprint, getDb, userSettings, users } from '@/lib/db';
import { sanitizeUserSettingsUpdateData, sanitizeUserUpdateData } from '@/lib/db/utils/sanitization';
import { dbLogger } from '@/lib/logger';
import type {
  NewUser,
  NewUserSettings,
  User,
  UserMapSettings,
  UserSettings,
  UserSettingsPatch,
  UserTokenUpdate,
} from '../types';

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
      accessToken: encryptTokenField(data.accessToken),
      refreshToken: encryptTokenField(data.refreshToken),
    };

    const [user] = await db.insert(users).values(encryptedData).returning();

    return user;
  } catch (error) {
    dbLogger.error(
      { error, stravaIdFingerprint: fingerprint(data.stravaId), operation: 'createUser' },
      'Error creating user'
    );
    throw error;
  }
}

/**
 * Create settings row for a user
 * @throws {Error} If user settings creation fails
 */
export async function createUserSettings(data: NewUserSettings): Promise<UserSettings> {
  try {
    const db = getDb();
    const [settings] = await db.insert(userSettings).values(data).returning();
    return settings;
  } catch (error) {
    dbLogger.error(
      {
        error,
        userIdFingerprint: fingerprint(data.userId),
        operation: 'createUserSettings',
      },
      'Error creating user settings'
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
    const sanitized = sanitizeUserUpdateData(data);
    const [user] = await db
      .update(users)
      .set({
        ...sanitized,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  } catch (error) {
    dbLogger.error(
      {
        error,
        userIdFingerprint: fingerprint(id),
        sanitizedData: sanitizeUserUpdateData(data),
        operation: 'updateUser',
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken,
      },
      'Error updating user'
    );
    throw error;
  }
}

/**
 * Upsert user settings by user ID for high-frequency settings writes.
 */
export async function upsertUserSettings(
  userId: string,
  patch: UserSettingsPatch
): Promise<UserSettings> {
  try {
    const db = getDb();
    const [settings] = await db
      .insert(userSettings)
      .values({
        userId,
        settings: patch.settings,
        metadata: patch.metadata,
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          settings: patch.settings,
          metadata: patch.metadata,
          updatedAt: new Date(),
        },
      })
      .returning();

    return settings;
  } catch (error) {
    dbLogger.error(
      {
        error,
        userIdFingerprint: fingerprint(userId),
        operation: 'upsertUserSettings',
        hasSettings: patch.settings != null,
        hasMetadata: patch.metadata != null,
      },
      'Error upserting user settings'
    );
    throw error;
  }
}

/**
 * Update user settings by user ID.
 */
export async function updateUserSettings(
  userId: string,
  data: Partial<Omit<UserSettings, 'id' | 'userId' | 'createdAt'>>
): Promise<UserSettings | undefined> {
  try {
    const db = getDb();
    const sanitized = sanitizeUserSettingsUpdateData(data);
    const [settings] = await db
      .update(userSettings)
      .set({
        ...sanitized,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    return settings;
  } catch (error) {
    dbLogger.error(
      {
        error,
        userIdFingerprint: fingerprint(userId),
        operation: 'updateUserSettings',
        sanitizedData: sanitizeUserSettingsUpdateData(data),
      },
      'Error updating user settings'
    );
    throw error;
  }
}

/**
 * Returns true when persisted settings differ from given in-memory settings.
 */
export async function haveUserSettingsChanged(
  userId: string,
  inMemorySettings: Partial<UserMapSettings> | null | undefined
): Promise<boolean> {
  try {
    const db = getDb();
    const [stored] = await db
      .select({ settings: userSettings.settings })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const storedJson = JSON.stringify(stored?.settings ?? null);
    const inMemoryJson = JSON.stringify(inMemorySettings ?? null);
    return storedJson !== inMemoryJson;
  } catch (error) {
    dbLogger.error(
      {
        error,
        userIdFingerprint: fingerprint(userId),
        operation: 'haveUserSettingsChanged',
      },
      'Error checking whether user settings changed'
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
        accessToken: encryptTokenField(tokens.accessToken),
        refreshToken: encryptTokenField(tokens.refreshToken),
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return user;
  } catch (error) {
    dbLogger.error(
      {
        error,
        userIdFingerprint: fingerprint(id),
        operation: 'updateUserTokens',
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        hasTokenExpiresAt: !!tokens.tokenExpiresAt,
      },
      'Error updating user tokens'
    );
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
    dbLogger.error(
      { error, userIdFingerprint: fingerprint(id), operation: 'deactivateUser' },
      'Error deactivating user'
    );
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
    dbLogger.error(
      { error, userIdFingerprint: fingerprint(id), operation: 'deleteUser' },
      'Error deleting user'
    );
    throw error;
  }
}

/**
 * Delete settings row for a user.
 */
export async function deleteUserSettings(userId: string): Promise<boolean> {
  try {
    const db = getDb();
    const result = await db.delete(userSettings).where(eq(userSettings.userId, userId));
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    dbLogger.error(
      { error, userIdFingerprint: fingerprint(userId), operation: 'deleteUserSettings' },
      'Error deleting user settings'
    );
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
        accessToken: encryptTokenField(data.accessToken),
        refreshToken: encryptTokenField(data.refreshToken),
      })
      .onConflictDoUpdate({
        target: users.stravaId,
        set: {
          ...setPayload,
          accessToken: encryptTokenField(setPayload.accessToken),
          refreshToken: encryptTokenField(setPayload.refreshToken),
        },
      })
      .returning();

    return user;
  } catch (error) {
    dbLogger.error(
      {
        error,
        stravaIdFingerprint: fingerprint(data.stravaId),
        operation: 'upsertUser',
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken,
      },
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
      {
        error,
        stravaIdFingerprint: fingerprint(data.stravaId),
        operation: 'findOrCreateUser',
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken,
      },
      'Error in findOrCreateUser'
    );
    throw error;
  }
}
