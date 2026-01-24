/**
 * Database Schema - Users AKA Athletes Table
 * Defines the users table structure using Drizzle ORM
 */

import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stravaId: varchar('strava_id', { length: 50 }).unique(), // these aren't notNull because system is designed to allow users be created before completing oauth
    email: varchar('email', { length: 255 }).unique(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    profilePicture: text('profile_picture'), // URLs might be long, use text
    accessToken: text('access_token'), // these tokens too
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_strava_id_idx').on(table.stravaId),
    index('users_is_active_idx').on(table.isActive),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserUpdate = Partial<Omit<User, 'id' | 'createdAt'>>;
