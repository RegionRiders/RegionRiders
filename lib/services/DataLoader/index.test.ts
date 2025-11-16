import { DataLoader } from './index';
import { GPXLoader } from './gpxLoader';
import { RegionLoader } from './RegionLoader';

// Mock the loaders
jest.mock('./gpxLoader');
jest.mock('./RegionLoader');

describe('DataLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (GPXLoader.loadTracks as jest.Mock).mockResolvedValue(new Map());
    (GPXLoader.clearCache as jest.Mock).mockImplementation(() => {});
    (GPXLoader.getCacheStats as jest.Mock).mockReturnValue({
      cachedTracks: 0,
      loadingTracks: 0,
    });

    (RegionLoader.loadRegions as jest.Mock).mockResolvedValue([]);
    (RegionLoader.clearCache as jest.Mock).mockImplementation(() => {});
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

  describe('loadRegions', () => {
    it('should load regions using RegionLoader without filters', async () => {
      await DataLoader.loadRegions();

      expect(RegionLoader.loadRegions).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should load regions with bounds filter', async () => {
      const bounds = {
        north: 51.0,
        south: 50.0,
        east: 15.0,
        west: 14.0,
      };

      await DataLoader.loadRegions(bounds);

      expect(RegionLoader.loadRegions).toHaveBeenCalledWith(bounds, undefined);
    });

    it('should load regions with countries filter', async () => {
      const countries = ['PL', 'DE'];

      await DataLoader.loadRegions(undefined, countries);

      expect(RegionLoader.loadRegions).toHaveBeenCalledWith(undefined, countries);
    });

    it('should load regions with both bounds and countries filters', async () => {
      const bounds = {
        north: 51.0,
        south: 50.0,
        east: 15.0,
        west: 14.0,
      };
      const countries = ['PL'];

      await DataLoader.loadRegions(bounds, countries);

      expect(RegionLoader.loadRegions).toHaveBeenCalledWith(bounds, countries);
    });

    it('should return an array of regions', async () => {
      const mockRegions = [
        {
          id: 'region1',
          name: 'Region 1',
          country: 'PL',
          adminLevel: 4,
          geometry: {} as any,
          properties: {},
        },
      ];

      (RegionLoader.loadRegions as jest.Mock).mockResolvedValue(mockRegions);

      const result = await DataLoader.loadRegions();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe('clearCache', () => {
    it('should clear both GPX and Region caches', () => {
      DataLoader.clearCache();

      expect(GPXLoader.clearCache).toHaveBeenCalled();
      expect(RegionLoader.clearCache).toHaveBeenCalled();
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
