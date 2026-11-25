'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONFeature, Map as MapLibreMap, MapSourceDataEvent } from 'maplibre-gl';
import { MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import { getRegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { getRegionFeatureId } from '@/components/ActivityMap/hooks/region/utils/regionStyleHelpers';
import { createComponentLogger } from '@/lib/logger/client';
import { selectRegionRenderProfile } from '@/lib/services/maps/selectRenderProfile';
import { GPXPoint, GPXTrack } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { pointInPolygon } from '@/lib/utils/regionVisitAnalyzer/geometry/pointInPolygon';

const logger = createComponentLogger('useVectorTileRegionAnalysis');

const EMPTY_VISIT_DATA = new Map<string, RegionVisitData>();
const CELL_SIZE_DEG = 0.1;
const MIN_SAMPLE_DIST_DEG_SQ = 0.0004 * 0.0004; // ~45m decimation for fast boundary checks
const ANALYSIS_DEBOUNCE_MS = 180;

export interface IndexedTrackPoint {
  lat: number;
  lon: number;
  trackId: string;
}

export interface TrackPointSpatialGrid {
  cells: Map<string, IndexedTrackPoint[]>;
  totalSampledPoints: number;
}

interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

function getCellKey(cellX: number, cellY: number): string {
  return `${cellX}:${cellY}`;
}

/**
 * Builds a lightweight spatial grid of decimated track points for fast MVT polygon intersection.
 */
export function buildTrackPointSpatialGrid(tracks: Map<string, GPXTrack>): TrackPointSpatialGrid {
  const cells = new Map<string, IndexedTrackPoint[]>();
  let totalSampledPoints = 0;

  tracks.forEach((track, mapKey) => {
    const trackId = track.id || mapKey;
    const points = track.points;
    if (!points || points.length === 0) {
      return;
    }

    let prevLat = NaN;
    let prevLon = NaN;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
        continue;
      }

      const isLast = i === points.length - 1;
      if (!Number.isNaN(prevLat) && !isLast) {
        const dLat = p.lat - prevLat;
        const dLon = p.lon - prevLon;
        if (dLat * dLat + dLon * dLon < MIN_SAMPLE_DIST_DEG_SQ) {
          continue;
        }
      }

      prevLat = p.lat;
      prevLon = p.lon;
      totalSampledPoints++;

      const cellX = Math.floor(p.lon / CELL_SIZE_DEG);
      const cellY = Math.floor(p.lat / CELL_SIZE_DEG);
      const key = getCellKey(cellX, cellY);
      let bucket = cells.get(key);
      if (!bucket) {
        bucket = [];
        cells.set(key, bucket);
      }
      bucket.push({ lat: p.lat, lon: p.lon, trackId });
    }
  });

  return { cells, totalSampledPoints };
}

function computeGeometryBBox(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): BBox | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  const updateFromRing = (ring: GeoJSON.Position[]) => {
    for (let i = 0; i < ring.length; i++) {
      const coord = ring[i];
      const lon = coord[0];
      const lat = coord[1];
      if (lon < minLon) {
        minLon = lon;
      }
      if (lat < minLat) {
        minLat = lat;
      }
      if (lon > maxLon) {
        maxLon = lon;
      }
      if (lat > maxLat) {
        maxLat = lat;
      }
    }
  };

  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      updateFromRing(ring);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) {
        updateFromRing(ring);
      }
    }
  } else {
    return null;
  }

  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) {
    return null;
  }

  return { minLon, minLat, maxLon, maxLat };
}

function getFragmentSignature(regionId: string, bbox: BBox): string {
  return `${regionId}:${bbox.minLon.toFixed(4)},${bbox.minLat.toFixed(4)},${bbox.maxLon.toFixed(4)},${bbox.maxLat.toFixed(4)}`;
}

/**
 * Analyzes loaded MVT region features from MapLibre against the user's GPX tracks.
 * Accumulates visited regions across pan/zoom interactions and feeds `useRegionRendering`.
 */
