describe('region tile source and CSP parity', () => {
  const originalRegionTileUrl = process.env.NEXT_PUBLIC_REGION_TILE_URL;

  afterEach(() => {
    jest.resetModules();

    if (originalRegionTileUrl === undefined) {
      delete process.env.NEXT_PUBLIC_REGION_TILE_URL;
    } else {
      process.env.NEXT_PUBLIC_REGION_TILE_URL = originalRegionTileUrl;
    }
  });

  it('allowlists the configured absolute tile origin in connect-src', async () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = 'https://example.com/regions/{z}/{x}/{y}.pbf';

    const { productionCSP } = await import('./csp.mjs');

    expect(productionCSP['connect-src']).toContain('https://example.com');
  });

  it('does not add a relative tile URL to connect-src', async () => {
    process.env.NEXT_PUBLIC_REGION_TILE_URL = '/api/regions/tiles/v1/{z}/{x}/{y}.pbf';

    const { productionCSP } = await import('./csp.mjs');

    expect(productionCSP['connect-src']).not.toContain('/api/regions/tiles/v1/{z}/{x}/{y}.pbf');
  });
});
