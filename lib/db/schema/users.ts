/**
 * Database Schema - Users AKA Athletes Table
 * Defines the users table structure using Drizzle ORM
 */

import { boolean, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  stravaId: varchar('strava_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  profilePicture: varchar('profile_picture', { length: 500 }),
  accessToken: varchar('access_token', { length: 255 }),
  refreshToken: varchar('refresh_token', { length: 255 }),
  tokenExpiresAt: timestamp('token_expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserUpdate = Partial<Omit<User, 'id' | 'createdAt'>>;
