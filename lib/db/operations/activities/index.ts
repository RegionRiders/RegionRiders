/**
 * Activity Operations
 * Provides Create, Read, Update, Delete operations for activities (rides)
 *
 * This module is organized into:
 * - types/: Type definitions and interfaces
 * - queries/: Read operations (cached with React cache)
 * - mutations/: Write operations (create, update, delete)
 * - stats/: Statistical aggregations
 * - utils/: Shared utility functions
 */

// Type exports
export type {
  Activity,
  NewActivity,
  GetActivitiesOptions,
  ActivityStats,
  GetActivityStatsOptions,
  ActivityFilterOptions,
} from './types';

// Query operations
export {
  getActivityById,
  getActivityByStravaId,
  getActivitiesByUserId,
  getAllActivities,
} from './queries';

// Mutation operations
export {
  createActivity,
  updateActivity,
  deleteActivity,
  deleteActivitiesByUserId,
  findOrCreateActivity,
  bulkCreateActivities,
} from './mutations';

// Statistics operations
export { getActivityStats } from './stats';

// Utility functions
export { buildActivityConditions } from './utils';
