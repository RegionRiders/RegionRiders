import { SpatialCell } from '../types';
import { Regions } from '@/lib/types/types';
import { getBoundingBox } from './boundingBox';

/**
 * builds a spatial grid index for fast region lookups by location
 * divides map into cells and tracks which regions overlap each cell
 *
 * @param regions - all regions to index
 * @param gridSize - cell size in degrees (~0.1 = 11 km)
 * @returns map of a cell key to region ids in that cell
 */
export function buildSpatialGrid(
    regions: Regions[],
    gridSize: number
): Map<string, SpatialCell> {
    const grid = new Map<string, SpatialCell>();

    for (const region of regions) {
        const bbox = getBoundingBox(region.id, region.geometry);
        const minGridLat = Math.floor(bbox.minLat / gridSize);
        const maxGridLat = Math.floor(bbox.maxLat / gridSize);
        const minGridLon = Math.floor(bbox.minLon / gridSize);
        const maxGridLon = Math.floor(bbox.maxLon / gridSize);

        for (let lat = minGridLat; lat <= maxGridLat; lat++) {
            for (let lon = minGridLon; lon <= maxGridLon; lon++) {
                const key = `${lat},${lon}`;
                if (!grid.has(key)) {grid.set(key, { regionIds: [] });}
                grid.get(key)!.regionIds.push(region.id);
            }
        }
    }

    return grid;
}

/**
 * converts lat/lon to a grid cell key
 */
export function getGridKey(lat: number, lon: number, gridSize: number): string {
    const glat = Math.floor(lat / gridSize);
    const glon = Math.floor(lon / gridSize);
    return `${glat},${glon}`;
}

/**
 * returns current cell + 3 adjacent cells
 * checks 4 cells total to handle points near cell boundaries
 */
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
