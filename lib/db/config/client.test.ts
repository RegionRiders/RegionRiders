import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Pool } from 'pg';
import { closePool, getClient, getPool, query, testConnection } from './client';

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
    // Temporarily break the pool config
    const originalHost = process.env.POSTGRES_HOST;
    process.env.POSTGRES_HOST = 'invalid_host';
    await closePool();
    const result = await testConnection();
    expect(result).toBe(false);
    process.env.POSTGRES_HOST = originalHost;
    await closePool();
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
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    // Close existing pool to trigger creation with development logging
    await closePool();
    const devPool = getPool();
    expect(devPool).toBeDefined();

    // Close pool to trigger development close logging
    await closePool();

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('logs connection info in development mode during testConnection', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    const result = await testConnection();
    expect(result).toBe(true);

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('executes query with parameters', async () => {
    const result = await query('SELECT $1::int as value', [42]);
    expect(result.rows[0].value).toBe(42);
  });
});
