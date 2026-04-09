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

export const productionCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://www.strava.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://dgtzuqphqg23d.cloudfront.net',
    'https://*.tiles.mapbox.com',
    'https://api.mapbox.com',
    'https://*.basemaps.cartocdn.com/',
  ],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://www.strava.com',
    'https://api.mapbox.com',
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
