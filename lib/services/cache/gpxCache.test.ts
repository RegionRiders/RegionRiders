import { parseGPXFile } from '@/lib/utils/gpxParser';
import { GPXCache } from './gpxCache';

// Mock the parseGPXFile function
jest.mock('@/lib/utils/gpxParser', () => ({
  parseGPXFile: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockParseGPXFile = parseGPXFile as jest.MockedFunction<typeof parseGPXFile>;

describe('GPXCache', () => {
  let cache: GPXCache;

  const mockTrack = {
    id: 'test-track-1',
    name: 'Test Track',
    points: [
      { lat: 50.0, lon: 14.0, ele: 500, time: '2024-01-01T12:00:00Z' },
      { lat: 50.1, lon: 14.1, ele: 510, time: '2024-01-01T12:01:00Z' },
    ],
    metadata: {
      date: '2024-01-01T12:00:00Z',
      distance: 15.0,
    },
  };

  beforeEach(() => {
    cache = new GPXCache();
    jest.clearAllMocks();
    mockParseGPXFile.mockResolvedValue(mockTrack);
  });

  describe('loadTrack', () => {
    it('should load and cache a track', async () => {
      const fileName = 'test.gpx';

      const result = await cache.loadTrack(fileName);

      expect(result).toEqual(mockTrack);
      expect(mockParseGPXFile).toHaveBeenCalledWith('/data/gpx/test.gpx');
      expect(mockParseGPXFile).toHaveBeenCalledTimes(1);
    });

    it('should return cached track on subsequent calls', async () => {
      const fileName = 'test.gpx';

      const result1 = await cache.loadTrack(fileName);
      const result2 = await cache.loadTrack(fileName);

      expect(result1).toEqual(mockTrack);
      expect(result2).toEqual(mockTrack);
      expect(mockParseGPXFile).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent requests', async () => {
      const fileName = 'test.gpx';

      const promise1 = cache.loadTrack(fileName);
      const promise2 = cache.loadTrack(fileName);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockTrack);
      expect(result2).toEqual(mockTrack);
      expect(mockParseGPXFile).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and propagate them', async () => {
      const fileName = 'invalid.gpx';
      const error = new Error('Invalid GPX file');
      mockParseGPXFile.mockRejectedValueOnce(error);

      await expect(cache.loadTrack(fileName)).rejects.toThrow('Invalid GPX file');
    });

    it('should clean up loading promise after error', async () => {
      const fileName = 'invalid.gpx';
      const error = new Error('Parse error');
      mockParseGPXFile.mockRejectedValueOnce(error);

      await expect(cache.loadTrack(fileName)).rejects.toThrow();

      const stats = cache.getStats();
      expect(stats.loadingTracks).toBe(0);
    });

    it('should reload track after cache expiration', async () => {
      const fileName = 'test.gpx';

      // First load
      await cache.loadTrack(fileName);

      // Mock time passage beyond TTL
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 101 * 60 * 1000);

      // Second load should fetch again
      await cache.loadTrack(fileName);

      expect(mockParseGPXFile).toHaveBeenCalledTimes(2);

      Date.now = originalNow;
    });
  });

  describe('getStats', () => {
    it('should return correct cache statistics', async () => {
      const stats1 = cache.getStats();
      expect(stats1.cachedTracks).toBe(0);
      expect(stats1.loadingTracks).toBe(0);

      await cache.loadTrack('test1.gpx');

      const stats2 = cache.getStats();
      expect(stats2.cachedTracks).toBe(1);
      expect(stats2.loadingTracks).toBe(0);
    });

    it('should track loading state', async () => {
      let resolveLoad: any;
      mockParseGPXFile.mockImplementation(() => new Promise((resolve) => (resolveLoad = resolve)));

      const promise = cache.loadTrack('test.gpx');

      const stats = cache.getStats();
      expect(stats.loadingTracks).toBe(1);

      resolveLoad(mockTrack);
      await promise;

      const stats2 = cache.getStats();
      expect(stats2.loadingTracks).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all cached tracks', async () => {
      await cache.loadTrack('test1.gpx');
      await cache.loadTrack('test2.gpx');

      let stats = cache.getStats();
      expect(stats.cachedTracks).toBe(2);

      cache.clear();

      stats = cache.getStats();
      expect(stats.cachedTracks).toBe(0);
      expect(stats.loadingTracks).toBe(0);
    });

    it('should clear loading promises', async () => {
      mockParseGPXFile.mockImplementation(() => new Promise(() => {}));
    });

    describe('Cache expiration', () => {
      it('should serve cached track within TTL', async () => {
        const fileName = 'test.gpx';

        await cache.loadTrack(fileName);

        // Mock time passage within TTL
        const originalNow = Date.now;
        Date.now = jest.fn(() => originalNow() + 50 * 60 * 1000);

        await cache.loadTrack(fileName);

        expect(mockParseGPXFile).toHaveBeenCalledTimes(1);

        Date.now = originalNow;
      });
    });
  });
});
