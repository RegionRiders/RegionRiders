import * as apiConfig from '@/lib/api/config';
import { CountryData, RegionCache } from './regionCache';

jest.mock('@/lib/api/config');

global.fetch = jest.fn();

describe('RegionCache', () => {
  let cache: RegionCache;

  beforeEach(() => {
    cache = new RegionCache();
    jest.clearAllMocks();

    // Mock getApiUrl to return full URL
    (apiConfig.getApiUrl as jest.Mock).mockImplementation((path: string) => {
      return `http://localhost:3000${path}`;
    });
  });

  it('should load and cache country regions', async () => {
    const mockGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          id: '1',
          type: 'Feature',
          properties: {
            name: 'Mazowieckie',
            country_code: 'PL',
            admin_level: 4,
          },
          geometry: { type: 'Polygon', coordinates: [] },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGeoJSON,
    });

    const country: CountryData = {
      code: 'PL',
      name: 'Poland',
      fileName: 'poland.geojson',
    };

    const result = await cache.loadCountryRegions(country);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Mazowieckie');
    expect(apiConfig.getApiUrl).toHaveBeenCalledWith('/data/regions/poland.geojson');
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/data/regions/poland.geojson');
  });

  it('should return cached regions on subsequent calls', async () => {
    const mockGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          id: '1',
          type: 'Feature',
          properties: { name: 'Mazowieckie', country_code: 'PL', admin_level: 4 },
          geometry: { type: 'Polygon', coordinates: [] },
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGeoJSON,
    });

    const country: CountryData = {
      code: 'PL',
      name: 'Poland',
      fileName: 'poland.geojson',
    };

    // First call
    await cache.loadCountryRegions(country);
    // Second call
    const result = await cache.loadCountryRegions(country);

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle HTTP errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const country: CountryData = {
      code: 'PL',
      name: 'Poland',
      fileName: 'poland.geojson',
    };

    const result = await cache.loadCountryRegions(country);

    expect(result).toEqual([]);
  });

  it('should clear cache', () => {
    cache.clear();
    const stats = cache.getStats();
    expect(stats.cachedCountries).toBe(0);
  });

  it('should return cache statistics', () => {
    const stats = cache.getStats();
    expect(stats).toHaveProperty('cachedCountries');
    expect(stats).toHaveProperty('loadingCountries');
    expect(stats.cachedCountries).toBe(0);
    expect(stats.loadingCountries).toBe(0);
  });
});
