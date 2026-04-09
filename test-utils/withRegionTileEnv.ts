export function createRegionTileEnvTestHarness() {
  const envSnapshot = {
    hasRegionTileUrl: Object.hasOwn(process.env, 'NEXT_PUBLIC_REGION_TILE_URL'),
    regionTileUrl: process.env.NEXT_PUBLIC_REGION_TILE_URL,
  };

  return {
    restore() {
      if (!envSnapshot.hasRegionTileUrl) {
        delete process.env.NEXT_PUBLIC_REGION_TILE_URL;
        return;
      }

      process.env.NEXT_PUBLIC_REGION_TILE_URL = envSnapshot.regionTileUrl;
    },
  };
}
