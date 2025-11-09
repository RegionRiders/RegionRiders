// lib/utils/regionVisitAnalyzer/spatial/boundingBox.ts
import { BoundingBox } from '../types';
import { GPXPoint } from '@/lib/types/types';

const cache = new Map<string, BoundingBox>();

export function getBoundingBox(
    regionId: string,
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): BoundingBox {
    const cached = cache.get(regionId);
    if (cached) return cached;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    const processRing = (ring: [number, number][]) => {
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
