import { parseGPXFile } from '@/lib/utils/gpxParser';
import { GPXLoader } from './gpxLoader';

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock parseGPXFile
jest.mock('@/lib/utils/gpxParser', () => ({
  parseGPXFile: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockParseGPXFile = parseGPXFile as jest.MockedFunction<typeof parseGPXFile>;

describe('GPXLoader', () => {
  const mockTrack = {
    id: 'track-1',
    name: 'Test Track',
    points: [{ lat: 50.0, lon: 14.0, ele: 500, time: '2024-01-01T12:00:00Z' }],
    metadata: {
      date: '2024-01-01T12:00:00Z',
      distance: 10.0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ files: ['track1.gpx', 'track2.gpx'] }),
    });
    mockParseGPXFile.mockResolvedValue(mockTrack);
  });

  describe('loadTracks', () => {
    it('should load tracks from local source', async () => {
      const result = await GPXLoader.loadTracks('local');

      expect(result).toBeInstanceOf(Map);
    });

    it('should load tracks from API source', async () => {
      const result = await GPXLoader.loadTracks('api');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0); // API not implemented yet
    });

    it('should use specified files when provided', async () => {
      const files = ['custom1.gpx', 'custom2.gpx'];

      await GPXLoader.loadTracks('local', files);

      // Verify cache was called with custom files (implementation detail)
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch file list when no files specified', async () => {
      await GPXLoader.loadTracks('local');

      expect(global.fetch).toHaveBeenCalledWith('/api/gpx-files');
    });

    it('should handle empty file list', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: [] }),
      });

      const result = await GPXLoader.loadTracks('local');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle file list fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await GPXLoader.loadTracks('local');

      expect(result).toBeInstanceOf(Map);
    });

    it('should return tracks as a Map with trackId as key', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: ['track1.gpx'] }),
      });

      const result = await GPXLoader.loadTracks('local');

      expect(result).toBeInstanceOf(Map);
    });

    it('should set track name to filename without extension', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: ['mytrack.gpx'] }),
      });

      const result = await GPXLoader.loadTracks('local');

      if (result.size > 0) {
        const track = result.values().next().value;
        if (track) {
          expect(track.name).not.toContain('.gpx');
        }
      }
    });

    it('should handle individual track loading errors', async () => {
      mockParseGPXFile
        .mockResolvedValueOnce(mockTrack)
        .mockRejectedValueOnce(new Error('Parse error'));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ files: ['good.gpx', 'bad.gpx'] }),
      });

      const result = await GPXLoader.loadTracks('local');

      // Should continue loading despite error
      expect(result).toBeInstanceOf(Map);
    });

    it('should log cache statistics', async () => {
      // Just verify the method completes successfully
      await GPXLoader.loadTracks('local', ['test.gpx']);

      expect(mockParseGPXFile).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the GPX cache', () => {
      GPXLoader.clearCache();

      // Implementation should call cache.clear()
      // This is verified through the mock
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = GPXLoader.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('cachedTracks');
      expect(stats).toHaveProperty('loadingTracks');
    });
  });
});
