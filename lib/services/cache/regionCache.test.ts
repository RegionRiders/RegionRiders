import { RegionCache, CountryData } from './regionCache';
import { Regions } from '@/lib/types/types';

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RegionCache', () => {
  let cache: RegionCache;

  const mockCountry: CountryData = {
    code: 'PL',
    name: 'Poland',
    fileName: 'poland.geojson',
  };

  const mockGeoJSON = {
    features: [
      {
        id: 'region-1',
        properties: {
          name: 'Mazowieckie',
          country_code: 'PL',
          admin_level: 4,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[20, 50], [21, 50], [21, 51], [20, 51], [20, 50]]],
        },
      },
      {
        id: 'region-2',
        properties: {
          name: 'Śląskie',
          country_code: 'PL',
          admin_level: 4,
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[18, 49], [19, 49], [19, 50], [18, 50], [18, 49]]]],
        },
      },
    ],
  };

  beforeEach(() => {
    cache = new RegionCache();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cache.clear();
    jest.useRealTimers();
  });

  describe('loadCountryRegions', () => {
    it('should load and parse country regions', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGeoJSON,
      });

      const result = await cache.loadCountryRegions(mockCountry);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'region-1',
        name: 'Mazowieckie',
        country: 'PL',
        adminLevel: 4,
      });
      expect(fetch).toHaveBeenCalledWith('/data/regions/poland.geojson');
    });

    it('should cache regions and return cached data on subsequent calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGeoJSON,
      });

      await cache.loadCountryRegions(mockCountry);
      const result = await cache.loadCountryRegions(mockCountry);

      expect(result).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent requests', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockGeoJSON,
                }),
              100
            )
          )
      );

      const promise1 = cache.loadCountryRegions(mockCountry);
      const promise2 = cache.loadCountryRegions(mockCountry);

      jest.advanceTimersByTime(100);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(result2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after TTL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGeoJSON,
      });

      await cache.loadCountryRegions(mockCountry);

      // Advance time beyond TTL (100 minutes)
      jest.advanceTimersByTime(101 * 60 * 1000);

      await cache.loadCountryRegions(mockCountry);

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle HTTP errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await cache.loadCountryRegions(mockCountry);

      expect(result).toEqual([]);
    });

    it('should return cached data on HTTP error if available', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGeoJSON,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      await cache.loadCountryRegions(mockCountry);

      // Expire cache
      jest.advanceTimersByTime(101 * 60 * 1000);

      const result = await cache.loadCountryRegions(mockCountry);

      expect(result).toHaveLength(2);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await cache.loadCountryRegions(mockCountry);

      expect(result).toEqual([]);
    });

    it('should handle features without properties', async () => {
      const geoJSONNoProps = {
        features: [
          {
            id: 'region-1',
            geometry: {
              type: 'Polygon',
              coordinates: [[[20, 50], [21, 50], [21, 51], [20, 51], [20, 50]]],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => geoJSONNoProps,
      });

      const result = await cache.loadCountryRegions(mockCountry);

      expect(result[0]).toMatchObject({
        id: 'region-1',
        name: 'Unknown',
        country: '',
        adminLevel: 0,
      });
    });
  });

  describe('clear', () => {
    it('should clear all cached data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGeoJSON,
      });

      await cache.loadCountryRegions(mockCountry);
      cache.clear();

      await cache.loadCountryRegions(mockCountry);

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});