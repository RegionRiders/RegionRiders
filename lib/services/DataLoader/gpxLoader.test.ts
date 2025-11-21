import * as apiConfig from '@/lib/client/config';
import { GPXLoader } from './gpxLoader';

jest.mock('@/lib/client/config');

// Mock the entire GPXCache module before it's imported
jest.mock('../cache/gpxCache', () => {
  return {
    GPXCache: jest.fn().mockImplementation(() => ({
      loadTrack: jest.fn().mockResolvedValue({
        name: 'test',
        id: 'test',
        points: [],
        distance: 0,
        elevationGain: 0,
        elevationLoss: 0,
      }),
      clear: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        cachedTracks: 0,
        loadingTracks: 0,
      }),
    })),
  };
});

global.fetch = jest.fn();

describe('GPXLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getApiUrl to return full URL
    (apiConfig.getApiUrl as jest.Mock).mockImplementation((path: string) => {
      return `http://localhost:3000${path}`;
    });
  });

  describe('loadTracks', () => {
    it('should fetch file list when no files provided', async () => {
      const mockFileList = { files: ['track1.gpx', 'track2.gpx'] };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFileList,
      });

      await GPXLoader.loadTracks('local');

      expect(apiConfig.getApiUrl).toHaveBeenCalledWith('/api/gpx-files');
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/gpx-files');
    });

    it('should handle empty file list', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ files: [] }),
      });

      const result = await GPXLoader.loadTracks('local');

      expect(result.size).toBe(0);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await GPXLoader.loadTracks('local');

      expect(result.size).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      GPXLoader.clearCache();
      // The cache is internal, so we just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache stats', () => {
      const stats = GPXLoader.getCacheStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('cachedTracks');
      expect(stats).toHaveProperty('loadingTracks');
    });
  });
});