export function useVectorTileRegionAnalysis(
  map: MapLibreMap | null,
  tracks: Map<string, GPXTrack>,
  showRegions: boolean = true
): Map<string, RegionVisitData> {
  const [visitData, setVisitData] = useState<Map<string, RegionVisitData>>(EMPTY_VISIT_DATA);
  const config = useMemo(() => getRegionTileProfileConfig(selectRegionRenderProfile()), []);

  const trackGrid = useMemo(() => {
    if (tracks.size === 0) {
      return null;
    }
    return buildTrackPointSpatialGrid(tracks);
  }, [tracks]);

  const analyzedFragmentsRef = useRef<Set<string>>(new Set());
  const visitedTracksByRegionRef = useRef<Map<string, Set<string>>>(new Map());
  const regionNamesRef = useRef<Map<string, string>>(new Map());
  const regionGeometriesRef = useRef<Map<string, GeoJSON.Polygon | GeoJSON.MultiPolygon>>(
    new Map()
  );
  const accumulatedVisitsRef = useRef<Map<string, RegionVisitData>>(EMPTY_VISIT_DATA);

  // Reset accumulated cache whenever the track collection changes
  useEffect(() => {
    analyzedFragmentsRef.current = new Set();
    visitedTracksByRegionRef.current = new Map();
    regionNamesRef.current = new Map();
    regionGeometriesRef.current = new Map();
    accumulatedVisitsRef.current = EMPTY_VISIT_DATA;
    setVisitData((current) => (current.size === 0 ? current : EMPTY_VISIT_DATA));
  }, [trackGrid]);

  useEffect(() => {
    if (
      !map ||
      !showRegions ||
      !trackGrid ||
      trackGrid.totalSampledPoints === 0 ||
      typeof map.querySourceFeatures !== 'function'
    ) {
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const runIncrementalAnalysis = () => {
      if (!map.getSource?.(MAP_SOURCE_IDS.REGIONS)) {
        return;
      }

      let features: GeoJSONFeature[] = [];
      try {
        features = map.querySourceFeatures(MAP_SOURCE_IDS.REGIONS, {
          sourceLayer: config.layerName,
        });
      } catch {
        return;
      }

      if (!features || features.length === 0) {
        return;
      }

      let didChange = false;
      const checkPoint: GPXPoint = { lat: 0, lon: 0 };

      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const geometry = feature.geometry;
        if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
          continue;
        }

        const regionId = getRegionFeatureId({
          id: feature.id,
          properties: (feature.properties as Record<string, unknown>) ?? undefined,
        });
        if (!regionId) {
          continue;
        }

        const bbox = computeGeometryBBox(geometry);
        if (!bbox) {
          continue;
        }

        const signature = getFragmentSignature(regionId, bbox);
        if (analyzedFragmentsRef.current.has(signature)) {
          continue;
        }
        analyzedFragmentsRef.current.add(signature);

        const rawName = feature.properties?.name;
        if (
          typeof rawName === 'string' &&
          rawName.length > 0 &&
          !regionNamesRef.current.has(regionId)
        ) {
          regionNamesRef.current.set(regionId, rawName);
        }

        const minCellX = Math.floor(bbox.minLon / CELL_SIZE_DEG);
        const maxCellX = Math.floor(bbox.maxLon / CELL_SIZE_DEG);
        const minCellY = Math.floor(bbox.minLat / CELL_SIZE_DEG);
        const maxCellY = Math.floor(bbox.maxLat / CELL_SIZE_DEG);

        let regionTrackSet = visitedTracksByRegionRef.current.get(regionId);

        for (let cx = minCellX; cx <= maxCellX; cx++) {
          for (let cy = minCellY; cy <= maxCellY; cy++) {
            const cellPoints = trackGrid.cells.get(getCellKey(cx, cy));
            if (!cellPoints) {
              continue;
            }

            for (let pIdx = 0; pIdx < cellPoints.length; pIdx++) {
              const pt = cellPoints[pIdx];
              if (
                pt.lon < bbox.minLon ||
                pt.lon > bbox.maxLon ||
                pt.lat < bbox.minLat ||
                pt.lat > bbox.maxLat
              ) {
                continue;
              }

              if (regionTrackSet && regionTrackSet.has(pt.trackId)) {
                continue;
              }

              checkPoint.lat = pt.lat;
              checkPoint.lon = pt.lon;
              if (pointInPolygon(checkPoint, geometry)) {
                if (!regionTrackSet) {
                  regionTrackSet = new Set<string>();
                  visitedTracksByRegionRef.current.set(regionId, regionTrackSet);
                }
                if (!regionGeometriesRef.current.has(regionId)) {
                  regionGeometriesRef.current.set(regionId, geometry);
                }
                regionTrackSet.add(pt.trackId);
                didChange = true;
              }
            }
          }
        }
      }

      if (didChange) {
        const nextMap = new Map<string, RegionVisitData>(accumulatedVisitsRef.current);
        visitedTracksByRegionRef.current.forEach((trackSet, regionId) => {
          if (trackSet.size === 0) {
            return;
          }
          const regionGeometry = regionGeometriesRef.current.get(regionId) ?? {
            type: 'Polygon',
            coordinates: [],
          };
          nextMap.set(regionId, {
            regionId,
            regionName: regionNamesRef.current.get(regionId) ?? regionId,
            visited: true,
            visitCount: trackSet.size,
            trackIds: Array.from(trackSet),
            geometry: regionGeometry,
          });
        });

        accumulatedVisitsRef.current = nextMap;
        logger.debug(`Updated visited regions from MVT tiles: ${nextMap.size} visited regions`);
        setVisitData(nextMap);
      }
    };

    const scheduleAnalysis = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(runIncrementalAnalysis, ANALYSIS_DEBOUNCE_MS);
    };

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId === MAP_SOURCE_IDS.REGIONS) {
        scheduleAnalysis();
      }
    };

    runIncrementalAnalysis();
    map.on('sourcedata', handleSourceData);
    map.on('idle', scheduleAnalysis);
    map.on('moveend', scheduleAnalysis);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      map.off('sourcedata', handleSourceData);
      map.off('idle', scheduleAnalysis);
      map.off('moveend', scheduleAnalysis);
    };
  }, [map, showRegions, trackGrid, config.layerName]);

  return visitData;
}
