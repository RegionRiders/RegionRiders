import {
  TEST_REGION_TILE_ORIGIN,
  TEST_REGION_TILE_URL,
  TEST_REGION_TILE_URL_WITH_TRAILING_SLASH,
  TEST_RELATIVE_REGION_TILE_URL,
} from '@/test-utils/regionTileSource';
import { createRegionTileEnvTestHarness } from '@/test-utils/withRegionTileEnv';
import {
  DEFAULT_REGION_TILE_SOURCE,
  getRegionTileSourceOrigin,
  getRegionTileSourceUrl,
} from './regionTileSource';

describe('regionTileSource', () => {
  const regionTileEnv = createRegionTileEnvTestHarness();

  afterEach(() => {
    regionTileEnv.restore();
  });

  it('returns env override when present', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = TEST_REGION_TILE_URL;

    expect(getRegionTileSourceUrl()).toBe(TEST_REGION_TILE_URL);
  });

  it('falls back to the default region tile host', () => {
    delete process.env.NEXT_PUBLIC_REGION_TILE_URL;

    expect(getRegionTileSourceUrl()).toBe(DEFAULT_REGION_TILE_SOURCE);
  });

  it('normalizes a trailing slash in the tile source override', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = TEST_REGION_TILE_URL_WITH_TRAILING_SLASH;

    expect(getRegionTileSourceUrl()).toBe(TEST_REGION_TILE_URL);
  });

  it('normalizes multiple trailing slashes in the tile source override', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = `${TEST_REGION_TILE_URL}///`;

    expect(getRegionTileSourceUrl()).toBe(TEST_REGION_TILE_URL);
  });

  it('falls back to the default source when the env override is only whitespace', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = '   ';

    expect(getRegionTileSourceUrl()).toBe(DEFAULT_REGION_TILE_SOURCE);
  });

  it('extracts the tile source origin for CSP allowlisting', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = TEST_REGION_TILE_URL;

    expect(getRegionTileSourceOrigin()).toBe(TEST_REGION_TILE_ORIGIN);
  });

  it('returns null origin for an invalid tile source URL', () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = TEST_RELATIVE_REGION_TILE_URL;

    expect(getRegionTileSourceOrigin()).toBeNull();
  });
});
