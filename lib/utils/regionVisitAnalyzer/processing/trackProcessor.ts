import { GPXTrack, Subdivision, GPXPoint } from '@/lib/types/types';
import { RegionVisitData, SpatialCell, BoundingBox } from '../types';
import { pointInBoundingBox } from '../spatial/boundingBox';
import { getAdjacentCells } from '../spatial/spatialGrid';
import { pointInPolygon } from '../geometry/pointInPolygon';
import { getGeometry } from '../geometry/geometryCache';

export function processTrack(
    track: GPXTrack,
    grid: Map<string, SpatialCell>,
    regionBounds: Map<string, BoundingBox>,
    visitMap: Map<string, RegionVisitData>,
    subdivisions: Subdivision[],
    config: { gridSize: number; pointSkipRatio: number }
): void {
    const visitedRegions = new Set<string>();
    const pts = track.points;
    const POINT_SKIP = Math.max(1, Math.floor(pts.length / config.pointSkipRatio));

    for (let i = 0; i < pts.length; i += POINT_SKIP) {
        const p = pts[i];
        const cells = getAdjacentCells(p.lat, p.lon, config.gridSize);

        for (const key of cells) {
            const cell = grid.get(key);
            if (!cell) continue;

            for (const regionId of cell.regionIds) {
                if (visitedRegions.has(regionId)) continue;

                const bbox = regionBounds.get(regionId);
                if (!bbox || !pointInBoundingBox(p, bbox)) continue;

                const region = visitMap.get(regionId);
                if (!region) continue;

                if (checkPointInRegion(p, regionId, subdivisions)) {
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
    subdivisions: Subdivision[]
): boolean {
    const geometry = getGeometry(regionId, subdivisions);
    if (!geometry) return false;
    return pointInPolygon(point, geometry);
}
