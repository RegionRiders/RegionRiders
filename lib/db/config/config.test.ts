/**
 * Database Configuration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  closePool,
  getDatabaseConfig,
  getDatabaseUrl,
  testConnection,
  validateDatabaseEnv,
} from './index';

describe('Database Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateDatabaseEnv', () => {
    it('should pass validation with all required env vars', () => {
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_DB = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';

      expect(() => validateDatabaseEnv()).not.toThrow();
    });

    it('should fail validation when POSTGRES_HOST is missing', () => {
      delete process.env.POSTGRES_HOST;
      process.env.POSTGRES_DB = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_HOST/);
    });

    it('should fail validation when POSTGRES_DB is missing', () => {
      process.env.POSTGRES_HOST = 'localhost';
      delete process.env.POSTGRES_DB;
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_DB/);
    });

    it('should fail validation when POSTGRES_USER is missing', () => {
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_DB = 'testdb';
      delete process.env.POSTGRES_USER;
      process.env.POSTGRES_PASSWORD = 'testpass';

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_USER/);
    });

    it('should fail validation when POSTGRES_PASSWORD is missing', () => {
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_DB = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      delete process.env.POSTGRES_PASSWORD;

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_PASSWORD/);
    });
  });

  describe('getDatabaseConfig', () => {
    beforeEach(() => {
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_PORT = '5432';
      process.env.POSTGRES_DB = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';
      Object.assign(process.env, { NODE_ENV: 'development' });
    });

    it('should return correct database configuration', () => {
      const config = getDatabaseConfig();

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('testdb');
      expect(config.user).toBe('testuser');
      expect(config.password).toBe('testpass');
      expect(config.ssl).toBe(false); // development mode
    });

    it('should enable SSL in production', () => {
      Object.assign(process.env, { NODE_ENV: 'production' });

      const config = getDatabaseConfig();

      expect(config.ssl).toBe(true);
    });

    it('should use default port when not specified', () => {
      delete process.env.POSTGRES_PORT;

      const config = getDatabaseConfig();

      expect(config.port).toBe(5432);
    });

    it('should use default connection pool settings', () => {
      const config = getDatabaseConfig();

      expect(config.maxConnections).toBe(20);
      expect(config.idleTimeoutMillis).toBe(30000);
      expect(config.connectionTimeoutMillis).toBe(10000);
    });

    it('should use custom connection pool settings when provided', () => {
      process.env.DB_MAX_CONNECTIONS = '50';
      process.env.DB_IDLE_TIMEOUT = '60000';
      process.env.DB_CONNECTION_TIMEOUT = '20000';

      const config = getDatabaseConfig();

      expect(config.maxConnections).toBe(50);
      expect(config.idleTimeoutMillis).toBe(60000);
      expect(config.connectionTimeoutMillis).toBe(20000);
    });
  });

  describe('getDatabaseUrl', () => {
    beforeEach(() => {
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_PORT = '5432';
      process.env.POSTGRES_DB = 'testdb';
      process.env.POSTGRES_USER = 'testuser';
      process.env.POSTGRES_PASSWORD = 'testpass';
      Object.assign(process.env, { NODE_ENV: 'development' });
    });

    it('should construct correct database URL', () => {
      const url = getDatabaseUrl();

      expect(url).toBe('postgresql://testuser:testpass@localhost:5432/testdb');
    });

    it('should use DATABASE_URL env var when provided', () => {
      const customUrl = 'postgresql://custom:pass@custom-host:5433/customdb';
      process.env.DATABASE_URL = customUrl;

      const url = getDatabaseUrl();

      expect(url).toBe(customUrl);
    });

    it('should include SSL parameter in production', () => {
      Object.assign(process.env, { NODE_ENV: 'production' });

      const url = getDatabaseUrl();

      expect(url).toContain('?sslmode=require');
    });
  });

  describe('testConnection', () => {
    it('should test database connection', async () => {
      // This test requires actual database connection
      // Skip in CI/CD if database is not available
      if (!process.env.POSTGRES_HOST) {
        return;
      }

      const result = await testConnection();

      expect(typeof result).toBe('boolean');

      await closePool();
    }, 10000); // 10 second timeout for connection test
  });
});
