/**
 * Converts latitude/longitude and zoom level to tile coordinates
 * using the standard Slippy Map tile numbering scheme.
 */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/**
 * Resolves a tile URL template into a concrete image URL for the tile
 * containing the given latitude, longitude, and zoom level.
 *
 * Supports common placeholders: {s}, {z}, {x}, {y}, {r}
 */
export function resolveTileUrl(
  urlTemplate: string,
  lat: number,
  lng: number,
  zoom: number
): string {
  const z = Math.round(zoom);
  const { x, y } = latLngToTile(lat, lng, z);
  return urlTemplate
    .replace('{s}', 'a')
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{r}', '');
}
