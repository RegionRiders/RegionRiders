import { getRegionTileSourceUrl } from './regionTileSource';

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

    expect(getRegionTileSourceUrl()).toBe('https://rr-tiles.404fra.pl/v1/{z}/{x}/{y}.pbf');
  });
});
