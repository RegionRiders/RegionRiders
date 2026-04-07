/**
 * @jest-environment <rootDir>/jest-environment-node-with-polyfills.cjs
 */

import { NextResponse } from 'next/server';
import { GET, HEAD } from './route';

const mockExecute = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: () => ({ execute: mockExecute }),
}));

jest.mock('drizzle-orm', () => ({
  sql: jest.fn((strings: TemplateStringsArray) => strings.join('')),
}));

describe('GET /api/health', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Set all required env vars
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_DB = 'testdb';
    process.env.POSTGRES_USER = 'user';
    process.env.POSTGRES_PASSWORD = 'password';
    process.env.OAUTH_ENCRYPTION_KEY = 'key';
    process.env.OAUTH_ENCRYPTION_SALT = 'salt';
    process.env.STRAVA_CLIENT_ID = 'client_id';
    process.env.STRAVA_CLIENT_SECRET = 'client_secret';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 200 with healthy status when DB is reachable', async () => {
    mockExecute.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('healthy');
    expect(data.checks.application).toBe('healthy');
    expect(data.timestamp).toBeDefined();
  });

  it('returns 503 with unhealthy status when DB throws', async () => {
    mockExecute.mockRejectedValue(new Error('Connection refused'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database).toBe('unhealthy');
  });

  it('returns 503 when required env vars are missing', async () => {
    mockExecute.mockResolvedValue([]);
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_SECRET;

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.application).toBe('unhealthy');
  });

  it('returns degraded when DB responds slowly', async () => {
    mockExecute.mockResolvedValue([]);
    const start = 1000;
    jest.spyOn(Date, 'now').mockReturnValueOnce(start).mockReturnValueOnce(start + 1500);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.checks.database).toBe('degraded');
    expect(data.status).toBe('degraded');

    jest.restoreAllMocks();
  });

  it('uses fallback version and environment when env vars are unset', async () => {
    mockExecute.mockResolvedValue([]);
    const savedVersion = process.env.npm_package_version;
    const savedNodeEnv = process.env.NODE_ENV;
    const mutableEnv = process.env as Record<string, string | undefined>;
    delete mutableEnv.npm_package_version;
    delete mutableEnv.NODE_ENV;

    const response = await GET();
    const data = await response.json();

    expect(data.version).toBe('1.0.0');
    expect(data.environment).toBe('development');

    if (savedVersion !== undefined) {
      mutableEnv.npm_package_version = savedVersion;
    }
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: savedNodeEnv,
      configurable: true,
    });
  });

  it('includes version and environment in response', async () => {
    mockExecute.mockResolvedValue([]);
    process.env.npm_package_version = '2.0.0';
    // NODE_ENV is always 'test' in Jest environment

    const response = await GET();
    const data = await response.json();

    expect(data.version).toBe('2.0.0');
    expect(data.environment).toBe('test');
  });
});

describe('HEAD /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when DB is reachable', async () => {
    mockExecute.mockResolvedValue([]);

    const response = await HEAD();

    expect(response.status).toBe(200);
    expect(response).toBeInstanceOf(NextResponse);
  });

  it('returns 503 when DB throws', async () => {
    mockExecute.mockRejectedValue(new Error('DB down'));

    const response = await HEAD();

    expect(response.status).toBe(503);
  });
});
