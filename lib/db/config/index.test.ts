import { describe, expect, it } from '@jest/globals';
import * as configExports from './index';

describe('Database Configuration Module Exports', () => {
  it('exports validateDatabaseEnv, getDatabaseConfig, getDatabaseUrl', () => {
    expect(typeof configExports.validateDatabaseEnv).toBe('function');
    expect(typeof configExports.getDatabaseConfig).toBe('function');
    expect(typeof configExports.getDatabaseUrl).toBe('function');
  });

  it('exports getPool, getClient, query, closePool, testConnection', () => {
    expect(typeof configExports.getPool).toBe('function');
    expect(typeof configExports.getClient).toBe('function');
    expect(typeof configExports.query).toBe('function');
    expect(typeof configExports.closePool).toBe('function');
    expect(typeof configExports.testConnection).toBe('function');
  });

  it('exports getDb', () => {
    expect(typeof configExports.getDb).toBe('function');
  });
});
