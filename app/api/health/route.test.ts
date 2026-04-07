/**
 * @jest-environment node
 */

import { GET, HEAD } from './route';

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

import { getDb } from '@/lib/db';

const mockExecute = jest.fn();

const setupDb = () => {
  (getDb as jest.Mock).mockReturnValue({ execute: mockExecute });
};

const setEnv = (vars: Record<string, string>) => {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
  }
};

const clearEnv = (...keys: string[]) => {
  for (const k of keys) {
    delete process.env[k];
  }
};

const REQUIRED_ENV = [
  'POSTGRES_HOST',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'OAUTH_ENCRYPTION_KEY',
  'OAUTH_ENCRYPTION_SALT',
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
];

beforeEach(() => {
  jest.clearAllMocks();
  // Set all required env vars by default
  setEnv({
    POSTGRES_HOST: 'localhost',
    POSTGRES_DB: 'regionriders',
    POSTGRES_USER: 'user',
    POSTGRES_PASSWORD: 'pass',
    OAUTH_ENCRYPTION_KEY: 'key',
    OAUTH_ENCRYPTION_SALT: 'salt',
    STRAVA_CLIENT_ID: '123',
    STRAVA_CLIENT_SECRET: 'secret',
  });
  setupDb();
});

afterEach(() => {
  clearEnv(...REQUIRED_ENV);
});

describe('GET /api/health', () => {
  it('returns 200 with healthy status when DB is reachable and all env vars are set', async () => {
    mockExecute.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.checks.database).toBe('healthy');
    expect(body.checks.application).toBe('healthy');
  });

  it('returns 503 with unhealthy status when DB throws', async () => {
    mockExecute.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.checks.database).toBe('unhealthy');
  });

  it('returns 503 with unhealthy status when required env vars are missing', async () => {
    mockExecute.mockResolvedValue([]);
    clearEnv('STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.checks.application).toBe('unhealthy');
  });

  it('includes timestamp and environment in the response', async () => {
    mockExecute.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('environment');
    expect(body).toHaveProperty('version');
  });
});

describe('HEAD /api/health', () => {
  it('returns 200 when DB is reachable', async () => {
    mockExecute.mockResolvedValue([]);

    const response = await HEAD();
    expect(response.status).toBe(200);
  });

  it('returns 503 when DB throws', async () => {
    mockExecute.mockRejectedValue(new Error('DB down'));

    const response = await HEAD();
    expect(response.status).toBe(503);
  });
});
