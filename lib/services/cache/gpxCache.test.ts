import { GPXCache } from './gpxCache';
import { parseGPXFile } from '@/lib/utils/gpxParser';
import { GPXTrack } from '@/lib/types/types';

// Mock dependencies
jest.mock('@/lib/utils/gpxParser');
jest.mock('@/lib/utils/logger', () => ({
  default: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GPXCache', () => {
  let cache: GPXCache;

  const mockTrack: GPXTrack = {
    id: 'test-id',
    name: 'Test Track',
    points: [
      { lat: 50.0, lon: 20.0, ele: 100 },
      { lat: 50.1, lon: 20.1, ele: 110 },
    ],
    metadata: { distance: 15000 },
  };

  beforeEach(() => {
    cache = new GPXCache();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cache.clear();
    jest.useRealTimers();
  });

  describe('loadTrack', () => {
    it('should load and cache a track', async () => {
      (parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

      const result = await cache.loadTrack('test.gpx');

      expect(result).toEqual(mockTrack);
      expect(parseGPXFile).toHaveBeenCalledWith('/data/gpx/test.gpx');
    });

    it('should return cached track on subsequent calls', async () => {
      (parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

      await cache.loadTrack('test.gpx');
      const result = await cache.loadTrack('test.gpx');

      expect(result).toEqual(mockTrack);
      expect(parseGPXFile).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent requests for same file', async () => {
      (parseGPXFile as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockTrack), 100))
      );

      const promise1 = cache.loadTrack('test.gpx');
      const promise2 = cache.loadTrack('test.gpx');

      jest.advanceTimersByTime(100);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockTrack);
      expect(result2).toEqual(mockTrack);
      expect(parseGPXFile).toHaveBeenCalledTimes(1);
    });

    it('should expire cached tracks after TTL', async () => {
      (parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

      await cache.loadTrack('test.gpx');

      // Advance time beyond TTL (100 minutes)
      jest.advanceTimersByTime(101 * 60 * 1000);

      await cache.loadTrack('test.gpx');

      expect(parseGPXFile).toHaveBeenCalledTimes(2);
    });

    it('should handle parsing errors', async () => {
      const error = new Error('Parse error');
      (parseGPXFile as jest.Mock).mockRejectedValue(error);

      await expect(cache.loadTrack('invalid.gpx')).rejects.toThrow('Parse error');
    });

    it('should remove loading promise after completion', async () => {
      (parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

      await cache.loadTrack('test.gpx');

      const stats = cache.getStats();
      expect(stats.loadingTracks).toBe(0);
    });

    it('should remove loading promise after error', async () => {
      (parseGPXFile as jest.Mock).mockRejectedValue(new Error('Error'));

      try {
        await cache.loadTrack('test.gpx');
      } catch (e) {
        // Expected
      }

      const stats = cache.getStats();
      expect(stats.loadingTracks).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      (parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

      await cache.loadTrack('test1.gpx');
      await cache.loadTrack('test2.gpx');

      const stats = cache.getStats();

      expect(stats.cachedTracks).toBe(2);
      expect(stats.loadingTracks).toBe(0);
    });

    it('should track loading promises', async () => {
      (parseGPXFile as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockTrack), 1000))
      );

      cache.loadTrack('test.gpx');

      const stats = cache.getStats();
      expect(stats.loadingTracks).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all cached tracks', async () => {
      (parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

      await cache.loadTrack('test.gpx');
      cache.clear();

      const stats = cache.getStats();
      expect(stats.cachedTracks).toBe(0);
    });

    it('should clear loading promises', async () => {
      (parseGPXFile as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockTrack), 1000))
      );

      cache.loadTrack('test.gpx');
      cache.clear();

      const stats = cache.getStats();
      expect(stats.loadingTracks).toBe(0);
    });
  });
});