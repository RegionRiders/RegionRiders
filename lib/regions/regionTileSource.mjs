import { DEFAULT_REGION_TILE_SOURCE } from './defaultRegionTileSource.mjs';

export { DEFAULT_REGION_TILE_SOURCE } from './defaultRegionTileSource.mjs';

export function normalizeRegionTileUrl(url) {
  return url.trim().replace(/\/$/, '');
}

export function getRegionTileSourceUrl(env = process.env) {
  return normalizeRegionTileUrl(env.NEXT_PUBLIC_REGION_TILE_URL || DEFAULT_REGION_TILE_SOURCE);
}

export function getRegionTileSourceOrigin(env = process.env) {
  const tileUrl = getRegionTileSourceUrl(env);

  try {
    return new URL(tileUrl).origin;
  } catch {
    return null;
  }
}
