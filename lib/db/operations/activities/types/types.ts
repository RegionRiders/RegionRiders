/**
 * Activity Types
 * Type definitions for activity operations
 */
export type { Activity, NewActivity } from '../../../schema/activities';

/**
 * Activity query options
 */
export interface GetActivitiesOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  type?: string;
}

/**
 * Activity statistics interface
 */
export interface ActivityStats {
  totalActivities: number;
  totalDistance: number;
  totalMovingTime: number;
  totalElevationGain: number;
  averageDistance: number;
  averageSpeed: number;
}

/**
 * Activity statistics query options
 */
export interface GetActivityStatsOptions {
  startDate?: Date;
  endDate?: Date;
  type?: string;
}

/**
 * Activity filter options for building query conditions
 */
export interface ActivityFilterOptions {
  startDate?: Date;
  endDate?: Date;
  type?: string;
}
