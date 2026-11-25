import { getRegionTileSourceOrigin } from '../regions/regionTileSource.mjs';

const regionTileOrigin = getRegionTileSourceOrigin();
const regionTileConnectSources = regionTileOrigin ? [regionTileOrigin] : [];

/**
 * Content Security Policy (CSP) configuration
 *
 * SECURITY: CSP helps prevent XSS, clickjacking, and other code injection attacks
 * by controlling which resources can be loaded and executed.
 *
 * Context7 Reference: Follows Next.js CSP best practices with environment-specific policies.
 * See: https://nextjs.org/docs/app/guides/content-security-policy
 */

const RASTER_TILE_CONNECT_SOURCES = [
  'https://*.tile.openstreetmap.org',
  'https://server.arcgisonline.com',
  'https://*.tile.opentopomap.org',
  'https://*.basemaps.cartocdn.com',
  'https://*.tile-cyclosm.openstreetmap.fr',
  'https://tiles.stadiamaps.com',
  'https://tile.waymarkedtrails.org',
];

export const productionCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://www.strava.com'],
  'worker-src': ["'self'", 'blob:'],
  'child-src': ["'self'", 'blob:'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://www.strava.com',
    ...RASTER_TILE_CONNECT_SOURCES,
    ...regionTileConnectSources,
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

export const developmentCSP = {
  ...productionCSP,
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
};
