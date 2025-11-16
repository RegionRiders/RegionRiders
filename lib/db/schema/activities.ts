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
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    stravaActivityId: varchar('strava_activity_id', { length: 255 }).unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    type: varchar('type', { length: 50 }).notNull(), // e.g., 'Ride', 'Run', 'Walk'
    sportType: varchar('sport_type', { length: 50 }), // e.g., 'MountainBikeRide', 'GravelRide'

    // Distance and duration
    distance: real('distance'), // in meters
    movingTime: integer('moving_time'), // in seconds
    elapsedTime: integer('elapsed_time'), // in seconds

    // Elevation
    totalElevationGain: real('total_elevation_gain'), // in meters
    elevHigh: real('elev_high'), // in meters
    elevLow: real('elev_low'), // in meters

    // Performance metrics
    averageSpeed: real('average_speed'), // in meters per second
    maxSpeed: real('max_speed'), // in meters per second
    averageCadence: real('average_cadence'),
    averageHeartrate: real('average_heartrate'),
    maxHeartrate: real('max_heartrate'),
    calories: real('calories'),

    // Location
    startLatlng: jsonb('start_latlng').$type<[number, number]>(),
    endLatlng: jsonb('end_latlng').$type<[number, number]>(),
    locationCity: varchar('location_city', { length: 100 }),
    locationState: varchar('location_state', { length: 100 }),
    locationCountry: varchar('location_country', { length: 100 }),

    // Activity metadata
    startDate: timestamp('start_date').notNull(),
    timezone: varchar('timezone', { length: 100 }),
    isManual: boolean('is_manual').default(false),
    isPrivate: boolean('is_private').default(false),

    // Map and summary
    mapPolyline: varchar('map_polyline', { length: 10000 }),
    mapSummaryPolyline: varchar('map_summary_polyline', { length: 2000 }),

    // Additional data
    metadata: jsonb('metadata').$type<Record<string, any>>(),

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
