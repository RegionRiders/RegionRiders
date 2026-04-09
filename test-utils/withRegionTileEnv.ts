export function createRegionTileEnvTestHarness() {
  const originalRegionTileUrl = process.env.NEXT_PUBLIC_REGION_TILE_URL;

  return {
    restore() {
      if (originalRegionTileUrl === undefined) {
        delete process.env.NEXT_PUBLIC_REGION_TILE_URL;
        return;
      }

      process.env.NEXT_PUBLIC_REGION_TILE_URL = originalRegionTileUrl;
    },
  };
}
