import { GPXLoader } from './gpxLoader';
import { DataLoader } from './index';

jest.mock('./gpxLoader');

describe('DataLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (GPXLoader.loadTracks as jest.Mock).mockResolvedValue(new Map());
    (GPXLoader.clearCache as jest.Mock).mockImplementation(() => {});
    (GPXLoader.getCacheStats as jest.Mock).mockReturnValue({
      cachedTracks: 0,
      loadingTracks: 0,
    });
  });

  describe('loadGPXTracks', () => {
    it('should load tracks using GPXLoader with default source', async () => {
      await DataLoader.loadGPXTracks();

      expect(GPXLoader.loadTracks).toHaveBeenCalledWith('api', undefined);
    });

    it('should load tracks from local source', async () => {
      await DataLoader.loadGPXTracks('local');

      expect(GPXLoader.loadTracks).toHaveBeenCalledWith('local', undefined);
    });

    it('should load tracks from API source', async () => {
      await DataLoader.loadGPXTracks('api');

      expect(GPXLoader.loadTracks).toHaveBeenCalledWith('api', undefined);
    });

    it('should pass files to GPXLoader', async () => {
      const files = ['track1.gpx', 'track2.gpx'];

      await DataLoader.loadGPXTracks('local', files);

      expect(GPXLoader.loadTracks).toHaveBeenCalledWith('local', files);
    });

    it('should return a Map of tracks', async () => {
      const mockTracks = new Map([
        [
          'track1',
          {
            id: 'track1',
            name: 'Track 1',
            points: [],
            metadata: { distance: 10 },
          },
        ],
      ]);

      (GPXLoader.loadTracks as jest.Mock).mockResolvedValue(mockTracks);

      const result = await DataLoader.loadGPXTracks('local');

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
    });
  });

  describe('clearCache', () => {
    it('should clear GPX cache', () => {
      DataLoader.clearCache();

      expect(GPXLoader.clearCache).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return GPX cache statistics', () => {
      const mockStats = { cachedTracks: 5, loadingTracks: 2 };
      (GPXLoader.getCacheStats as jest.Mock).mockReturnValue(mockStats);

      const result = DataLoader.getCacheStats();

      expect(result).toHaveProperty('gpx');
      expect(result.gpx).toEqual(mockStats);
    });
  });
});
