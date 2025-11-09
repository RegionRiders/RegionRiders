import { Regions } from '@/lib/types/types';
import {GeoJSON} from "geojson";

const cache = new Map<string, GeoJSON.Polygon | GeoJSON.MultiPolygon>();

// avoid repeated lookups of region geometry
export function getGeometry(
    regionId: string,
    regions: Regions[]
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
    const cached = cache.get(regionId);
    if (cached) {return cached;}

    const region = regions.find((r) => r.id === regionId);
    if (!region) {return null;}

    cache.set(regionId, region.geometry);
    return region.geometry;
}

export function clearGeometryCache(): void {
    cache.clear();
}
