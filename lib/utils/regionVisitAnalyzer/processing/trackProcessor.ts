import { GPXTrack, Regions, GPXPoint } from '@/lib/types/types';
import { RegionVisitData, SpatialCell, BoundingBox } from '../types';
import { pointInBoundingBox } from '../spatial/boundingBox';
import { getAdjacentCells } from '../spatial/spatialGrid';
import { pointInPolygon } from '../geometry/pointInPolygon';
import { getGeometry } from '../geometry/geometryCache';

/**
 * processes a single track to find which regions it passes through
 * uses spatial grid to check only nearby regions, then accurate boundary test
 *
 * @param track - gpx track with lat/lon points
 * @param grid - spatial grid index for fast lookup
 * @param regionBounds - bounding boxes for pre-filtering
 * @param map - map to update with visit data
 * @param regions - all regions for geometry lookup
 * @param config - grid size configuration
 */
export function processTrack(
    track: GPXTrack,
    grid: Map<string, SpatialCell>,
    regionBounds: Map<string, BoundingBox>,
    map: Map<string, RegionVisitData>,
    regions: Regions[],
    config: { gridSize: number }
): void {
    const visitedRegions = new Set<string>();
    const pts = track.points;

    // check every point for maximum accuracy
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const cells = getAdjacentCells(p.lat, p.lon, config.gridSize);

        for (const key of cells) {
            const cell = grid.get(key);
            if (!cell) {continue;}

            for (const regionId of cell.regionIds) {
                if (visitedRegions.has(regionId)) {continue;}

                // fast check: is the point even close to a region?
                const bbox = regionBounds.get(regionId);
                if (!bbox || !pointInBoundingBox(p, bbox)) {continue;}

                const region = map.get(regionId);
                if (!region) {continue;}

                // accurate check: is point actually inside boundary?
                if (checkPointInRegion(p, regionId, regions)) {
                    visitedRegions.add(regionId);
                    region.visitCount++;
                    if (!region.trackIds.includes(track.id)) {
                        region.trackIds.push(track.id);
                    }
                }
            }
        }
    }
}

function checkPointInRegion(
    point: GPXPoint,
    regionId: string,
    regions: Regions[]
): boolean {
    const geometry = getGeometry(regionId, regions);
    if (!geometry) {return false;}
    return pointInPolygon(point, geometry);
}
