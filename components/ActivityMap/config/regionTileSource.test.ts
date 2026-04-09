import {
  DEFAULT_REGION_TILE_SOURCE,
  getRegionTileSourceOrigin,
  getRegionTileSourceUrl,
} from './regionTileSource';

describe('regionTileSource', () => {
  const originalRegionTileUrl = process.env.NEXT_PUBLIC_REGION_TILE_URL;

  afterEach(() => {
    if (originalRegionTileUrl === undefined) {
      delete process.env.NEXT_PUBLIC_REGION_TILE_URL;
    } else {
      process.env.NEXT_PUBLIC_REGION_TILE_URL = originalRegionTileUrl;
    }
  });

  it('returns env override when present', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = 'https://example.com/regions/{z}/{x}/{y}.pbf';

    expect(getRegionTileSourceUrl()).toBe('https://example.com/regions/{z}/{x}/{y}.pbf');
  });

  it('falls back to the default region tile host', () => {
    delete process.env.NEXT_PUBLIC_REGION_TILE_URL;

    expect(getRegionTileSourceUrl()).toBe(DEFAULT_REGION_TILE_SOURCE);
  });

  it('normalizes a trailing slash in the tile source override', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = 'https://example.com/regions/{z}/{x}/{y}.pbf/';

    expect(getRegionTileSourceUrl()).toBe('https://example.com/regions/{z}/{x}/{y}.pbf');
  });

  it('extracts the tile source origin for CSP allowlisting', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = 'https://example.com/regions/{z}/{x}/{y}.pbf';

    expect(getRegionTileSourceOrigin()).toBe('https://example.com');
  });

  it('returns null origin for an invalid tile source URL', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = '/api/regions/tiles/v1/{z}/{x}/{y}.pbf';

    expect(getRegionTileSourceOrigin()).toBeNull();
  });
});
