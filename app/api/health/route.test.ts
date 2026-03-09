/**
 * Health Route API Tests
 * Tests for the health check endpoint
 */

import { getDb } from '@/lib/db';
import { GET, HEAD } from './route';

// Mock the database module
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe('Health API Route', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables for each test
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_DB = 'test';
    process.env.POSTGRES_USER = 'test';
    process.env.POSTGRES_PASSWORD = 'test';
    process.env.OAUTH_ENCRYPTION_KEY = 'test-key';
    process.env.OAUTH_ENCRYPTION_SALT = 'test-salt';
    process.env.STRAVA_CLIENT_ID = 'test-id';
    process.env.STRAVA_CLIENT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe('GET /api/health', () => {
    it('returns 200 and healthy status when database is available', async () => {
      const mockDb = {
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.database).toBe('healthy');
      expect(data.checks.application).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.environment).toBe('test');
    });

    it('includes version in response', async () => {
      const mockDb = {
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
    });

    it('returns 503 and unhealthy status when database fails', async () => {
      const mockDb = {
        execute: jest.fn().mockRejectedValue(new Error('Connection failed')),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database).toBe('unhealthy');
    });

    it('returns degraded status when database is slow', async () => {
      // Mock a slow database response
      const mockDb = {
        execute: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            // Simulate slow response by waiting 1100ms
            setTimeout(() => resolve([{ health_check: 1 }]), 1100);
          });
        }),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.checks.database).toBe('degraded');
    }, 10000);

    it('returns 503 when required environment variables are missing', async () => {
      // Remove a required env var
      delete process.env.POSTGRES_HOST;

      const mockDb = {
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.application).toBe('unhealthy');
    });

    it('returns 503 when multiple required env vars are missing', async () => {
      delete process.env.POSTGRES_DB;
      delete process.env.STRAVA_CLIENT_ID;

      const mockDb = {
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
    });

    it('returns correct timestamp format (ISO 8601)', async () => {
      const mockDb = {
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await GET();
      const data = await response.json();

      // ISO 8601 format check
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });

  describe('HEAD /api/health', () => {
    it('returns 200 when database is available', async () => {
      const mockDb = {
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await HEAD();

      expect(response.status).toBe(200);
    });

    it('returns 503 when database fails', async () => {
      const mockDb = {
        execute: jest.fn().mockRejectedValue(new Error('Connection timeout')),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await HEAD();

      expect(response.status).toBe(503);
    });

    it('returns empty body', async () => {
      const mockDb = {
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      };
      mockGetDb.mockReturnValue(mockDb as unknown as ReturnType<typeof getDb>);

      const response = await HEAD();

      // HEAD requests should have no body
      expect(response.body).toBeNull();
    });
  });
});
