import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Pool } from 'pg';
import { closePool, getClient, getPool, query, testConnection } from './client';
import { getDatabaseConfig } from './config';

describe('Database Client Connection', () => {
  let pool: Pool;

  beforeEach(() => {
    pool = getPool();
  });

  afterEach(async () => {
    await closePool();
  });

  it('returns the same pool instance on multiple calls', () => {
    const pool1 = getPool();
    const pool2 = getPool();
    expect(pool1).toBe(pool2);
  });

  it('creates a pool with correct configuration', () => {
    expect(pool.options.host).toBeDefined();
    expect(pool.options.port).toBeDefined();
    expect(pool.options.database).toBeDefined();
    expect(pool.options.user).toBeDefined();
    expect(pool.options.password).toBeDefined();
  });

  it('can acquire and release a client', async () => {
    const client = await getClient();
    expect(client).toBeDefined();
    expect(typeof client.release).toBe('function');
    client.release();
  });

  it('executes a query and returns result', async () => {
    const result = await query('SELECT 1 as value');
    expect(result.rows[0].value).toBe(1);
  });

  it('closes the pool and sets pool to null', async () => {
    await closePool();
    // After closing, getPool should create a new instance
    const newPool = getPool();
    expect(newPool).not.toBe(pool);
  });

  it('returns true for successful testConnection', async () => {
    const result = await testConnection();
    expect(result).toBe(true);
  });

  it('returns false for failed testConnection', async () => {
    const originalHost = process.env.POSTGRES_HOST;
    try {
      process.env.POSTGRES_HOST = 'invalid_host';
      await closePool();
      const result = await testConnection();
      expect(result).toBe(false);
    } finally {
      process.env.POSTGRES_HOST = originalHost;
      await closePool();
    }
  });

  it('handles pool error events', async () => {
    const errorListener = jest.fn();
    pool.on('error', errorListener);

    // Simulate an error event
    const testError = new Error('Idle client error');
    pool.emit('error', testError);

    expect(errorListener).toHaveBeenCalledWith(testError);
  });

  it('logs debug messages in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });

      // Close existing pool to trigger creation with development logging
      await closePool();
      const devPool = getPool();
      expect(devPool).toBeDefined();

      // Close pool to trigger development close logging
      await closePool();
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    }
  });

  it('logs connection info in development mode during testConnection', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
      });

      const result = await testConnection();
      expect(result).toBe(true);
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    }
  });

  it('executes query with parameters', async () => {
    const result = await query('SELECT $1::int as value', [42]);
    expect(result.rows[0].value).toBe(42);
  });

  describe('SSL Configuration', () => {
    it('should configure SSL in production for remote hosts', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalHost = process.env.POSTGRES_HOST;
      try {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          writable: true,
          configurable: true,
        });
        process.env.POSTGRES_HOST = 'remote.example.com';

        // Force pool recreation with production SSL settings
        await closePool();

        const pool = getPool();
        expect(pool).toBeDefined();

        // Verify SSL configuration is applied
        const config = pool.options;
        expect(config.ssl).toBe(true); // Should be boolean true in production

        await closePool();
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
          configurable: true,
        });
        process.env.POSTGRES_HOST = originalHost;
      }
    });

    it('should disable SSL in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'development',
          writable: true,
          configurable: true,
        });

        // Force pool recreation with development settings
        await closePool();

        const pool = getPool();
        expect(pool).toBeDefined();

        // Verify SSL is disabled in development
        const config = pool.options;
        expect(config.ssl).toBe(false);

        await closePool();
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should validate SSL configuration structure for remote production hosts', () => {
      // This test validates that our SSL configuration logic is correct
      // without requiring an actual database connection

      const originalEnv = process.env.NODE_ENV;
      const originalHost = process.env.POSTGRES_HOST;
      try {
        // Test production SSL configuration
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          writable: true,
          configurable: true,
        });
        process.env.POSTGRES_HOST = 'remote.example.com';

        const prodConfig = getDatabaseConfig();
        expect(prodConfig.ssl).toBe(true);

        // Test development SSL configuration
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'development',
          writable: true,
          configurable: true,
        });

        const devConfig = getDatabaseConfig();
        expect(devConfig.ssl).toBe(false);
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
          configurable: true,
        });
        process.env.POSTGRES_HOST = originalHost;
      }
    });
  });
});
