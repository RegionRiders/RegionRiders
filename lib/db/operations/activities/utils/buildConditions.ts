/**
 * Activity Utilities
 * Shared utility functions for activity operations
 */

import { eq, gte, lte, SQL } from 'drizzle-orm';
import { activities } from '@/lib/db';
import type { ActivityFilterOptions } from '../types';

/**
 * Build activity filter conditions for Drizzle queries
 * @param userId - The user ID to filter by
 * @param options - Optional filtering parameters
 * @returns Array of SQL conditions
 */
export const buildActivityConditions = (
  userId: string,
  { startDate, endDate, type }: ActivityFilterOptions = {}
): SQL<unknown>[] => {
  const cond = [eq(activities.userId, userId)];

  if (startDate) {
    cond.push(gte(activities.startDate, startDate));
  }

  if (endDate) {
    cond.push(lte(activities.startDate, endDate));
  }

  if (type) {
    cond.push(eq(activities.type, type));
  }

  return cond;
};
