import { GPXPoint } from '@/lib/types/types';

export function pointInPolygon(
    point: GPXPoint,
    polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon
): boolean {
    if (polygon.type === 'Polygon') {
        return pointInPolygonRings(point, polygon.coordinates);
    }
    for (const coords of polygon.coordinates) {
        if (pointInPolygonRings(point, coords)) return true;
    }
    return false;
}

function pointInPolygonRings(point: GPXPoint, rings: [number, number][][]): boolean {
    if (!raycastPointInRing(point, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) {
        if (raycastPointInRing(point, rings[i])) return false;
    }
    return true;
}

function raycastPointInRing(point: GPXPoint, ring: [number, number][]): boolean {
    const x = point.lon;
    const y = point.lat;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }

    return inside;
}
