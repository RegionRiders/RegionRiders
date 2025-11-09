import { GPXTrack, Subdivision } from '@/lib/types/types';
import { RegionVisitData, AnalysisConfig } from './types';
import { buildSpatialGrid } from './spatial';
import { getBoundingBox } from './spatial/boundingBox';
import { processTrack } from './processing';

const DEFAULT_CONFIG: AnalysisConfig = {
    gridSize: 0.1, // ~11km cells
    pointSkipRatio: 500,
};

export function analyzeRegionVisits(
    tracks: GPXTrack[],
    subdivisions: Subdivision[],
    onProgress?: (progress: number, message: string) => void,
    config: AnalysisConfig = DEFAULT_CONFIG
): Map<string, RegionVisitData> {
    const startTime = performance.now();
    const visitMap = new Map<string, RegionVisitData>();

    // Initialize
    subdivisions.forEach((region) => {
        visitMap.set(region.id, {
            regionId: region.id,
            regionName: region.name,
            visitCount: 0,
            visited: false,
            trackIds: [],
            geometry: region.geometry,
        });
    });

    // Build spatial index
    onProgress?.(10, 'Building spatial index...');
    const grid = buildSpatialGrid(subdivisions, config.gridSize);
    const regionBounds = new Map();
    subdivisions.forEach((r) => regionBounds.set(r.id, getBoundingBox(r.id, r.geometry)));

    // Process tracks
    onProgress?.(20, `Processing ${tracks.length} tracks...`);
    const validTracks = tracks.filter((t) => t.points?.length > 0);

    for (let i = 0; i < validTracks.length; i++) {
        processTrack(validTracks[i], grid, regionBounds, visitMap, subdivisions, config);
        if (i % Math.max(1, Math.floor(validTracks.length / 10)) === 0) {
            const progress = Math.floor((i / validTracks.length) * 60) + 20;
            onProgress?.(progress, `Processed ${i + 1}/${validTracks.length} tracks`);
        }
    }

    // Finalize
    onProgress?.(85, 'Finalizing...');
    let visitedCount = 0;
    visitMap.forEach((d) => {
        if (d.visitCount > 0) {
            d.visited = true;
            visitedCount++;
        }
    });

    const duration = (performance.now() - startTime).toFixed(2);
    onProgress?.(100, `Analysis complete: ${visitedCount} regions in ${duration}ms`);
    return visitMap;
}

export function analyzeRegionVisitsAsync(
    tracks: GPXTrack[],
    subdivisions: Subdivision[],
    onProgress?: (progress: number, message: string) => void,
    config?: AnalysisConfig
): Promise<Map<string, RegionVisitData>> {
    return new Promise((resolve) => {
        setTimeout(() => resolve(analyzeRegionVisits(tracks, subdivisions, onProgress, config)), 0);
    });
}
