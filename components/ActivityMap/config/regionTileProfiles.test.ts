import { getRegionTileProfileConfig } from './regionTileProfiles';

describe('regionTileProfiles', () => {
  const originalRegionTileUrl = process.env.NEXT_PUBLIC_REGION_TILE_URL;

  afterEach(() => {
    if (originalRegionTileUrl === undefined) {
      delete process.env.NEXT_PUBLIC_REGION_TILE_URL;
    } else {
      process.env.NEXT_PUBLIC_REGION_TILE_URL = originalRegionTileUrl;
    }
  });

  it('injects the canonical tile source URL into the mobile profile', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = 'https://example.com/regions/{z}/{x}/{y}.pbf';

    expect(getRegionTileProfileConfig('mobile')).toEqual(
      expect.objectContaining({
        sourceUrl: 'https://example.com/regions/{z}/{x}/{y}.pbf',
        minZoom: 4,
        maxZoom: 12,
      })
    );
  });

  it('keeps the desktop profile capped at zoom 12', () => {
    expect(getRegionTileProfileConfig('desktop')).toEqual(
      expect.objectContaining({
        minZoom: 3,
        maxZoom: 12,
      })
    );
  });
});
