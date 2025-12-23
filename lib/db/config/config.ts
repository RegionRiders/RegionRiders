/**
 * Database Environment Configuration
 * Validates and provides database connection settings
 */

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
  const required = ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}\n` +
        'Please check your .env.local file and ensure all database variables are set.'
    );
  }
}

/**
 * Gets the database configuration from environment variables
 * @returns {DatabaseConfig} Database configuration object
 */
export function getDatabaseConfig(): DatabaseConfig {
  validateDatabaseEnv();

  const host = process.env.POSTGRES_HOST!;

  // SSL is enabled in production, disabled otherwise
  // This provides encryption for production deployments while keeping local development simple
  const ssl = process.env.NODE_ENV === 'production';

  return {
    host,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB!,
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
    ssl,
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
