import { GPXLoader } from './gpxLoader';
import { GPXCache } from '../cache/gpxCache';
import { GPXTrack } from '@/lib/types/types';

// Mock dependencies
jest.mock('../cache/gpxCache');
jest.mock('@/lib/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('GPXLoader', () => {
  let mockCache: jest.Mocked<GPXCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = new GPXCache() as jest.Mocked<GPXCache>;
    (GPXCache as jest.Mock).mockImplementation(() => mockCache);
  });

  afterEach(() => {
    GPXLoader.clearCache();
  });

  describe('loadTracks', () => {
    it('should load tracks from local source by default files list', async () => {
      const mockFiles = ['route1.gpx', 'route2.gpx'];
      const mockTrack: GPXTrack = {
        id: 'test-id',
        name: 'Test Track',
        points: [{ lat: 50.0, lon: 20.0 }],
        metadata: { distance: 100 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: mockFiles }),
      });

      mockCache.loadTrack = jest.fn().mockResolvedValue(mockTrack);

      const result = await GPXLoader.loadTracks('local');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(mockCache.loadTrack).toHaveBeenCalledTimes(2);
    });

    it('should load specific files when provided', async () => {
      const mockFiles = ['specific.gpx'];
      const mockTrack: GPXTrack = {
        id: 'test-id',
        name: 'Specific Track',
        points: [{ lat: 51.0, lon: 21.0 }],
        metadata: { distance: 200 },
      };

      mockCache.loadTrack = jest.fn().mockResolvedValue(mockTrack);

      const result = await GPXLoader.loadTracks('local', mockFiles);

      expect(result.size).toBe(1);
      expect(result.get('specific')).toBeDefined();
      expect(result.get('specific')?.name).toBe('specific');
      expect(mockCache.loadTrack).toHaveBeenCalledWith('specific.gpx');
    });

    it('should handle loading errors gracefully', async () => {
      const mockFiles = ['good.gpx', 'bad.gpx'];
      const mockTrack: GPXTrack = {
        id: 'good-id',
        name: 'Good Track',
        points: [{ lat: 50.0, lon: 20.0 }],
        metadata: { distance: 100 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: mockFiles }),
      });

      mockCache.loadTrack = jest
        .fn()
        .mockResolvedValueOnce(mockTrack)
        .mockRejectedValueOnce(new Error('Parse error'));

      const result = await GPXLoader.loadTracks('local');

      expect(result.size).toBe(1);
      expect(result.get('good')).toBeDefined();
      expect(result.get('bad')).toBeUndefined();
    });

    it('should return empty map for API source (not implemented)', async () => {
      const result = await GPXLoader.loadTracks('api');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle empty file list', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: [] }),
      });

      const result = await GPXLoader.loadTracks('local');

      expect(result.size).toBe(0);
    });

    it('should handle fetch errors when getting file list', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await GPXLoader.loadTracks('local');

      expect(result.size).toBe(0);
    });

    it('should set track ID and name from filename', async () => {
      const mockFiles = ['test_route.gpx'];
      const mockTrack: GPXTrack = {
        id: 'original-id',
        name: 'Original Name',
        points: [{ lat: 50.0, lon: 20.0 }],
        metadata: { distance: 100 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: mockFiles }),
      });

      mockCache.loadTrack = jest.fn().mockResolvedValue(mockTrack);

      const result = await GPXLoader.loadTracks('local');

      const track = result.get('test_route');
      expect(track?.id).toBe('test_route');
      expect(track?.name).toBe('test_route');
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      mockCache.clear = jest.fn();
      GPXLoader.clearCache();
      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const mockStats = { cachedTracks: 5, loadingTracks: 2 };
      mockCache.getStats = jest.fn().mockReturnValue(mockStats);

      const stats = GPXLoader.getCacheStats();

      expect(stats).toEqual(mockStats);
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });
});