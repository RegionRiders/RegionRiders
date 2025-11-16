/**
 * Activity CRUD Operations
 * Provides Create, Read, Update, Delete operations for activities (rides)
 *
 * Note: These are database operations used by Server Actions and API Routes.
 * For direct Server Actions, create separate files in the app directory.
 */

import { cache } from 'react';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { activities, getDb, type Activity, type NewActivity } from '@/lib/db';
import { dbLogger } from '@/lib/logger';

/**
 * Create a new activity
 * @throws {Error} If activity creation fails
 */
export async function createActivity(data: NewActivity): Promise<Activity> {
  try {
    const db = getDb();
    const [activity] = await db.insert(activities).values(data).returning();

    if (!activity) {
      throw new Error('Failed to create activity');
    }

    return activity;
  } catch (error) {
    dbLogger.error({ error, data }, 'Error creating activity');
    throw error;
  }
}

/**
 * Get an activity by ID
 * Cached for the duration of the request (React cache)
 */
export const getActivityById = cache(async (id: string): Promise<Activity | undefined> => {
  try {
    const db = getDb();
    const [activity] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    return activity;
  } catch (error) {
    dbLogger.error({ error, id }, 'Error fetching activity by ID');
    return undefined;
  }
});

/**
 * Get an activity by Strava Activity ID
 * Cached for the duration of the request (React cache)
 */
export const getActivityByStravaId = cache(
  async (stravaActivityId: string): Promise<Activity | undefined> => {
    try {
      const db = getDb();
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.stravaActivityId, stravaActivityId))
        .limit(1);
      return activity;
    } catch (error) {
      dbLogger.error({ error, stravaActivityId }, 'Error fetching activity by Strava ID');
      return undefined;
    }
  }
);

/**
 * Get all activities for a user
 * Cached for the duration of the request (React cache)
 */
export const getActivitiesByUserId = cache(
  async (
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      type?: string;
    }
  ): Promise<Activity[]> => {
    try {
      const db = getDb();
      const { limit = 50, offset = 0, startDate, endDate, type } = options || {};

      // Apply filters
      const conditions = [eq(activities.userId, userId)];

      if (startDate) {
        conditions.push(gte(activities.startDate, startDate));
      }

      if (endDate) {
        conditions.push(lte(activities.startDate, endDate));
      }

      if (type) {
        conditions.push(eq(activities.type, type));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      return await db
        .select()
        .from(activities)
        .where(whereClause)
        .orderBy(desc(activities.startDate))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      dbLogger.error({ error, userId, options }, 'Error fetching activities by user ID');
      return [];
    }
  }
);

/**
 * Get all activities with pagination
 * Cached for the duration of the request (React cache)
 */
export const getAllActivities = cache(
  async (options?: { limit?: number; offset?: number }): Promise<Activity[]> => {
    try {
      const db = getDb();
      const { limit = 50, offset = 0 } = options || {};

      return await db
        .select()
        .from(activities)
        .orderBy(desc(activities.startDate))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      dbLogger.error({ error, options }, 'Error fetching all activities');
      return [];
    }
  }
);

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
 * Get activity statistics for a user
 * Cached for the duration of the request (React cache)
 */
export const getActivityStats = cache(
  async (
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
    }
  ): Promise<{
    totalActivities: number;
    totalDistance: number;
    totalMovingTime: number;
    totalElevationGain: number;
    averageDistance: number;
    averageSpeed: number;
  }> => {
    try {
      const db = getDb();
      const { startDate, endDate, type } = options || {};

      const conditions = [eq(activities.userId, userId)];

      if (startDate) {
        conditions.push(gte(activities.startDate, startDate));
      }

      if (endDate) {
        conditions.push(lte(activities.startDate, endDate));
      }

      if (type) {
        conditions.push(eq(activities.type, type));
      }

      const [stats] = await db
        .select({
          totalActivities: sql<number>`count(*)::int`,
          totalDistance: sql<number>`coalesce(sum(${activities.distance}), 0)`,
          totalMovingTime: sql<number>`coalesce(sum(${activities.movingTime}), 0)`,
          totalElevationGain: sql<number>`coalesce(sum(${activities.totalElevationGain}), 0)`,
          averageDistance: sql<number>`coalesce(avg(${activities.distance}), 0)`,
          averageSpeed: sql<number>`coalesce(avg(${activities.averageSpeed}), 0)`,
        })
        .from(activities)
        .where(and(...conditions));

      return stats;
    } catch (error) {
      dbLogger.error({ error, userId, options }, 'Error fetching activity stats');
      return {
        totalActivities: 0,
        totalDistance: 0,
        totalMovingTime: 0,
        totalElevationGain: 0,
        averageDistance: 0,
        averageSpeed: 0,
      };
    }
  }
);

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
    const createdActivities = await db.insert(activities).values(data).returning();

    if (!createdActivities || createdActivities.length === 0) {
      throw new Error('Failed to create activities in bulk');
    }

    return createdActivities;
  } catch (error) {
    dbLogger.error({ error, count: data.length }, 'Error bulk creating activities');
    throw error;
  }
}
