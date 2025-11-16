/**
 * Activity Query Operations
 * Read-only operations for fetching activity data
 */

import { cache } from 'react';
import { and, desc, eq } from 'drizzle-orm';
import { activities, getDb } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { Activity, GetActivitiesOptions } from '../types';
import { buildActivityConditions } from '../utils';

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
  async (userId: string, options?: GetActivitiesOptions): Promise<Activity[]> => {
    try {
      const db = getDb();
      const { limit = 50, offset = 0 } = options || {};

      const conditions = buildActivityConditions(userId, options || {});
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
