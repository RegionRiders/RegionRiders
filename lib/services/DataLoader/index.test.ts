import { DataLoader } from './index';
import { GPXLoader } from './gpxLoader';
import { RegionLoader } from './RegionLoader';

// Mock the loaders
jest.mock('./gpxLoader');
jest.mock('./RegionLoader');

describe('DataLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadGPXTracks', () => {
    it('should delegate to GPXLoader with default parameters', async () => {
      const mockTracks = new Map();
      (GPXLoader.loadTracks as jest.Mock).mockResolvedValue(mockTracks);

      const result = await DataLoader.loadGPXTracks();

      expect(GPXLoader.loadTracks).toHaveBeenCalledWith('api', undefined);
      expect(result).toBe(mockTracks);
    });

    it('should pass source and files to GPXLoader', async () => {
      const mockTracks = new Map();
      const files = ['test.gpx'];
      (GPXLoader.loadTracks as jest.Mock).mockResolvedValue(mockTracks);

      await DataLoader.loadGPXTracks('local', files);

      expect(GPXLoader.loadTracks).toHaveBeenCalledWith('local', files);
    });
  });

  describe('loadRegions', () => {
    it('should delegate to RegionLoader with no parameters', async () => {
      const mockRegions = [];
      (RegionLoader.loadRegions as jest.Mock).mockResolvedValue(mockRegions);

      const result = await DataLoader.loadRegions();

      expect(RegionLoader.loadRegions).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toBe(mockRegions);
    });

    it('should pass bounds and countries to RegionLoader', async () => {
      const mockRegions = [];
      const bounds = { north: 52, south: 49, east: 22, west: 19 };
      const countries = ['PL', 'DE'];
      (RegionLoader.loadRegions as jest.Mock).mockResolvedValue(mockRegions);

      await DataLoader.loadRegions(bounds, countries);

      expect(RegionLoader.loadRegions).toHaveBeenCalledWith(bounds, countries);
    });
  });

  describe('clearCache', () => {
    it('should clear both GPX and Region caches', () => {
      (GPXLoader.clearCache as jest.Mock).mockImplementation(() => {});
      (RegionLoader.clearCache as jest.Mock).mockImplementation(() => {});

      DataLoader.clearCache();

      expect(GPXLoader.clearCache).toHaveBeenCalled();
      expect(RegionLoader.clearCache).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics from GPXLoader', () => {
      const mockStats = { cachedTracks: 5, loadingTracks: 2 };
      (GPXLoader.getCacheStats as jest.Mock).mockReturnValue(mockStats);

      const result = DataLoader.getCacheStats();

      expect(result).toEqual({ gpx: mockStats });
      expect(GPXLoader.getCacheStats).toHaveBeenCalled();
    });
  });
});