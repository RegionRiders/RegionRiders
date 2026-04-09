import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull(),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    coverActivityId: uuid('cover_activity_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('trips_user_id_idx').on(table.userId),
    index('trips_user_id_status_idx').on(table.userId, table.status),
    index('trips_start_date_idx').on(table.startDate),
    index('trips_end_date_idx').on(table.endDate),
  ]
);

export const tripDays = pgTable(
  'trip_days',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .references(() => trips.id, { onDelete: 'cascade' })
      .notNull(),
    dayDate: date('day_date', { mode: 'string' }).notNull(),
    title: varchar('title', { length: 255 }),
    summary: varchar('summary', { length: 500 }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('trip_days_trip_id_idx').on(table.tripId),
    unique('trip_days_trip_id_day_date_unique').on(table.tripId, table.dayDate),
  ]
);

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripUpdate = Partial<Omit<Trip, 'id' | 'userId' | 'createdAt'>>;

export type TripDay = typeof tripDays.$inferSelect;
export type NewTripDay = typeof tripDays.$inferInsert;
export type TripDayUpdate = Partial<Omit<TripDay, 'id' | 'tripId' | 'createdAt'>>;
