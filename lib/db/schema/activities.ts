/**
 * Database Schema - Activities Table
 * Defines the activities (rides) table structure using Drizzle ORM
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const activities = pgTable(
  'activities',
  {
    // Core identification
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    stravaActivityId: varchar('strava_activity_id', { length: 255 }).unique(),

    // Basic information (always required)
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // e.g., 'Ride', 'Run', 'Walk'
    startDate: timestamp('start_date').notNull(),

    // Optional metadata
    description: varchar('description', { length: 1000 }),
    sportType: varchar('sport_type', { length: 50 }), // More specific: 'MountainBikeRide', 'GravelRide'
    timezone: varchar('timezone', { length: 100 }),

    // Core metrics (commonly available)
    distance: real('distance'), // in meters
    movingTime: integer('moving_time'), // in seconds
    elapsedTime: integer('elapsed_time'), // in seconds
    totalElevationGain: real('total_elevation_gain'), // in meters
    averageSpeed: real('average_speed'), // in meters per second

    // Extended elevation data (less commonly used)
    elevHigh: real('elev_high'), // in meters - maximum elevation point
    elevLow: real('elev_low'), // in meters - minimum elevation point

    // Performance metrics (requires sensors - often NULL)
    maxSpeed: real('max_speed'), // in meters per second
    averageCadence: real('average_cadence'), // RPM - requires cadence sensor
    averageHeartrate: real('average_heartrate'), // BPM - requires heart rate monitor
    maxHeartrate: real('max_heartrate'), // BPM - requires heart rate monitor
    calories: real('calories'), // Calculated/estimated

    // Location data
    startLatlng: jsonb('start_latlng').$type<[number, number]>(), // [latitude, longitude]
    endLatlng: jsonb('end_latlng').$type<[number, number]>(), // Often NULL, can be derived
    locationCity: varchar('location_city', { length: 100 }), // Can be derived from coordinates
    locationState: varchar('location_state', { length: 100 }),
    locationCountry: varchar('location_country', { length: 100 }),

    // Activity flags
    isManual: boolean('is_manual').default(false).notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),

    // Map data (large - 2-10KB per activity, consider lazy loading)
    mapPolyline: varchar('map_polyline', { length: 10000 }), // Full resolution route
    mapSummaryPolyline: varchar('map_summary_polyline', { length: 2000 }), // Simplified route

    // Flexible storage for API-specific or future data
    metadata: jsonb('metadata').$type<Record<string, any>>(),

    // Audit timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('activities_user_id_idx').on(table.userId),
    stravaActivityIdIdx: index('activities_strava_activity_id_idx').on(table.stravaActivityId),
    startDateIdx: index('activities_start_date_idx').on(table.startDate),
    typeIdx: index('activities_type_idx').on(table.type),
  })
);

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type ActivityUpdate = Partial<Omit<Activity, 'id' | 'userId' | 'createdAt'>>;
