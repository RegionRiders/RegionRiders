const DEFAULT_SUBDOMAINS = ['a', 'b', 'c'] as const;

export interface ExpandRasterTileUrlOptions {
  subdomains?: readonly string[];
  devicePixelRatio?: number;
}

/**
 * Expands a Leaflet-style raster tile URL template (supporting `{s}` subdomains
 * and `{r}` retina suffix) into an array of concrete tile URL templates for MapLibre GL JS.
 */
export function expandRasterTileUrls(
  urlTemplate: string,
  options: ExpandRasterTileUrlOptions = {}
): string[] {
  const trimmed = urlTemplate.trim();
  if (!trimmed) {
    return [];
  }

  const dpr =
    options.devicePixelRatio ??
    (typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number'
      ? window.devicePixelRatio
      : 1);
  const retinaSuffix = dpr > 1 ? '@2x' : '';
  const withRetina = trimmed.replace(/\{r\}/g, retinaSuffix);

  if (!withRetina.includes('{s}')) {
    return [withRetina];
  }

  const subdomains =
    options.subdomains && options.subdomains.length > 0 ? options.subdomains : DEFAULT_SUBDOMAINS;

  return subdomains.map((subdomain) => withRetina.replace(/\{s\}/g, subdomain));
}

/**
 * Resolves a relative tile URL template (e.g. `/api/regions/tiles/v1/{z}/{x}/{y}.pbf`)
 * into an absolute URL required by MapLibre GL JS Web Workers.
 */
export function resolveAbsoluteTileUrl(urlTemplate: string, origin?: string): string {
  const trimmed = urlTemplate.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const resolvedOrigin = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');

  if (!resolvedOrigin) {
    return trimmed;
  }

  const normalizedOrigin = resolvedOrigin.replace(/\/+$/, '');
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${normalizedOrigin}${normalizedPath}`;
}
