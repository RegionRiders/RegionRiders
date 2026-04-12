import { getDb } from '@/lib/db';
import { GET, HEAD } from './route';

// Mock the database module
jest.mock('@/lib/db', () => ({
  getDb: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
const originalEnv = { ...process.env };

describe('Health API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Test environment variables
    process.env.POSTGRES_HOST = 'localhost';
    process.env.POSTGRES_DB = 'test_db';
    process.env.POSTGRES_USER = 'test_user';
    process.env.POSTGRES_PASSWORD = 'test_password';
    process.env.OAUTH_ENCRYPTION_KEY = 'test_key';
    process.env.OAUTH_ENCRYPTION_SALT = 'test_salt';
    process.env.STRAVA_CLIENT_ID = 'test_id';
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      mockGetDb.mockReturnValue({
        execute: jest.fn().mockResolvedValue([{ health_check: 1 }]),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.checks.database).toBe('healthy');
      expect(data.checks.application).toBe('healthy');
    });

    it('should return unhealthy when database connection fails', async () => {
      mockGetDb.mockReturnValue({
        execute: jest.fn().mockRejectedValue(new Error('Connection failed')),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.checks.database).toBe('unhealthy');
    });

    it('should include timestamp and version', async () => {
      mockGetDb.mockReturnValue({
        execute: jest.fn().mockResolvedValue([]),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(data.version).toBeDefined();
      expect(data.environment).toBeDefined();
    });

    it('should return unhealthy when required env vars are missing', async () => {
      delete process.env.POSTGRES_HOST;

      mockGetDb.mockReturnValue({
        execute: jest.fn().mockResolvedValue([]),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.checks.application).toBe('unhealthy');
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 when database is connected', async () => {
      mockGetDb.mockReturnValue({
        execute: jest.fn().mockResolvedValue([]),
      } as any);

      const response = await HEAD();

      expect(response.status).toBe(200);
    });

    it('should return 503 when database connection fails', async () => {
      mockGetDb.mockReturnValue({
        execute: jest.fn().mockRejectedValue(new Error('Connection failed')),
      } as any);

      const response = await HEAD();

      expect(response.status).toBe(503);
    });
  });
});
