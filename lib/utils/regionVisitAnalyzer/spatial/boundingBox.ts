import { GeoJSON } from 'geojson';
import { GPXPoint } from '@/lib/types';
import { BoundingBox } from '../types';

const cache = new Map<string, BoundingBox>();

/**
 * calculates rectangle bounds around region geometry for fast pre-filtering
 * cached to avoid repeated calculation
 *
 * @param regionId - unique region identifier for caching
 * @param geometry - geojson polygon or multipolygon
 * @returns bounding box with min/max lat/lon
 */
export function getBoundingBox(
  regionId: string,
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): BoundingBox {
  const cached = cache.get(regionId);
  if (cached) {
    return cached;
  }

  let minLat = Infinity,
    maxLat = -Infinity;
  let minLon = Infinity,
    maxLon = -Infinity;

  const processRing = (ring: GeoJSON.Position[]) => {
    for (const [lon, lat] of ring) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
  };

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(processRing);
  } else {
    geometry.coordinates.forEach((poly) => poly.forEach(processRing));
  }

  const bbox = { minLat, maxLat, minLon, maxLon };
  cache.set(regionId, bbox);
  return bbox;
}

/**
 * quick check if point is inside bounding box rectangle
 * much faster than accurate polygon check, used for pre-filtering
 */
export function pointInBoundingBox(point: GPXPoint, bbox: BoundingBox): boolean {
  return (
    point.lat >= bbox.minLat &&
    point.lat <= bbox.maxLat &&
    point.lon >= bbox.minLon &&
    point.lon <= bbox.maxLon
  );
}

export function clearBoundingBoxCache(): void {
  cache.clear();
}
