import { TEST_REGION_TILE_URL } from '@/test-utils/regionTileSource';
import { createRegionTileEnvTestHarness } from '@/test-utils/withRegionTileEnv';
import { getRegionTileProfileConfig } from './regionTileProfiles';

describe('regionTileProfiles', () => {
  const regionTileEnv = createRegionTileEnvTestHarness();

  afterEach(() => {
    regionTileEnv.restore();
  });

  it('injects the canonical tile source URL into the mobile profile', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = TEST_REGION_TILE_URL;

    expect(getRegionTileProfileConfig('mobile')).toEqual(
      expect.objectContaining({
        sourceUrl: TEST_REGION_TILE_URL,
        minZoom: 4,
        detailCapZoom: 12,
        displayMaxZoom: 18,
      })
    );
  });

  it('keeps the desktop profile capped at zoom 12', () => {
    expect(getRegionTileProfileConfig('desktop')).toEqual(
      expect.objectContaining({
        minZoom: 3,
        detailCapZoom: 12,
        displayMaxZoom: 18,
      })
    );
  });
});
