import { GPXTrack } from '@/lib/types';

/**
 * Each packed segment consists of 12 float32 values (48 bytes):
 * - [0..3]  a_segmentHi: [x0Hi, y0Hi, x1Hi, y1Hi] (Double-Single hi Mercator coords)
 * - [4..7]  a_segmentLo: [x0Lo, y0Lo, x1Lo, y1Lo] (Double-Single lo Mercator coords)
 * - [8..11] a_joinNormals: [startJoinNx, startJoinNy, endJoinNx, endJoinNy]
 *           Unit Mercator bisector normals pointing in the forward track direction at each join.
 *           (0, 0) indicates an open cap (track start/end or U-turn tip).
 */
export const FLOATS_PER_PACKED_SEGMENT = 12;

export interface PackedHeatmapGeometry {
  /** High-detail segments (~10m step) for close/city zoom (z >= 10.5) */
  fullSegments: Float32Array;
  fullSegmentCount: number;
  /** Regional-detail segments (~150m step) for regional zoom (7.5 <= z < 10.5) */
  mediumZoomSegments: Float32Array;
  mediumZoomSegmentCount: number;
  /** Country/continent-detail segments (~900m step) for low zoom (z < 7.5) */
  lowZoomSegments: Float32Array;
  lowZoomSegmentCount: number;
}

const MAX_MERCATOR_LAT = 85.05112877980659;

// Squared Mercator distance thresholds for LOD decimation (1 Mercator unit ≈ 40,075 km at equator)
const HIGH_DETAIL_MIN_MERCATOR_DIST_SQ = 6e-14; // ~10m
const MEDIUM_ZOOM_MIN_MERCATOR_DIST_SQ = 1.4e-11; // ~150m
const LOW_ZOOM_MIN_MERCATOR_DIST_SQ = 5e-10; // ~900m

/** Dot product below which two consecutive segments form a near-180° U-turn reversal. */
const UTURN_DOT_THRESHOLD = -0.92;

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

/**
 * Computes the Mercator half-plane clipping normals at the shared vertex between
 * incoming unit direction `dPrev` and outgoing unit direction `dNext`.
 *
 * - For normal bends (`dot >= -0.92`): both segments share the exact same angle-bisector
 *   normal `normalize(dPrev + dNext)`, partitioning the plane with zero overlap and zero gap.
 * - For true 180° U-turn reversals (`dot < -0.92`): the incoming segment keeps its round cap
 *   (`end = [0, 0]`) while the outgoing segment clips its start cap (`start = dNext`), so the
 *   U-turn tip is 1.0 and the overlapping return leg properly sums to 2.0.
 */
export function computeJoinNormals(
  prevDx: number,
  prevDy: number,
  nextDx: number,
  nextDy: number
): { endNx: number; endNy: number; startNx: number; startNy: number } {
  const dot = prevDx * nextDx + prevDy * nextDy;

  if (dot < UTURN_DOT_THRESHOLD) {
    return {
      endNx: 0,
      endNy: 0,
      startNx: nextDx,
      startNy: nextDy,
    };
  }

  const bx = prevDx + nextDx;
  const by = prevDy + nextDy;
  const bLen = Math.hypot(bx, by);
  if (bLen < 1e-8) {
    return {
      endNx: 0,
      endNy: 0,
      startNx: nextDx,
      startNy: nextDy,
    };
  }

  const nx = bx / bLen;
  const ny = by / bLen;
  return {
    endNx: nx,
    endNy: ny,
    startNx: nx,
    startNy: ny,
  };
}

function pushPackedSegment(
  values: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  startNx: number,
  startNy: number,
  endNx: number,
  endNy: number
): void {
  const [x0Hi, x0Lo] = splitFloat64(x0);
  const [y0Hi, y0Lo] = splitFloat64(y0);
  const [x1Hi, x1Lo] = splitFloat64(x1);
  const [y1Hi, y1Lo] = splitFloat64(y1);
  values.push(x0Hi, y0Hi, x1Hi, y1Hi, x0Lo, y0Lo, x1Lo, y1Lo, startNx, startNy, endNx, endNy);
}

function packTrackSegments(tracks: Map<string, GPXTrack>, minDistSq: number): Float32Array {
  const values: number[] = [];

  tracks.forEach((track) => {
    const points = track.points;
    if (!points || points.length === 0) {
      return;
    }

    // 1. Collect decimated Mercator vertices for this track
    const vx: number[] = [];
    const vy: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
        continue;
      }

      const [x, y] = lngLatToMercator(p.lon, p.lat);
      const count = vx.length;

      if (count === 0) {
        vx.push(x);
        vy.push(y);
        continue;
      }

      const dx = x - vx[count - 1];
      const dy = y - vy[count - 1];
      const distSq = dx * dx + dy * dy;

      if (distSq === 0) {
        continue;
      }

      if (minDistSq > 0 && distSq < minDistSq && i < points.length - 1) {
        continue;
      }

      vx.push(x);
      vy.push(y);
    }

    const vertCount = vx.length;
    if (vertCount === 0) {
      return;
    }

    // Preserve single-point or zero-length tracks as a visible round dot (#165)
    if (vertCount === 1) {
      pushPackedSegment(values, vx[0], vy[0], vx[0], vy[0], 0, 0, 0, 0);
      return;
    }

    const segCount = vertCount - 1;
    const dirX = new Float64Array(segCount);
    const dirY = new Float64Array(segCount);

    for (let s = 0; s < segCount; s++) {
      const dx = vx[s + 1] - vx[s];
      const dy = vy[s + 1] - vy[s];
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dirX[s] = dx / len;
        dirY[s] = dy / len;
      }
    }

    // 2. Compute exact join bisector normals shared by adjacent segments
    const startNxArr = new Float64Array(segCount);
    const startNyArr = new Float64Array(segCount);
    const endNxArr = new Float64Array(segCount);
    const endNyArr = new Float64Array(segCount);

    for (let s = 0; s < segCount - 1; s++) {
      const join = computeJoinNormals(dirX[s], dirY[s], dirX[s + 1], dirY[s + 1]);
      endNxArr[s] = join.endNx;
      endNyArr[s] = join.endNy;
      startNxArr[s + 1] = join.startNx;
      startNyArr[s + 1] = join.startNy;
    }

    // 3. Emit packed segments
    for (let s = 0; s < segCount; s++) {
      pushPackedSegment(
        values,
        vx[s],
        vy[s],
        vx[s + 1],
        vy[s + 1],
        startNxArr[s],
        startNyArr[s],
        endNxArr[s],
        endNyArr[s]
      );
    }
  });

  return new Float32Array(values);
}

/**
 * Packs GPX tracks into flat GPU-ready Double-Single Mercator segment buffers with
 * exact join-bisector normals across 3 LOD tiers.
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
