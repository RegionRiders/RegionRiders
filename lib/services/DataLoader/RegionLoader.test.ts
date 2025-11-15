import { RegionLoader } from './RegionLoader';
import { RegionCache } from '../cache/regionCache';
import { BoundsChecker } from '../geometry/boundsChecker';
import { countryConfig } from '../config/countryConfig';
import { Regions } from '@/lib/types/types';

// Mock dependencies
jest.mock('../cache/regionCache');
jest.mock('../geometry/boundsChecker');
jest.mock('@/lib/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RegionLoader', () => {
  let mockCache: jest.Mocked<RegionCache>;
  let mockBoundsChecker: jest.Mocked<BoundsChecker>;

  const createMockRegion = (id: string): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'PL',
    geometry: {
      type: 'Polygon',
      coordinates: [[[20, 50], [21, 50], [21, 51], [20, 51], [20, 50]]],
    },
    properties: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = new RegionCache() as jest.Mocked<RegionCache>;
    mockBoundsChecker = new BoundsChecker() as jest.Mocked<BoundsChecker>;
    (RegionCache as jest.Mock).mockImplementation(() => mockCache);
    (BoundsChecker as jest.Mock).mockImplementation(() => mockBoundsChecker);
  });

  afterEach(() => {
    RegionLoader.clearCache();
  });

  describe('loadRegions', () => {
    it('should load all regions when no filters provided', async () => {
      const mockRegions = [createMockRegion('1'), createMockRegion('2')];
      mockCache.loadCountryRegions = jest.fn().mockResolvedValue(mockRegions);

      const result = await RegionLoader.loadRegions();

      expect(result.length).toBeGreaterThan(0);
      expect(mockCache.loadCountryRegions).toHaveBeenCalled();
    });

    it('should filter regions by country codes', async () => {
      const plRegions = [createMockRegion('pl-1')];
      const deRegions = [createMockRegion('de-1')];

      mockCache.loadCountryRegions = jest
        .fn()
        .mockImplementation((country) => {
          if (country.code === 'PL') return Promise.resolve(plRegions);
          if (country.code === 'DE') return Promise.resolve(deRegions);
          return Promise.resolve([]);
        });

      const result = await RegionLoader.loadRegions(undefined, ['PL', 'DE']);

      expect(result.length).toBe(2);
      expect(result).toEqual(expect.arrayContaining(plRegions));
      expect(result).toEqual(expect.arrayContaining(deRegions));
    });

    it('should filter regions by bounds', async () => {
      const mockRegions = [createMockRegion('1'), createMockRegion('2')];
      mockCache.loadCountryRegions = jest.fn().mockResolvedValue(mockRegions);

      const bounds = {
        north: 52,
        south: 49,
        east: 22,
        west: 19,
      };

      mockBoundsChecker.isInBounds = jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = await RegionLoader.loadRegions(bounds);

      expect(result.length).toBe(1);
      expect(mockBoundsChecker.isInBounds).toHaveBeenCalledTimes(2);
    });

    it('should handle loading errors for individual countries', async () => {
      mockCache.loadCountryRegions = jest
        .fn()
        .mockResolvedValueOnce([createMockRegion('1')])
        .mockRejectedValueOnce(new Error('Load error'));

      const result = await RegionLoader.loadRegions(undefined, ['PL', 'SK']);

      expect(result.length).toBe(1);
      expect(mockCache.loadCountryRegions).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no matching countries found', async () => {
      const result = await RegionLoader.loadRegions(undefined, ['XX']);

      expect(result).toEqual([]);
    });

    it('should handle general errors gracefully', async () => {
      mockCache.loadCountryRegions = jest.fn().mockRejectedValue(new Error('Fatal error'));

      const result = await RegionLoader.loadRegions();

      expect(result).toEqual([]);
    });

    it('should combine regions from multiple countries', async () => {
      const plRegions = [createMockRegion('pl-1'), createMockRegion('pl-2')];
      const skRegions = [createMockRegion('sk-1')];

      mockCache.loadCountryRegions = jest
        .fn()
        .mockResolvedValueOnce(plRegions)
        .mockResolvedValueOnce(skRegions);

      const result = await RegionLoader.loadRegions(undefined, ['PL', 'SK']);

      expect(result.length).toBe(3);
    });
  });

  describe('clearCache', () => {
    it('should clear both cache and bounds checker', () => {
      mockCache.clear = jest.fn();
      mockBoundsChecker.clearCache = jest.fn();

      RegionLoader.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockBoundsChecker.clearCache).toHaveBeenCalled();
    });
  });
});