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
});
