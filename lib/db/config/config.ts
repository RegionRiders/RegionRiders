/**
 * Database Environment Configuration
 * Validates and provides database connection settings
 */

import { resolveDatabaseEnv } from './env';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Validates database environment variables
 * @throws {Error} if required environment variables are missing
 */
export function validateDatabaseEnv(): void {
  resolveDatabaseEnv();
}

/**
 * Gets the database configuration from environment variables
 * @returns {DatabaseConfig} Database configuration object
 */
export function getDatabaseConfig(): DatabaseConfig {
  const resolvedEnv = resolveDatabaseEnv();

  // The ssl field follows resolvedEnv.ssl, which is derived from explicit overrides,
  // sslmode hints, environment, and host classification such as local or Dokku-internal hosts.
  return {
    host: resolvedEnv.host,
    port: resolvedEnv.port,
    database: resolvedEnv.database,
    user: resolvedEnv.user,
    password: resolvedEnv.password,
    ssl: resolvedEnv.ssl,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10),
  };
}

/**
 * Gets the database connection URL
 * @returns {string} PostgreSQL connection URL
 */
export function getDatabaseUrl(): string {
  const config = getDatabaseConfig();
  const credentials = `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}`;
  const location = `${config.host}:${config.port}`;
  const sslParam = config.ssl ? '?sslmode=require' : '';

  return `postgresql://${credentials}@${location}/${config.database}${sslParam}`;
}
