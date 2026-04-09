import { DEFAULT_REGION_TILE_SOURCE } from '@/lib/regions/defaultRegionTileSource.mjs';

export { DEFAULT_REGION_TILE_SOURCE } from '@/lib/regions/defaultRegionTileSource.mjs';

function normalizeRegionTileUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

export function getRegionTileSourceOrigin(): string | null {
  const tileUrl = getRegionTileSourceUrl();

  try {
    return new URL(tileUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Returns the canonical region vector tile source URL.
 * The public env override allows deployments to switch hosts without
 * spreading tile source knowledge across rendering code.
 */
export function getRegionTileSourceUrl(): string {
  return normalizeRegionTileUrl(
    process.env.NEXT_PUBLIC_REGION_TILE_URL || DEFAULT_REGION_TILE_SOURCE
  );
}
