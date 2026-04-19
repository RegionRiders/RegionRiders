import { describe, expect, it } from '@jest/globals';
import { hasDatabaseEnv, resolveDatabaseEnv } from './env';

function createProcessEnv(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    ...overrides,
  };
}

describe('database env resolver', () => {
  it('prefers DATABASE_URL when available', () => {
    const env = createProcessEnv({
      DATABASE_URL:
        'postgres://dokku_user:secret-pass@dokku-postgres-rr-staging-db:5432/rr_staging_db',
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'regionriders',
      POSTGRES_USER: 'regionriders_user',
      POSTGRES_PASSWORD: 'regionriders_password',
    });

    expect(resolveDatabaseEnv(env)).toEqual({
      host: 'dokku-postgres-rr-staging-db',
      port: 5432,
      database: 'rr_staging_db',
      user: 'dokku_user',
      password: 'secret-pass',
      ssl: false,
      hasDatabaseConfig: true,
      source: 'database_url',
    });
  });

  it('falls back to POSTGRES_* env vars', () => {
    const env = createProcessEnv({
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_DB: 'regionriders',
      POSTGRES_USER: 'regionriders_user',
      POSTGRES_PASSWORD: 'regionriders_password',
    });

    expect(resolveDatabaseEnv(env)).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'regionriders',
      user: 'regionriders_user',
      password: 'regionriders_password',
      ssl: false,
      hasDatabaseConfig: true,
      source: 'postgres_env',
    });
  });

  it('disables SSL for Dokku internal DATABASE_URL hosts in production', () => {
    const env = createProcessEnv({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgres://dokku_user:secret-pass@dokku-postgres-rr-staging-db:5432/rr_staging_db',
    });

    expect(resolveDatabaseEnv(env).ssl).toBe(false);
  });

  it('enables SSL for remote DATABASE_URL hosts in production', () => {
    const env = createProcessEnv({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgres://dokku_user:secret-pass@remote-postgres.example.com:5432/rr_staging_db',
    });

    expect(resolveDatabaseEnv(env).ssl).toBe(true);
  });

  it('allows explicit SSL override via POSTGRES_SSL', () => {
    const env = createProcessEnv({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgres://dokku_user:secret-pass@dokku-postgres-rr-staging-db:5432/rr_staging_db',
      POSTGRES_SSL: 'true',
    });

    expect(resolveDatabaseEnv(env).ssl).toBe(true);
  });

  it('honors sslmode from DATABASE_URL', () => {
    const disabledSslEnv = createProcessEnv({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgres://dokku_user:secret-pass@remote-postgres.example.com:5432/rr_staging_db?sslmode=disable',
    });
    const requiredSslEnv = createProcessEnv({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgres://dokku_user:secret-pass@remote-postgres.example.com:5432/rr_staging_db?sslmode=require',
    });

    expect(resolveDatabaseEnv(disabledSslEnv).ssl).toBe(false);
    expect(resolveDatabaseEnv(requiredSslEnv).ssl).toBe(true);
  });

  it('allows POSTGRES_SSL to override sslmode from DATABASE_URL', () => {
    const env = createProcessEnv({
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgres://dokku_user:secret-pass@remote-postgres.example.com:5432/rr_staging_db?sslmode=disable',
      POSTGRES_SSL: 'true',
    });

    expect(resolveDatabaseEnv(env).ssl).toBe(true);
  });

  it('reports malformed DATABASE_URL as invalid database env', () => {
    const env = createProcessEnv({
      DATABASE_URL: 'not-a-postgres-url',
    });

    expect(hasDatabaseEnv(env)).toBe(false);
    expect(() => resolveDatabaseEnv(env)).toThrow(/Invalid DATABASE_URL/);
  });

  it('rejects invalid POSTGRES_PORT values', () => {
    const env = createProcessEnv({
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432abc',
      POSTGRES_DB: 'regionriders',
      POSTGRES_USER: 'regionriders_user',
      POSTGRES_PASSWORD: 'regionriders_password',
    });

    expect(hasDatabaseEnv(env)).toBe(false);
    expect(() => resolveDatabaseEnv(env)).toThrow(/Invalid POSTGRES_PORT/);
  });

  it('reports missing DB env when neither DATABASE_URL nor POSTGRES_* is complete', () => {
    const env = createProcessEnv({
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'regionriders',
    });

    expect(hasDatabaseEnv(env)).toBe(false);
    expect(() => resolveDatabaseEnv(env)).toThrow(
      /Configure DATABASE_URL or provide the required POSTGRES_\* variables/
    );
  });
});
