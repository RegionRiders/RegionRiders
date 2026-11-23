import { GPXTrack } from '@/lib/types';

/**
 * Each packed segment consists of 8 float32 values (32 bytes):
 * [x0Hi, y0Hi, x1Hi, y1Hi, x0Lo, y0Lo, x1Lo, y1Lo]
 * encoding 64-bit Mercator coordinates in double-single (hi + lo) precision
 * for jitter-free Relative-To-Center (RTC) rendering at high zoom levels.
 */
export const FLOATS_PER_PACKED_SEGMENT = 8;

export interface PackedHeatmapGeometry {
  /** High-detail segments (~10m step) for close/city zoom (z >= 10.5) */
  fullSegments: Float32Array;
  fullSegmentCount: number;
  /** Regional-detail segments (~120m step) for regional zoom (7.5 <= z < 10.5) */
  mediumZoomSegments: Float32Array;
  mediumZoomSegmentCount: number;
  /** Country/continent-detail segments (~600m step) for low zoom (z < 7.5) */
  lowZoomSegments: Float32Array;
  lowZoomSegmentCount: number;
}

const MAX_MERCATOR_LAT = 85.05112877980659;

// Squared Mercator distance thresholds for LOD decimation (1 Mercator unit ≈ 40,075 km at equator)
const HIGH_DETAIL_MIN_MERCATOR_DIST_SQ = 6e-14; // ~10m
const MEDIUM_ZOOM_MIN_MERCATOR_DIST_SQ = 9e-12; // ~120m
const LOW_ZOOM_MIN_MERCATOR_DIST_SQ = 2.2e-10; // ~600m

/**
 * Splits a 64-bit IEEE 754 float into two 32-bit floats [hi, lo] such that hi + lo ≈ value
 * with ~48 bits of mantissa precision (~0.14mm precision on Earth).
 */
export function splitFloat64(value: number): [number, number] {
  const hi = Math.fround(value);
  const lo = Math.fround(value - hi);
  return [hi, lo];
}

/**
 * Converts WGS84 latitude/longitude to MapLibre normalized Web Mercator [0..1] coordinates.
 */
export function lngLatToMercator(lon: number, lat: number): [number, number] {
  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const x = (lon + 180) / 360;
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return [x, y];
}

function pushDoubleSingleSegment(
  values: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void {
  const [x0Hi, x0Lo] = splitFloat64(x0);
  const [y0Hi, y0Lo] = splitFloat64(y0);
  const [x1Hi, x1Lo] = splitFloat64(x1);
  const [y1Hi, y1Lo] = splitFloat64(y1);
  values.push(x0Hi, y0Hi, x1Hi, y1Hi, x0Lo, y0Lo, x1Lo, y1Lo);
}

function packTrackSegments(tracks: Map<string, GPXTrack>, minDistSq: number): Float32Array {
  const values: number[] = [];

  tracks.forEach((track) => {
    const points = track.points;
    if (!points || points.length === 0) {
      return;
    }

    let prevX = NaN;
    let prevY = NaN;
    let emittedForTrack = false;
    let lastValidX = NaN;
    let lastValidY = NaN;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
        continue;
      }

      const [x, y] = lngLatToMercator(p.lon, p.lat);
      lastValidX = x;
      lastValidY = y;

      if (Number.isNaN(prevX)) {
        prevX = x;
        prevY = y;
        continue;
      }

      const dx = x - prevX;
      const dy = y - prevY;
      const distSq = dx * dx + dy * dy;

      if (minDistSq > 0 && distSq < minDistSq && i < points.length - 1) {
        continue;
      }

      pushDoubleSingleSegment(values, prevX, prevY, x, y);
      emittedForTrack = true;
      prevX = x;
      prevY = y;
    }

    // Preserve single-point or zero-length tracks as a visible capsule dot (#165)
    if (!emittedForTrack && !Number.isNaN(lastValidX) && !Number.isNaN(lastValidY)) {
      pushDoubleSingleSegment(values, lastValidX, lastValidY, lastValidX, lastValidY);
    }
  });

  return new Float32Array(values);
}

/**
 * Packs GPX tracks into flat GPU-ready Double-Single Mercator segment buffers across 3 LOD tiers.
 */
export function packTracksForHeatmap(tracks: Map<string, GPXTrack>): PackedHeatmapGeometry {
  const fullSegments = packTrackSegments(tracks, HIGH_DETAIL_MIN_MERCATOR_DIST_SQ);
  const mediumZoomSegments = packTrackSegments(tracks, MEDIUM_ZOOM_MIN_MERCATOR_DIST_SQ);
  const lowZoomSegments = packTrackSegments(tracks, LOW_ZOOM_MIN_MERCATOR_DIST_SQ);

  return {
    fullSegments,
    fullSegmentCount: fullSegments.length / FLOATS_PER_PACKED_SEGMENT,
    mediumZoomSegments,
    mediumZoomSegmentCount: mediumZoomSegments.length / FLOATS_PER_PACKED_SEGMENT,
    lowZoomSegments,
    lowZoomSegmentCount: lowZoomSegments.length / FLOATS_PER_PACKED_SEGMENT,
  };
}
