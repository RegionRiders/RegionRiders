import { CountryData, RegionCache } from './regionCache';

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('RegionCache', () => {
  let cache: RegionCache;

  const mockCountryData: CountryData = {
    code: 'PL',
    name: 'Poland',
    fileName: 'poland.geojson',
  };

  const mockGeoJSON = {
    features: [
      {
        id: 'region-1',
        properties: {
          name: 'Test Region 1',
          country_code: 'PL',
          admin_level: 4,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [14.0, 50.0],
              [15.0, 50.0],
              [15.0, 51.0],
              [14.0, 51.0],
              [14.0, 50.0],
            ],
          ],
        },
      },
      {
        id: 'region-2',
        properties: {
          name: 'Test Region 2',
          country_code: 'PL',
          admin_level: 4,
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [16.0, 52.0],
                [17.0, 52.0],
                [17.0, 53.0],
                [16.0, 53.0],
                [16.0, 52.0],
              ],
            ],
          ],
        },
      },
    ],
  };

  beforeEach(() => {
    cache = new RegionCache();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGeoJSON,
    });
  });

  describe('loadCountryRegions', () => {
    it('should load and cache country regions', async () => {
      const result = await cache.loadCountryRegions(mockCountryData);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('region-1');
      expect(result[0].name).toBe('Test Region 1');
      expect(result[0].country).toBe('PL');
      expect(result[0].geometry).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith('/data/regions/poland.geojson');
    });

    it('should return cached regions on subsequent calls', async () => {
      const result1 = await cache.loadCountryRegions(mockCountryData);
      const result2 = await cache.loadCountryRegions(mockCountryData);

      expect(result1).toEqual(result2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent requests', async () => {
      const promise1 = cache.loadCountryRegions(mockCountryData);
      const promise2 = cache.loadCountryRegions(mockCountryData);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(result2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await cache.loadCountryRegions(mockCountryData);

      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await cache.loadCountryRegions(mockCountryData);

      expect(result).toEqual([]);
    });

    it('should parse GeoJSON features correctly', async () => {
      const result = await cache.loadCountryRegions(mockCountryData);

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('country');
      expect(result[0]).toHaveProperty('adminLevel');
      expect(result[0]).toHaveProperty('geometry');
      expect(result[0]).toHaveProperty('properties');
    });

    it('should handle missing properties in GeoJSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              id: 'region-minimal',
              geometry: { type: 'Polygon', coordinates: [] },
            },
          ],
        }),
      });

      const result = await cache.loadCountryRegions(mockCountryData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Unknown');
      expect(result[0].country).toBe('');
    });

    it('should reload after cache expiration', async () => {
      await cache.loadCountryRegions(mockCountryData);

      // Mock time passage beyond TTL
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 101 * 60 * 1000);

      await cache.loadCountryRegions(mockCountryData);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      Date.now = originalNow;
    });

    it('should serve cached data within TTL', async () => {
      await cache.loadCountryRegions(mockCountryData);

      // Mock time passage within TTL
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 50 * 60 * 1000);

      await cache.loadCountryRegions(mockCountryData);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      Date.now = originalNow;
    });

    it('should return cached data on error if available', async () => {
      // First successful load
      await cache.loadCountryRegions(mockCountryData);

      // Expire cache
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 101 * 60 * 1000);

      // Second load fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await cache.loadCountryRegions(mockCountryData);

      // Should return previously cached data
      expect(result).toHaveLength(2);

      Date.now = originalNow;
    });
  });

  describe('clear', () => {
    it('should clear all cached country data', async () => {
      await cache.loadCountryRegions(mockCountryData);

      cache.clear();

      // After clear, should fetch again
      await cache.loadCountryRegions(mockCountryData);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear loading promises', async () => {
      let resolveLoad: any;
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => (resolveLoad = resolve))
      );

      cache.loadCountryRegions(mockCountryData);

      cache.clear();

      // After clear, new request should create new promise
      const promise = cache.loadCountryRegions(mockCountryData);

      resolveLoad({ ok: true, json: async () => mockGeoJSON });
      await promise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should correctly parse and assign adminLevel from GeoJSON', async () => {
      const result = await cache.loadCountryRegions(mockCountryData);

      expect(result[0].adminLevel).toBe(4);
      expect(result[1].adminLevel).toBe(4);
      expect(typeof result[0].adminLevel).toBe('number');
    });

    it('should default adminLevel to 0 when missing from properties', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            {
              id: 'region-no-admin-level',
              properties: {
                name: 'Test Region',
                country_code: 'PL',
              },
              geometry: { type: 'Polygon', coordinates: [] },
            },
          ],
        }),
      });

      const result = await cache.loadCountryRegions(mockCountryData);

      expect(result).toHaveLength(1);
      expect(result[0].adminLevel).toBe(0);
      expect(typeof result[0].adminLevel).toBe('number');
    });
  });
});
