/**
 * Activity Mutation Operations
 * Write operations for creating, updating, and deleting activities
 */

import { eq } from 'drizzle-orm';
import { activities, fingerprint, getDb, sanitizeActivityUpdateData } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { Activity, NewActivity } from '../types';

/**
 * Create a new activity
 * @throws {Error} If activity creation fails
 */
export async function createActivity(data: NewActivity): Promise<Activity> {
  try {
    const db = getDb();
    const [activity] = await db.insert(activities).values(data).returning();

    return activity;
  } catch (error) {
    dbLogger.error(
      { error, stravaActivityIdFingerprint: fingerprint(data.stravaActivityId) },
      'Error creating activity'
    );
    throw error;
  }
}

/**
 * Update an activity
 * @throws {Error} If update fails
 */
export async function updateActivity(
  id: string,
  data: Partial<Omit<Activity, 'id' | 'userId' | 'createdAt'>>
): Promise<Activity | undefined> {
  try {
    const db = getDb();
    const [activity] = await db
      .update(activities)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(activities.id, id))
      .returning();

    return activity;
  } catch (error) {
    dbLogger.error(
      {
        error,
        activityIdFingerprint: fingerprint(id),
        sanitizedData: sanitizeActivityUpdateData(data),
      },
      'Error updating activity'
    );
    throw error;
  }
}

/**
 * Delete an activity
 * @throws {Error} If deletion fails
 */
export async function deleteActivity(id: string): Promise<boolean> {
  try {
    const db = getDb();
    const result = await db.delete(activities).where(eq(activities.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    dbLogger.error({ error, activityIdFingerprint: fingerprint(id) }, 'Error deleting activity');
    throw error;
  }
}

/**
 * Delete all activities for a user
 * @throws {Error} If deletion fails
 */
export async function deleteActivitiesByUserId(userId: string): Promise<number> {
  try {
    const db = getDb();
    const result = await db.delete(activities).where(eq(activities.userId, userId));
    return result.rowCount || 0;
  } catch (error) {
    dbLogger.error(
      { error, userIdFingerprint: fingerprint(userId) },
      'Error deleting activities by user ID'
    );
    throw error;
  }
}

/**
 * Find or create an activity by Strava Activity ID (upsert pattern)
 * This used to do a pre-check then insert which is vulnerable to a race condition.
 * Replace that with an atomic upsert at the DB layer so concurrent requests return the same canonical row.
 * @throws {Error} If operation fails
 */
export async function upsertActivity(data: NewActivity): Promise<Activity> {
  try {
    const db = getDb();

    // If there's no Strava activity id we cannot perform an upsert by that key — fall back to normal create
    if (!data.stravaActivityId) {
      return await createActivity(data);
    }

    // Prepare the SET payload for ON CONFLICT DO UPDATE.
    // Exclude immutable keys that should never be overwritten by the upsert.
    const { id, userId, createdAt, ...updatableFields } = data;
    const setPayload: Partial<Omit<Activity, 'id' | 'userId' | 'createdAt'>> = {
      ...updatableFields,
      // Ensure updatedAt is always set when upserting
      updatedAt: new Date(),
    };

    // Perform a single INSERT ... ON CONFLICT (strava_activity_id) DO UPDATE SET ... RETURNING *
    const [activity] = await db
      .insert(activities)
      .values(data)
      .onConflictDoUpdate({
        target: activities.stravaActivityId,
        set: setPayload,
      })
      .returning();

    return activity;
  } catch (error) {
    dbLogger.error(
      { error, stravaActivityIdFingerprint: fingerprint(data.stravaActivityId) },
      'Error upserting activity'
    );
    throw error;
  }
}

/**
 * Find or create an activity by Strava Activity ID (upsert pattern)
 * Uses a single atomic DB upsert when a Strava Activity ID is present to avoid race conditions.
 * @throws {Error} If operation fails
 */
export async function findOrCreateActivity(data: NewActivity): Promise<Activity> {
  try {
    if (data.stravaActivityId) {
      return await upsertActivity(data);
    }

    return await createActivity(data);
  } catch (error) {
    dbLogger.error(
      { error, stravaActivityIdFingerprint: fingerprint(data.stravaActivityId) },
      'Error in findOrCreateActivity'
    );
    throw error;
  }
}

/**
 * Bulk create activities
 * @throws {Error} If bulk creation fails
 */
export async function bulkCreateActivities(data: NewActivity[]): Promise<Activity[]> {
  try {
    if (data.length === 0) {
      return [];
    }

    const db = getDb();

    return await db.insert(activities).values(data).returning();
  } catch (error) {
    dbLogger.error({ error, count: data.length }, 'Error bulk creating activities');
    throw error;
  }
}
