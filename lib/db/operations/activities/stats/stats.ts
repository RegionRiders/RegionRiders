/**
 * Activity Statistics Operations
 * Aggregated statistics and analytics for activities
 */

import { cache } from 'react';
import { and, sql } from 'drizzle-orm';
import { activities, getDb } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { ActivityStats, GetActivityStatsOptions } from '../types';
import { buildActivityConditions } from '../utils';

/**
 * Get activity statistics for a user
 * Cached for the duration of the request (React cache)
 */
export const getActivityStats = cache(
  async (userId: string, options?: GetActivityStatsOptions): Promise<ActivityStats> => {
    try {
      const db = getDb();

      const conditions = buildActivityConditions(userId, options || {});

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
