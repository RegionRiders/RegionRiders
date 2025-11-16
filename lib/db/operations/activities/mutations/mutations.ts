/**
 * Activity Mutation Operations
 * Write operations for creating, updating, and deleting activities
 */

import { eq } from 'drizzle-orm';
import { activities, getActivityByStravaId, getDb } from '@/lib/db';
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
    dbLogger.error({ error, data }, 'Error creating activity');
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
    dbLogger.error({ error, id, data }, 'Error updating activity');
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
    dbLogger.error({ error, id }, 'Error deleting activity');
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
    dbLogger.error({ error, userId }, 'Error deleting activities by user ID');
    throw error;
  }
}

/**
 * Find or create an activity by Strava Activity ID (upsert pattern)
 * @throws {Error} If operation fails
 */
export async function findOrCreateActivity(data: NewActivity): Promise<Activity> {
  try {
    if (data.stravaActivityId) {
      const existingActivity = await getActivityByStravaId(data.stravaActivityId);
      if (existingActivity) {
        return existingActivity;
      }
    }
    return await createActivity(data);
  } catch (error) {
    dbLogger.error(
      { error, stravaActivityId: data.stravaActivityId },
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
