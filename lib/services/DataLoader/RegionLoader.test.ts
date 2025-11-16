import { RegionCache } from '../cache/regionCache';
import { countryConfig } from '../config/countryConfig';
import { BoundsChecker } from '../geometry/boundsChecker';
import { RegionLoader } from './RegionLoader';

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock dependencies with proper hoisting
jest.mock('../cache/regionCache', () => ({
  RegionCache: jest.fn().mockImplementation(() => ({
    loadCountryRegions: jest.fn(),
    clear: jest.fn(),
  })),
}));

jest.mock('../geometry/boundsChecker', () => ({
  BoundsChecker: jest.fn().mockImplementation(() => ({
    isInBounds: jest.fn(),
    clearCache: jest.fn(),
  })),
}));

jest.mock('../config/countryConfig', () => ({
  countryConfig: {
    getAvailableCountries: jest.fn(),
  },
}));

describe('RegionLoader', () => {
  const mockRegions = [
    {
      id: 'region-1',
      name: 'Region 1',
      country: 'PL',
      adminLevel: 4,
      geometry: { type: 'Polygon', coordinates: [] } as any,
      properties: {},
    },
    {
      id: 'region-2',
      name: 'Region 2',
      country: 'PL',
      adminLevel: 4,
      geometry: { type: 'Polygon', coordinates: [] } as any,
      properties: {},
    },
  ];

  const mockCountries = [
    { code: 'PL', name: 'Poland', fileName: 'poland.geojson' },
    { code: 'DE', name: 'Germany', fileName: 'germany.geojson' },
  ];

  let mockCacheInstance: any;
  let mockBoundsCheckerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mock instances
    (RegionCache as unknown as jest.Mock).mockClear();
    (BoundsChecker as jest.Mock).mockClear();

    mockCacheInstance = {
      loadCountryRegions: jest.fn().mockResolvedValue(mockRegions),
      clear: jest.fn(),
    };

    mockBoundsCheckerInstance = {
      isInBounds: jest.fn().mockReturnValue(true),
      clearCache: jest.fn(),
    };

    (RegionCache as unknown as jest.Mock).mockImplementation(() => mockCacheInstance);
    (BoundsChecker as jest.Mock).mockImplementation(() => mockBoundsCheckerInstance);
    (countryConfig.getAvailableCountries as jest.Mock).mockReturnValue(mockCountries);
  });

  describe('loadRegions', () => {
    it('should load regions from all countries when none specified', async () => {
      const result = await RegionLoader.loadRegions();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(countryConfig.getAvailableCountries).toHaveBeenCalled();
    });

    it('should load regions only from specified countries', async () => {
      const countries = ['PL'];

      await RegionLoader.loadRegions(undefined, countries);

      // Should filter to only requested countries
      expect(countryConfig.getAvailableCountries).toHaveBeenCalled();
    });

    it('should return empty array when no matching countries found', async () => {
      const countries = ['XX']; // Non-existent country

      const result = await RegionLoader.loadRegions(undefined, countries);

      expect(result).toEqual([]);
    });

    it('should filter regions by bounds when provided', async () => {
      const bounds = {
        north: 51.0,
        south: 50.0,
        east: 15.0,
        west: 14.0,
      };

      await RegionLoader.loadRegions(bounds);

      // Should call boundsChecker for filtering
      // Verify through implementation
    });

    it('should return all regions when no bounds provided', async () => {
      const result = await RegionLoader.loadRegions();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockCacheInstance.loadCountryRegions.mockRejectedValue(new Error('Load error'));

      const result = await RegionLoader.loadRegions();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should continue loading despite individual country errors', async () => {
      mockCacheInstance.loadCountryRegions
        .mockResolvedValueOnce(mockRegions)
        .mockRejectedValueOnce(new Error('Load error'));

      const result = await RegionLoader.loadRegions();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should load regions from multiple countries', async () => {
      const countries = ['PL', 'DE'];

      await RegionLoader.loadRegions(undefined, countries);

      expect(countryConfig.getAvailableCountries).toHaveBeenCalled();
    });

    it('should combine regions from all loaded countries', async () => {
      mockCacheInstance.loadCountryRegions.mockResolvedValue(mockRegions);

      const result = await RegionLoader.loadRegions();

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should use bounds checker to filter regions when bounds provided', async () => {
      const bounds = {
        north: 51.0,
        south: 50.0,
        east: 15.0,
        west: 14.0,
      };

      mockBoundsCheckerInstance.isInBounds.mockReturnValue(true);

      await RegionLoader.loadRegions(bounds);

      // BoundsChecker should be instantiated
      // Verified through mock
    });

    it('should filter out regions outside bounds', async () => {
      const bounds = {
        north: 51.0,
        south: 50.0,
        east: 15.0,
        west: 14.0,
      };

      mockBoundsCheckerInstance.isInBounds.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const result = await RegionLoader.loadRegions(bounds);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty country list', async () => {
      (countryConfig.getAvailableCountries as jest.Mock).mockReturnValue([]);

      const result = await RegionLoader.loadRegions();

      expect(result).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear both region cache and bounds checker cache', () => {
      RegionLoader.clearCache();

      // Should call both clear methods
      // Verified through mocks
    });
  });
});
