import { GeoJSON } from 'geojson';
import { Regions } from '@/lib/types/types';

const cache = new Map<string, GeoJSON.Polygon | GeoJSON.MultiPolygon>();

/**
 * retrieves region geometry with caching to avoid repeated lookups
 *
 * @param regionId - unique region identifier
 * @param regions - all regions array
 * @returns geojson geometry or null if not found
 */
export function getGeometry(
  regionId: string,
  regions: Regions[]
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  const cached = cache.get(regionId);
  if (cached) {
    return cached;
  }

  const region = regions.find((r) => r.id === regionId);
  if (!region) {
    return null;
  }

  cache.set(regionId, region.geometry);
  return region.geometry;
}

export function clearGeometryCache(): void {
  cache.clear();
}
