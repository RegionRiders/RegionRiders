import {
  TEST_REGION_TILE_ORIGIN,
  TEST_REGION_TILE_URL,
  TEST_RELATIVE_REGION_TILE_URL,
} from '@/test-utils/regionTileSource';
import { createRegionTileEnvTestHarness } from '@/test-utils/withRegionTileEnv';

describe('region tile source and CSP parity', () => {
  const regionTileEnv = createRegionTileEnvTestHarness();

  afterEach(() => {
    jest.resetModules();
    regionTileEnv.restore();
  });

  it('allowlists the configured absolute tile origin in connect-src', async () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = TEST_REGION_TILE_URL;

    const { productionCSP } = await import('./csp.mjs');

    expect(productionCSP['connect-src']).toContain(TEST_REGION_TILE_ORIGIN);
  });

  it('does not add a relative tile URL to connect-src', async () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = TEST_RELATIVE_REGION_TILE_URL;

    const { productionCSP } = await import('./csp.mjs');

    expect(productionCSP['connect-src']).not.toContain(TEST_RELATIVE_REGION_TILE_URL);
  });
});
