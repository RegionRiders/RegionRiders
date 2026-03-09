import { GPXTrack, Regions } from '@/lib/types';
import { pointInPolygon } from './geometry/pointInPolygon';
import { RegionSpatialIndex } from './spatial/spatialIndex';
import { RegionVisitData } from './types';

/**
 * analyzes gpx tracks to find which regions were visited
 * uses RBush spatial index + ray casting for accurate boundary detection
 * OPTIMIZED: uses spatial index to check only nearby regions instead of all regions
 *
 * @param tracks - gpx tracks with lat/lon points
 * @param regions - geographic regions to check
 * @param onProgress - optional progress callback (0-100)
 * @returns map of a region id to visit stats
 */
export function analyzeRegionVisits(
  tracks: GPXTrack[],
  regions: Regions[],
  onProgress?: (progress: number, message: string) => void
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

  onProgress?.(10, 'building spatial index...');
  const spatialIndex = new RegionSpatialIndex(regions);

  onProgress?.(20, `processing ${tracks.length} tracks...`);
  const validTracks = tracks.filter((t) => t.points?.length > 0);

  let totalPointsChecked = 0;
  let totalCandidatesChecked = 0;

  for (let i = 0; i < validTracks.length; i++) {
    const track = validTracks[i];
    const visitedRegions = new Set<string>();

    for (const point of track.points) {
      totalPointsChecked++;

      const candidateRegions = spatialIndex.findCandidateRegions(point.lon, point.lat);
      totalCandidatesChecked += candidateRegions.length;

      for (const region of candidateRegions) {
        if (visitedRegions.has(region.id)) {
          continue;
        }

        const visitData = visitMap.get(region.id);
        if (!visitData) {
          continue;
        }

        if (pointInPolygon(point, region.geometry)) {
          visitedRegions.add(region.id);
          visitData.visitCount++;

          const trackSet = trackIdSets.get(region.id);
          if (!trackSet?.has(track.id)) {
            trackSet?.add(track.id);
            visitData.trackIds.push(track.id);
          }
        }
      }
    }

    // Progress reporting
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
  const avgCandidates =
    totalPointsChecked > 0 ? (totalCandidatesChecked / totalPointsChecked).toFixed(1) : 0;

  onProgress?.(
    100,
    `complete: ${visitedCount} regions in ${duration}ms (avg ${avgCandidates} candidates/point)`
  );

  return visitMap;
}

/**
 * async version that doesn't block ui thread
 */
export function analyzeRegionVisitsAsync(
  tracks: GPXTrack[],
  regions: Regions[],
  onProgress?: (progress: number, message: string) => void
): Promise<Map<string, RegionVisitData>> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(analyzeRegionVisits(tracks, regions, onProgress));
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}
