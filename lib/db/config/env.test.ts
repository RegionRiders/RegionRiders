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
      hasDatabaseConfig: true,
      source: 'postgres_env',
    });
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
