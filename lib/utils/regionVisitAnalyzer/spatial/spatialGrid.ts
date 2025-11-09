import { SpatialCell, BoundingBox } from '../types';
import { Subdivision } from '@/lib/types/types';
import { getBoundingBox } from './boundingBox';

export function buildSpatialGrid(
    subdivisions: Subdivision[],
    gridSize: number
): Map<string, SpatialCell> {
    const grid = new Map<string, SpatialCell>();

    for (const region of subdivisions) {
        const bbox = getBoundingBox(region.id, region.geometry);
        const minGridLat = Math.floor(bbox.minLat / gridSize);
        const maxGridLat = Math.floor(bbox.maxLat / gridSize);
        const minGridLon = Math.floor(bbox.minLon / gridSize);
        const maxGridLon = Math.floor(bbox.maxLon / gridSize);

        for (let lat = minGridLat; lat <= maxGridLat; lat++) {
            for (let lon = minGridLon; lon <= maxGridLon; lon++) {
                const key = `${lat},${lon}`;
                if (!grid.has(key)) grid.set(key, { regionIds: [] });
                grid.get(key)!.regionIds.push(region.id);
            }
        }
    }

    return grid;
}

export function getGridKey(lat: number, lon: number, gridSize: number): string {
    const glat = Math.floor(lat / gridSize);
    const glon = Math.floor(lon / gridSize);
    return `${glat},${glon}`;
}

export function getAdjacentCells(lat: number, lon: number, gridSize: number): string[] {
    const glat = Math.floor(lat / gridSize);
    const glon = Math.floor(lon / gridSize);
    return [
        `${glat},${glon}`,
        `${glat + 1},${glon}`,
        `${glat},${glon + 1}`,
        `${glat + 1},${glon + 1}`,
    ];
}
