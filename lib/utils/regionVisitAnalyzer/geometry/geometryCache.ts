import { Subdivision } from '@/lib/types/types';

const cache = new Map<string, GeoJSON.Polygon | GeoJSON.MultiPolygon>();

export function getGeometry(
    regionId: string,
    subdivisions: Subdivision[]
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
    const cached = cache.get(regionId);
    if (cached) return cached;

    const region = subdivisions.find((r) => r.id === regionId);
    if (!region) return null;

    cache.set(regionId, region.geometry);
    return region.geometry;
}

export function clearGeometryCache(): void {
    cache.clear();
}
