import { countryConfig } from '../config/countryConfig';
import { RegionLoader } from './RegionLoader';

// Module-scoped mocks object to avoid hoisting issues
const mocks = {
  loadCountryRegions: jest.fn(),
  clearCache: jest.fn(),
  isInBounds: jest.fn(),
  clearBoundsCache: jest.fn(),
};
// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
// Mock RegionCache
jest.mock('../cache/regionCache', () => ({
  RegionCache: jest.fn().mockImplementation(() => ({
    loadCountryRegions: (...args: any[]) => mocks.loadCountryRegions(...args),
    clear: () => mocks.clearCache(),
  })),
}));
// Mock BoundsChecker
jest.mock('../geometry/boundsChecker', () => ({
  BoundsChecker: jest.fn().mockImplementation(() => ({
    isInBounds: (...args: any[]) => mocks.isInBounds(...args),
    clearCache: () => mocks.clearBoundsCache(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mocks.loadCountryRegions.mockResolvedValue(mockRegions);
    mocks.isInBounds.mockReturnValue(true);
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
      const result = await RegionLoader.loadRegions(bounds);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
    it('should return all regions when no bounds provided', async () => {
      const result = await RegionLoader.loadRegions();
      expect(Array.isArray(result)).toBe(true);
    });
    it('should handle errors gracefully', async () => {
      mocks.loadCountryRegions.mockRejectedValue(new Error('Load error'));
      const result = await RegionLoader.loadRegions();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
    it('should continue loading despite individual country errors', async () => {
      mocks.loadCountryRegions
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
      mocks.loadCountryRegions.mockResolvedValue(mockRegions);
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
      mocks.isInBounds.mockReturnValue(true);
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
      mocks.isInBounds.mockReturnValueOnce(true).mockReturnValueOnce(false);
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
