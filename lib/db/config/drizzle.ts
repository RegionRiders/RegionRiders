/**
 * Drizzle ORM Database Instance
 * Provides type-safe database access using Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { getPool } from './client';

/**
 * Creates and returns a Drizzle database instance
 * @returns Drizzle database instance with schema
 */
export function getDb() {
  const pool = getPool();
  return drizzle(pool, { schema });
}

export type DbType = ReturnType<typeof getDb>;
