import {
  getRegionTileSourceOrigin as getSharedRegionTileSourceOrigin,
  getRegionTileSourceUrl as getSharedRegionTileSourceUrl,
} from '@/lib/regions/regionTileSource.mjs';

export { DEFAULT_REGION_TILE_SOURCE } from '@/lib/regions/regionTileSource.mjs';

export function getRegionTileSourceOrigin(): string | null {
  return getSharedRegionTileSourceOrigin() ?? null;
}

/**
 * Returns the canonical region vector tile source URL.
 * The public env override allows deployments to switch hosts without
 * spreading tile source knowledge across rendering code.
 */
export function getRegionTileSourceUrl(): string {
  return getSharedRegionTileSourceUrl();
}
