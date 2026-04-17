import { DEFAULT_REGION_TILE_SOURCE } from './defaultRegionTileSource.mjs';

export { DEFAULT_REGION_TILE_SOURCE } from './defaultRegionTileSource.mjs';

export function normalizeRegionTileUrl(url) {
  return url.trim().replace(/\/+$/, '');
}

/**
 * @param {{ NEXT_PUBLIC_REGION_TILE_URL?: string } | undefined} [env]
 */
export function getRegionTileSourceUrl(env = process.env) {
  const override = env.NEXT_PUBLIC_REGION_TILE_URL;
  const normalizedOverride = typeof override === 'string' ? normalizeRegionTileUrl(override) : '';

  return normalizedOverride || DEFAULT_REGION_TILE_SOURCE;
}

/**
 * @param {{ NEXT_PUBLIC_REGION_TILE_URL?: string } | undefined} [env]
 * @returns {string | null}
 */
export function getRegionTileSourceOrigin(env = process.env) {
  const tileUrl = getRegionTileSourceUrl(env);
  const templatedHostMatch = tileUrl.match(/^([a-z]+):\/\/\{[^}]+\}\.([^/]+)(?:\/|$)/i);

  if (templatedHostMatch) {
    const [, protocol, hostname] = templatedHostMatch;

    return `${protocol}://*.${hostname}`;
  }

  try {
    return new URL(tileUrl).origin;
  } catch {
    return null;
  }
}
