/**
 * Database Configuration Tests
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
  closePool,
  getDatabaseConfig,
  getDatabaseUrl,
  testConnection,
  validateDatabaseEnv,
} from './index';

describe('Database Configuration', () => {
  function resetDatabaseSslEnv(): void {
    delete process.env.POSTGRES_SSL;
    delete process.env.DATABASE_SSL;
    delete process.env.PGSSLMODE;
  }

  beforeAll(() => {
    const REQUIRED_ENV = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'regionriders',
      POSTGRES_USER: 'regionriders_user',
      POSTGRES_PASSWORD: 'regionriders_password',
    };

    Object.assign(process.env, REQUIRED_ENV);
  });

  afterAll(() => {
    const REQUIRED_ENV = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'regionriders',
      POSTGRES_USER: 'regionriders_user',
      POSTGRES_PASSWORD: 'regionriders_password',
    };

    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  describe('validateDatabaseEnv', () => {
    it('should pass validation with all required env vars', () => {
      resetDatabaseSslEnv();
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_DB = 'regionriders';
      process.env.POSTGRES_USER = 'regionriders_user';
      process.env.POSTGRES_PASSWORD = 'regionriders_password';

      expect(() => validateDatabaseEnv()).not.toThrow();
    });

    it('should fail validation when POSTGRES_HOST is missing', () => {
      resetDatabaseSslEnv();
      delete process.env.DATABASE_URL;
      delete process.env.POSTGRES_HOST;
      process.env.POSTGRES_DB = 'regionriders';
      process.env.POSTGRES_USER = 'regionriders_user';
      process.env.POSTGRES_PASSWORD = 'regionriders_password';

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_HOST/);
    });

    it('should fail validation when POSTGRES_DB is missing', () => {
      resetDatabaseSslEnv();
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_HOST = 'localhost';
      delete process.env.POSTGRES_DB;
      process.env.POSTGRES_USER = 'regionriders_user';
      process.env.POSTGRES_PASSWORD = 'regionriders_password';

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_DB/);
    });

    it('should fail validation when POSTGRES_USER is missing', () => {
      resetDatabaseSslEnv();
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_DB = 'regionriders';
      delete process.env.POSTGRES_USER;
      process.env.POSTGRES_PASSWORD = 'regionriders_password';

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_USER/);
    });

    it('should fail validation when POSTGRES_PASSWORD is missing', () => {
      resetDatabaseSslEnv();
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_DB = 'regionriders';
      process.env.POSTGRES_USER = 'regionriders_user';
      delete process.env.POSTGRES_PASSWORD;

      expect(() => validateDatabaseEnv()).toThrow(/POSTGRES_PASSWORD/);
    });
  });

  describe('getDatabaseConfig', () => {
    beforeEach(() => {
      resetDatabaseSslEnv();
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_PORT = '5432';
      process.env.POSTGRES_DB = 'regionriders';
      process.env.POSTGRES_USER = 'regionriders_user';
      process.env.POSTGRES_PASSWORD = 'regionriders_password';
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should return correct database configuration', () => {
      const config = getDatabaseConfig();

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('regionriders');
      expect(config.user).toBe('regionriders_user');
      expect(config.password).toBe('regionriders_password');
      expect(config.ssl).toBe(false);
    });

    it('should prefer DATABASE_URL over POSTGRES_* env vars', () => {
      process.env.DATABASE_URL =
        'postgres://dokku_user:secret-pass@dokku-postgres-rr-staging-db:5432/rr_staging_db';

      const config = getDatabaseConfig();

      expect(config.host).toBe('dokku-postgres-rr-staging-db');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('rr_staging_db');
      expect(config.user).toBe('dokku_user');
      expect(config.password).toBe('secret-pass');
      expect(config.ssl).toBe(false);
    });

    it('should disable SSL in production with localhost', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      process.env.POSTGRES_HOST = 'localhost';

      const config = getDatabaseConfig();

      expect(config.ssl).toBe(false);
    });

    it('should disable SSL in production for Dokku internal hosts', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      process.env.POSTGRES_HOST = 'dokku-postgres-rr-staging-db';

      const config = getDatabaseConfig();

      expect(config.ssl).toBe(false);
    });

    it('should enable SSL in production with remote host', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      process.env.POSTGRES_HOST = 'remote.example.com';

      const config = getDatabaseConfig();

      expect(config.ssl).toBe(true);
    });

    it('should allow explicit SSL override via POSTGRES_SSL', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      process.env.POSTGRES_SSL = 'true';
      process.env.POSTGRES_HOST = 'dokku-postgres-rr-staging-db';

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
      resetDatabaseSslEnv();
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_PORT = '5432';
      process.env.POSTGRES_DB = 'regionriders';
      process.env.POSTGRES_USER = 'regionriders_user';
      process.env.POSTGRES_PASSWORD = 'regionriders_password';
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });
    });

    it('should construct correct database URL', () => {
      const url = getDatabaseUrl();

      expect(url).toBe(
        'postgresql://regionriders_user:regionriders_password@localhost:5432/regionriders'
      );
    });

    it('should preserve DATABASE_URL connection details when available', () => {
      process.env.DATABASE_URL =
        'postgres://dokku_user:secret-pass@dokku-postgres-rr-staging-db:5432/rr_staging_db';

      const url = getDatabaseUrl();

      expect(url).toBe(
        'postgresql://dokku_user:secret-pass@dokku-postgres-rr-staging-db:5432/rr_staging_db'
      );
    });

    it('should include SSL parameter in production with remote host', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      process.env.POSTGRES_HOST = 'remotehost.example.com';

      const url = getDatabaseUrl();

      expect(url).toContain('?sslmode=require');
    });

    it('should omit SSL parameter for Dokku internal hosts in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true,
      });
      process.env.POSTGRES_HOST = 'dokku-postgres-rr-staging-db';

      const url = getDatabaseUrl();

      expect(url).not.toContain('?sslmode=require');
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
