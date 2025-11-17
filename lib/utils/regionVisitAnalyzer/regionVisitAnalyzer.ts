import { GPXTrack, Regions } from '@/lib/types/types';
import { processTrack } from './processing';
import { buildSpatialGrid } from './spatial';
import { getBoundingBox } from './spatial/boundingBox';
import { AnalysisConfig, RegionVisitData } from './types';

const DEFAULT_CONFIG: AnalysisConfig = {
  gridSize: 0.1, // ~11km cells
};

/**
 * analyzes gpx tracks to find which regions were visited
 * uses spatial grid + ray casting for accurate boundary detection
 *
 * @param tracks - gpx tracks with lat/lon points
 * @param regions - geographic regions to check
 * @param onProgress - optional progress callback (0-100)
 * @param config - optional grid size tuning
 * @returns map of a region id to visit stats
 */
export function analyzeRegionVisits(
  tracks: GPXTrack[],
  regions: Regions[],
  onProgress?: (progress: number, message: string) => void,
  config: AnalysisConfig = DEFAULT_CONFIG
): Map<string, RegionVisitData> {
  const startTime = performance.now();
  const visitMap = new Map<string, RegionVisitData>();

  // setup: create empty visit records
  const trackIdSets = new Map<string, Set<string>>();
  regions.forEach((region) => {
    trackIdSets.set(region.id, new Set());
    visitMap.set(region.id, {
      regionId: region.id,
      regionName: region.name,
      visitCount: 0,
      visited: false,
      trackIds: [],
      geometry: region.geometry,
    });
  });

  // build spatial index for fast lookups
  onProgress?.(10, 'building spatial index...');
  const grid = buildSpatialGrid(regions, config.gridSize);
  const regionBounds = new Map();
  regions.forEach((r) => regionBounds.set(r.id, getBoundingBox(r.id, r.geometry)));

  // process each track
  onProgress?.(20, `processing ${tracks.length} tracks...`);
  const validTracks = tracks.filter((t) => t.points?.length > 0);

  for (let i = 0; i < validTracks.length; i++) {
    processTrack(validTracks[i], grid, regionBounds, visitMap, regions, config, trackIdSets);
    if (i % Math.max(1, Math.floor(validTracks.length / 10)) === 0) {
      const progress = Math.floor((i / validTracks.length) * 60) + 20;
      onProgress?.(progress, `processed ${i + 1}/${validTracks.length} tracks`);
    }
  }

  // finalize: mark visited regions
  onProgress?.(85, 'finalizing...');
  let visitedCount = 0;
  visitMap.forEach((d) => {
    if (d.visitCount > 0) {
      d.visited = true;
      visitedCount++;
    }
  });

  const duration = (performance.now() - startTime).toFixed(2);
  onProgress?.(100, `complete: ${visitedCount} regions in ${duration}ms`);
  return visitMap;
}

/**
 * async version that doesn't block ui thread
 */
export function analyzeRegionVisitsAsync(
  tracks: GPXTrack[],
  regions: Regions[],
  onProgress?: (progress: number, message: string) => void,
  config?: AnalysisConfig
): Promise<Map<string, RegionVisitData>> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(analyzeRegionVisits(tracks, regions, onProgress, config)), 0);
  });
}
