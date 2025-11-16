import { activities } from '..';

/**
 * Field groups for selective loading
 * Use these to fetch only the data you need
 */
export const activityFields = {
  /**
   * Core fields - Always include these
   * Minimal set for list views and basic display
   */
  core: {
    id: activities.id,
    userId: activities.userId,
    stravaActivityId: activities.stravaActivityId,
    name: activities.name,
    type: activities.type,
    startDate: activities.startDate,
    createdAt: activities.createdAt,
  },

  /**
   * Basic metrics - Include for activity summaries
   * Common stats that most activities have
   */
  basicMetrics: {
    distance: activities.distance,
    movingTime: activities.movingTime,
    elapsedTime: activities.elapsedTime,
    totalElevationGain: activities.totalElevationGain,
    averageSpeed: activities.averageSpeed,
  },

  /**
   * Performance metrics - Include only when displaying detailed stats
   * Often NULL for activities without sensors
   */
  performanceMetrics: {
    maxSpeed: activities.maxSpeed,
    averageCadence: activities.averageCadence,
    averageHeartrate: activities.averageHeartrate,
    maxHeartrate: activities.maxHeartrate,
    calories: activities.calories,
  },

  /**
   * Location data - Include when showing map/location info
   */
  location: {
    startLatlng: activities.startLatlng,
    endLatlng: activities.endLatlng,
    locationCity: activities.locationCity,
    locationState: activities.locationState,
    locationCountry: activities.locationCountry,
  },

  /**
   * Extended data - Include only for detailed view
   * Includes description, timezone, flags
   */
  extended: {
    description: activities.description,
    sportType: activities.sportType,
    timezone: activities.timezone,
    isManual: activities.isManual,
    isPrivate: activities.isPrivate,
    elevHigh: activities.elevHigh,
    elevLow: activities.elevLow,
    metadata: activities.metadata,
    updatedAt: activities.updatedAt,
  },

  /**
   * Map data - Include ONLY when displaying map
   * These fields are large (2-10KB each) - load on demand
   */
  mapData: {
    mapPolyline: activities.mapPolyline,
    mapSummaryPolyline: activities.mapSummaryPolyline,
  },
} as const;

/**
 * Predefined field combinations for common use cases
 */
export const activityQueries = {
  /**
   * List view - Minimal data for activity lists
   * ~200 bytes per activity
   */
  list: {
    ...activityFields.core,
    ...activityFields.basicMetrics,
  },

  /**
   * Summary view - Good for cards and previews
   * ~300 bytes per activity
   */
  summary: {
    ...activityFields.core,
    ...activityFields.basicMetrics,
    description: activities.description,
    sportType: activities.sportType,
    locationCity: activities.locationCity,
    locationCountry: activities.locationCountry,
  },

  /**
   * Detail view - Everything except map data
   * ~500 bytes per activity
   */
  detail: {
    ...activityFields.core,
    ...activityFields.basicMetrics,
    ...activityFields.performanceMetrics,
    ...activityFields.location,
    ...activityFields.extended,
  },

  /**
   * Map view - Core + location + map data
   * ~2-10 KB per activity (due to polylines)
   */
  map: {
    ...activityFields.core,
    ...activityFields.location,
    ...activityFields.mapData,
  },

  /**
   * Statistics - Only fields needed for aggregations
   * ~150 bytes per activity
   */
  stats: {
    id: activities.id,
    userId: activities.userId,
    type: activities.type,
    startDate: activities.startDate,
    distance: activities.distance,
    movingTime: activities.movingTime,
    totalElevationGain: activities.totalElevationGain,
    averageSpeed: activities.averageSpeed,
  },
} as const;

/**
 * Helper type to extract the type from a field selection
 */
export type ActivityFieldSelection<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends { _: { data: infer D } } ? D : never;
};

/**
 * Type for list view query result
 */
export type ActivityListItem = ActivityFieldSelection<typeof activityQueries.list>;

/**
 * Type for summary view query result
 */
export type ActivitySummary = ActivityFieldSelection<typeof activityQueries.summary>;

/**
 * Type for detail view query result (full activity except maps)
 */
export type ActivityDetail = ActivityFieldSelection<typeof activityQueries.detail>;

/**
 * Type for map view query result
 */
export type ActivityMapData = ActivityFieldSelection<typeof activityQueries.map>;

/**
 * Type for stats query result
 */
export type ActivityStatsData = ActivityFieldSelection<typeof activityQueries.stats>;
