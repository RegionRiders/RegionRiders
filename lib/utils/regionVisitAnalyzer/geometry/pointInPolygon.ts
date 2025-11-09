import { GPXPoint } from '@/lib/types/types';
import {GeoJSON} from "geojson";

// accurate check: is point inside region boundary?
// uses ray casting algorithm (even-odd rule)
export function pointInPolygon(
    point: GPXPoint,
    polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
    if (polygon.type === 'Polygon') {
        return pointInPolygonRings(point, polygon.coordinates);
    }
    // multipolygon: check each piece (handles islands, exclaves)
    for (const coords of polygon.coordinates) {
        if (pointInPolygonRings(point, coords)) {return true;}
    }
    return false;
}

// check outer boundary, then exclude holes
function pointInPolygonRings(point: GPXPoint, rings: GeoJSON.Position[][]): boolean {
    if (!raycastPointInRing(point, rings[0])) {return false;}
    // must NOT be in any holes
    for (let i = 1; i < rings.length; i++) {
        if (raycastPointInRing(point, rings[i])) {return false;}
    }
    return true;
}

// ray casting: shoot ray right from point, count edge crossings
// odd crossings = inside, even = outside
function raycastPointInRing(point: GPXPoint, ring: GeoJSON.Position[]): boolean {
    const x = point.lon;
    const y = point.lat;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];

        // does the ray intersect this edge?
        const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) {inside = !inside;}
    }

    return inside;
}
