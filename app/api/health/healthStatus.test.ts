/**
 * @jest-environment node
 */

import { getDb } from '@/lib/db';
import { evaluateHealthStatus } from './healthStatus';

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

describe('evaluateHealthStatus', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      POSTGRES_HOST: 'localhost',
      POSTGRES_DB: 'regionriders',
      POSTGRES_USER: 'regionriders_user',
      POSTGRES_PASSWORD: 'secret',
      OAUTH_ENCRYPTION_KEY: 'key',
      OAUTH_ENCRYPTION_SALT: 'salt',
    };

    (getDb as jest.Mock).mockReturnValue({
      execute: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not require Strava env to report healthy application status', async () => {
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_SECRET;
    delete process.env.STRAVA_CLIENT_ACCESS_TOKEN;
    delete process.env.STRAVA_REDIRECT_URI;

    const { report, statusCode } = await evaluateHealthStatus();

    expect(statusCode).toBe(200);
    expect(report.status).toBe('healthy');
    expect(report.checks.application).toBe('healthy');
  });

  it('returns unhealthy when required database env is missing', async () => {
    delete process.env.POSTGRES_PASSWORD;

    const { report, statusCode } = await evaluateHealthStatus();

    expect(statusCode).toBe(503);
    expect(report.status).toBe('unhealthy');
    expect(report.checks.application).toBe('unhealthy');
  });

  it('returns unhealthy when encryption env is missing', async () => {
    delete process.env.OAUTH_ENCRYPTION_KEY;

    const { report, statusCode } = await evaluateHealthStatus();

    expect(statusCode).toBe(503);
    expect(report.status).toBe('unhealthy');
    expect(report.checks.application).toBe('unhealthy');
  });
});
