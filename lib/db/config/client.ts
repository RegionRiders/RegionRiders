/**
 * Database Client Connection
 * Provides a singleton PostgreSQL connection pool using node-postgres
 *
 * Note: This uses the Node.js runtime and is not compatible with Edge runtime.
 * For Edge runtime compatibility, use a different database adapter.
 */

import { Pool, type PoolClient } from 'pg';
import { logger } from '@/lib/logger';
import { getDatabaseConfig } from './config';

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Gets or creates a PostgreSQL connection pool
 * Uses singleton pattern to ensure only one pool exists per process
 * @returns {Pool} PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const config = getDatabaseConfig();

  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    ssl: config.ssl
      ? {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        }
      : false,
  });

  pool.on('error', (err: Error) => {
    logger.error({ error: err }, 'Unexpected error on idle PostgreSQL client');
  });

  if (process.env.NODE_ENV === 'development') {
    logger.debug('PostgreSQL connection pool created');
  }

  return pool;
}

/**
 * Gets a client from the pool for transactions
 * Remember to call client.release() when done
 * @returns {Promise<PoolClient>} Database client
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   // Your queries here
 *   await client.query('COMMIT');
 * } catch (e) {
 *   await client.query('ROLLBACK');
 *   throw e;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Executes a query using the connection pool
 * @param text SQL query text
 * @param params Query parameters (use parameterized queries to prevent SQL injection)
 * @returns Query result
 */
export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}

/**
 * Closes the database connection pool
 * Should be called when shutting down the application
 * In Next.js, this is typically not needed as the process manages cleanup
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;

    if (process.env.NODE_ENV === 'development') {
      logger.debug('PostgreSQL connection pool closed');
    }
  }
}

/**
 * Tests the database connection
 * Useful for health checks and startup validation
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now, version() as version');

    if (process.env.NODE_ENV === 'development') {
      console.log('Database connection successful:', {
        timestamp: result.rows[0].now,
        version: result.rows[0].version.split(' ')[0], // Just the version number
      });
    }

    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
